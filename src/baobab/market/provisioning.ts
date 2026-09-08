import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/core-flows"
import type {
  ExecArgs,
  IFulfillmentModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
  IStockLocationService,
  IStoreModuleService,
  ITaxModuleService,
} from "@medusajs/framework/types"
import {
  toMedusaCurrencyCode,
  withAddedStoreCurrency,
  type MarketBootstrapConfig,
} from "./market-config"
import {
  findByMarketKey,
  findByMetadataKey,
  regionMappingTag,
  salesChannelProjectionTag,
  stockLocationMappingTag,
} from "./mapping"
import { createStructuredLogger } from "../logging/logger"

const logger = createStructuredLogger("bootstrap-market")

/**
 * Idempotently provisions the Medusa-side commerce projection for one Baobab
 * launch Market (Region, Sales Channel, Stock Location, and Store currency
 * support). Safe to re-run: existing records are detected by the
 * `baobab_market_key` metadata tag and left untouched.
 *
 * Shared across Digital Estates (ZuriBeans B2B, Thamani B2C, and any future
 * estate) because the provisioning mechanics are estate-agnostic — only the
 * `MarketBootstrapConfig` values differ. This does NOT register anything with
 * the Control Plane Market registry; it binds Medusa's built-in payment,
 * fulfilment, and tax providers explicitly. External provider packages and
 * credentials remain a later, separately approved concern.
 */
export async function bootstrapMarket(
  container: ExecArgs["container"],
  config: MarketBootstrapConfig,
): Promise<void> {
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const salesChannelService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
  const stockLocationService = container.resolve<IStockLocationService>(Modules.STOCK_LOCATION)
  const storeService = container.resolve<IStoreModuleService>(Modules.STORE)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)
  const taxService = container.resolve<ITaxModuleService>(Modules.TAX)
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK) as {
    create(links: Record<string, Record<string, string>>[]): Promise<unknown>
  }

  const log = (message: string, meta: Record<string, unknown> = {}) =>
    logger.info(message, { marketKey: config.marketKey, ...meta })

  // Store currency support.
  const [store] = await storeService.listStores({}, { relations: ["supported_currencies"] })
  if (store) {
    const currencyCode = toMedusaCurrencyCode(config.defaultCurrency)
    const alreadySupported = (store.supported_currencies ?? []).some(
      (currency) => currency.currency_code === currencyCode,
    )
    if (!alreadySupported) {
      await storeService.updateStores(store.id, {
        supported_currencies: withAddedStoreCurrency(
          store.supported_currencies ?? [],
          currencyCode,
        ),
      })
      log("added market currency to store", { currencyCode })
    }
  } else {
    log("no store found; skipping store currency binding", { level: "warn" })
  }

  // Region.
  const existingRegions = await regionService.listRegions({})
  let region = findByMarketKey(existingRegions, config.marketKey)
  if (!region) {
    region = await regionService.createRegions({
      name: config.displayName,
      currency_code: toMedusaCurrencyCode(config.defaultCurrency),
      countries: [config.countryCode.toLowerCase()],
      automatic_taxes: config.tax.automaticTaxes,
      payment_providers: [...config.payment.providerIds],
      metadata: regionMappingTag(config.marketKey),
    })
    log("created region", { regionId: region.id })
  } else {
    log("region already provisioned", { regionId: region.id })
  }

  // Sales channel.
  const existingSalesChannels = await salesChannelService.listSalesChannels({})
  let salesChannel = findByMetadataKey(
    existingSalesChannels,
    "baobab_sales_channel_key",
    config.salesChannel.key,
  )
  if (!salesChannel) {
    salesChannel = await salesChannelService.createSalesChannels({
      name: config.salesChannel.name,
    })
    salesChannel = await salesChannelService.updateSalesChannels(salesChannel.id, {
      metadata: salesChannelProjectionTag(config.salesChannel.key),
    })
    log("created sales channel", { salesChannelId: salesChannel.id })
  } else {
    log("sales channel already provisioned", { salesChannelId: salesChannel.id })
  }

  // Stock location.
  const existingStockLocations = await stockLocationService.listStockLocations({})
  let stockLocation = findByMarketKey(existingStockLocations, config.marketKey)
  let stockLocationCreated = false
  if (!stockLocation) {
    stockLocation = await stockLocationService.createStockLocations({
      name: config.stockLocation.name,
      address: {
        address_1: config.stockLocation.addressLine,
        country_code: config.countryCode.toLowerCase(),
        city: config.stockLocation.city,
      },
      metadata: stockLocationMappingTag(config.marketKey),
    })
    stockLocationCreated = true
    log("created stock location", { stockLocationId: stockLocation.id })
  } else {
    log("stock location already provisioned", { stockLocationId: stockLocation.id })
  }

  // Tax Region. Rates are deliberately not seeded: Control Plane tax policy
  // and later jurisdiction gates remain authoritative for rates and tariffs.
  const [taxRegion] = await taxService.listTaxRegions({
    country_code: config.countryCode.toLowerCase(),
  })
  if (!taxRegion) {
    const created = await taxService.createTaxRegions({
      country_code: config.countryCode.toLowerCase(),
      provider_id: config.tax.providerId,
      metadata: {
        baobab_market_key: config.marketKey,
        baobab_tax_policy_reference: config.tax.policyReference,
      },
    })
    log("created tax region without hardcoded rates", { taxRegionId: created.id })
  } else {
    log("tax region already provisioned", { taxRegionId: taxRegion.id })
  }

  // Shipping context: a location-bound fulfillment set and a country service
  // zone. Shipping options/rates are a later provider decision.
  let [fulfillmentSet] = await fulfillmentService.listFulfillmentSets({
    name: config.shipping.fulfillmentSet.name,
  })
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentService.createFulfillmentSets({
      name: config.shipping.fulfillmentSet.name,
      type: config.shipping.fulfillmentSet.type,
      service_zones: [
        {
          name: config.shipping.serviceZone.name,
          geo_zones: [
            {
              type: "country",
              country_code: config.shipping.serviceZone.countryCode.toLowerCase(),
            },
          ],
        },
      ],
    })
    await remoteLink.create([
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      },
    ])
    log("created location shipping context", { fulfillmentSetId: fulfillmentSet.id })
  } else {
    log("shipping context already provisioned", { fulfillmentSetId: fulfillmentSet.id })
  }

  if (stockLocationCreated) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannel.id], remove: [] },
    })
    await remoteLink.create(
      config.shipping.providerIds.map((providerId) => ({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: providerId },
      })),
    )
    log("bound stock location to Sales Channel and fulfillment providers")
  }

  log("market provider bindings configured", {
    payment: config.payment,
    shipping: config.shipping,
    tax: config.tax,
  })
}
