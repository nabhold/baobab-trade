import { Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import type { IRegionModuleService } from "@medusajs/types/dist/region/service"
import type { ISalesChannelModuleService } from "@medusajs/types/dist/sales-channel/service"
import type { IStockLocationService } from "@medusajs/types/dist/stock-location/service"
import type { IStoreModuleService } from "@medusajs/types/dist/store/service"
import {
  ZURIBEANS_LAUNCH_MARKETS,
  getMarketBootstrapConfig,
  toMedusaCurrencyCode,
  type MarketBootstrapConfig,
} from "../baobab/market/market-config"
import {
  findByMarketKey,
  regionMappingTag,
  salesChannelMappingTag,
  stockLocationMappingTag,
} from "../baobab/market/mapping"
import { createStructuredLogger } from "../baobab/logging/logger"

const logger = createStructuredLogger("bootstrap-market")

/**
 * Idempotently provisions the Medusa-side commerce projection for one
 * ZuriBeans launch Market (Region, Sales Channel, Stock Location, and Store
 * currency support). Safe to re-run: existing records are detected by the
 * `baobab_market_key` metadata tag and left untouched.
 *
 * This does NOT register anything with the Control Plane Market registry —
 * that record does not exist yet for either Market (see market-config.ts).
 * It also does NOT install or configure a payment/fulfilment/tax *provider
 * package* — it only records which provider mode/ids each Market expects so
 * a follow-up increment can wire the real provider modules into
 * medusa-config.ts once one is approved.
 */
async function bootstrapMarket(container: ExecArgs["container"], config: MarketBootstrapConfig) {
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const salesChannelService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
  const stockLocationService = container.resolve<IStockLocationService>(Modules.STOCK_LOCATION)
  const storeService = container.resolve<IStoreModuleService>(Modules.STORE)

  const log = (message: string, meta: Record<string, unknown> = {}) =>
    logger.info(message, { marketKey: config.marketKey, ...meta })

  // Store currency support.
  const [store] = await storeService.listStores()
  if (store) {
    const currencyCode = toMedusaCurrencyCode(config.defaultCurrency)
    const alreadySupported = (store.supported_currencies ?? []).some(
      (currency) => currency.currency_code === currencyCode,
    )
    if (!alreadySupported) {
      await storeService.updateStores(store.id, {
        supported_currencies: [
          ...(store.supported_currencies ?? []).map((currency) => ({
            currency_code: currency.currency_code,
            is_default: currency.is_default,
          })),
          { currency_code: currencyCode, is_default: false },
        ],
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
      metadata: regionMappingTag(config.marketKey),
    })
    log("created region", { regionId: region.id })
  } else {
    log("region already provisioned", { regionId: region.id })
  }

  // Sales channel.
  const existingSalesChannels = await salesChannelService.listSalesChannels({})
  let salesChannel = findByMarketKey(existingSalesChannels, config.marketKey)
  if (!salesChannel) {
    salesChannel = await salesChannelService.createSalesChannels({
      name: config.salesChannel.name,
    })
    salesChannel = await salesChannelService.updateSalesChannels(salesChannel.id, {
      metadata: salesChannelMappingTag(config.marketKey),
    })
    log("created sales channel", { salesChannelId: salesChannel.id })
  } else {
    log("sales channel already provisioned", { salesChannelId: salesChannel.id })
  }

  // Stock location.
  const existingStockLocations = await stockLocationService.listStockLocations({})
  let stockLocation = findByMarketKey(existingStockLocations, config.marketKey)
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
    log("created stock location", { stockLocationId: stockLocation.id })
  } else {
    log("stock location already provisioned", { stockLocationId: stockLocation.id })
  }

  log("provider modes recorded as placeholders — no provider package wired yet", {
    payment: config.payment,
    fulfilment: config.fulfilment,
    tax: config.tax,
  })
}

export default async function ({ container, args }: ExecArgs) {
  const requestedKey = args[0]
  const targets = requestedKey ? [getMarketBootstrapConfig(requestedKey)] : ZURIBEANS_LAUNCH_MARKETS

  for (const config of targets) {
    await bootstrapMarket(container, config)
  }
}
