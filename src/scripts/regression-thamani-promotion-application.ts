/**
 * DANGER — THIS SCRIPT MUTATES LIVE DATA. It creates two disposable test
 * Carts in the Thamani Uganda Region/Sales Channel, applies real Promotion
 * codes to them via `applyThamaniPromotion`, and asserts the computed
 * discount — then deletes both Carts. Medusa's Promotion module only ever
 * computes a discount against a Cart (unlike `ThamaniPricingDecisionPort`,
 * which needs only a bare variant), so proving Gate 9's two demonstration
 * Promotions actually compute the right amount, and that the exclusive
 * stacking policy actually blocks a second code, requires creating this
 * throwaway commerce state. Following the same lesson Gate 7 review caught
 * (`verify-thamani-search.ts` must stay read-only), this mutation lives in
 * its own script — never inside `verify:thamani-promotions` — and must
 * only run against a disposable database (CI's ephemeral Postgres, or a
 * local scratch database), never a persistent or production environment.
 */
import { createCartWorkflow, createInventoryLevelsWorkflow } from "@medusajs/core-flows"
import type {
  ExecArgs,
  ICartModuleService,
  IInventoryService,
  IProductModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
  IStockLocationService,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  applyThamaniPromotion,
  ThamaniPromotionStackingViolationError,
} from "../baobab/thamani/promotions"
import { findByCountryCode, findByMarketKey, findByMetadataKey } from "../baobab/market/mapping"

async function resolveVariant(
  productService: IProductModuleService,
  productHandle: string,
): Promise<{ id: string; sku: string }> {
  const [product] = await productService.listProducts(
    { handle: productHandle },
    { relations: ["variants"] },
  )
  const variant = product?.variants?.[0]
  if (!variant?.sku) {
    throw new Error(
      `No product/variant found for handle "${productHandle}" — run bootstrap:thamani-catalogue first`,
    )
  }
  return { id: variant.id, sku: variant.sku }
}

/**
 * Thamani has no Gate 10 (Inventory) yet — every catalogue variant is
 * `manage_inventory: true` with no stock level anywhere, so
 * `createCartWorkflow` refuses to add a line item for it ("not associated
 * with any stock location"). This gives just the two demonstration variants
 * a stock level at Thamani Uganda's own location, scoped to this disposable
 * regression only — it is not a Gate 10 implementation.
 */
async function ensureInventoryLevel(
  container: ExecArgs["container"],
  inventoryService: IInventoryService,
  sku: string,
  stockLocationId: string,
): Promise<void> {
  const [inventoryItem] = await inventoryService.listInventoryItems({ sku })
  if (!inventoryItem) throw new Error(`No inventory item for SKU "${sku}"`)

  const [existingLevel] = await inventoryService.listInventoryLevels({
    inventory_item_id: inventoryItem.id,
    location_id: stockLocationId,
  })
  if (existingLevel) return

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: [
        {
          inventory_item_id: inventoryItem.id,
          location_id: stockLocationId,
          stocked_quantity: 100,
        },
      ],
    },
  })
}

async function createTestCart(
  container: ExecArgs["container"],
  regionId: string,
  salesChannelId: string,
  variantId: string,
): Promise<string> {
  const { result: cart } = await createCartWorkflow(container).run({
    input: {
      region_id: regionId,
      sales_channel_id: salesChannelId,
      items: [{ variant_id: variantId, quantity: 1 }],
    },
  })
  return cart.id
}

async function readCartItemDiscount(
  container: ExecArgs["container"],
  cartId: string,
): Promise<{ discount: number; promotionCodes: string[] }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    // `total`/`subtotal` must be requested alongside `item_discount_total`
    // — Medusa's cart-totals decoration only runs when at least one
    // top-level total field is in the selection; requesting the computed
    // discount field alone silently omits it from the result.
    fields: ["id", "total", "subtotal", "item_discount_total", "promotions.code"],
    filters: { id: [cartId] },
  })
  const cart = data[0] as
    | { item_discount_total: number | string; promotions?: readonly { code: string }[] }
    | undefined
  if (!cart) throw new Error(`Cart "${cartId}" not found while reading back its discount`)
  return {
    // `item_discount_total` comes back as a Medusa BigNumberValue (a
    // stringified decimal, not a plain JS number) — normalise before
    // comparing against an expected integer amount.
    discount: Number(cart.item_discount_total),
    promotionCodes: (cart.promotions ?? []).map((promotion) => promotion.code),
  }
}

export default async function regressionThamaniPromotionApplication({
  container,
}: ExecArgs): Promise<void> {
  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const salesChannelService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
  const cartService = container.resolve<ICartModuleService>(Modules.CART)
  const inventoryService = container.resolve<IInventoryService>(Modules.INVENTORY)
  const stockLocationService = container.resolve<IStockLocationService>(Modules.STOCK_LOCATION)

  const regions = await regionService.listRegions({}, { relations: ["countries"] })
  const ugandaRegion = findByCountryCode(regions, "UG")
  if (!ugandaRegion)
    throw new Error("No Region provisioned for Uganda — run bootstrap:market first")

  const salesChannels = await salesChannelService.listSalesChannels({})
  const salesChannel = findByMetadataKey(salesChannels, "baobab_sales_channel_key", "thamani_b2c")
  if (!salesChannel) throw new Error("Run bootstrap:thamani-market before this regression")

  const stockLocations = await stockLocationService.listStockLocations({})
  const ugandaStockLocation = findByMarketKey(stockLocations, "thamani_ug")
  if (!ugandaStockLocation)
    throw new Error("No Thamani Uganda stock location — run bootstrap:thamani-market first")

  const instantCoffee = await resolveVariant(productService, "thamani-instant-coffee-200g")
  const greenTea = await resolveVariant(productService, "thamani-green-tea-100g")
  await ensureInventoryLevel(container, inventoryService, instantCoffee.sku, ugandaStockLocation.id)
  await ensureInventoryLevel(container, inventoryService, greenTea.sku, ugandaStockLocation.id)
  const instantCoffeeVariantId = instantCoffee.id
  const greenTeaVariantId = greenTea.id

  const cartIds: string[] = []
  try {
    // THAMANI10 (10% off, UGX): 10% of the instant coffee's 22,000 UGX
    // standard price is a 2,200 UGX line-item discount.
    const percentageCartId = await createTestCart(
      container,
      ugandaRegion.id,
      salesChannel.id,
      instantCoffeeVariantId,
    )
    cartIds.push(percentageCartId)
    await applyThamaniPromotion(container, percentageCartId, "THAMANI10")
    const afterPercentage = await readCartItemDiscount(container, percentageCartId)
    if (afterPercentage.discount !== 2_200) {
      throw new Error(
        `Expected THAMANI10 to discount 2200 UGX off the instant coffee, got ${afterPercentage.discount}`,
      )
    }
    if (!afterPercentage.promotionCodes.includes("THAMANI10")) {
      throw new Error("Expected THAMANI10 to be applied to the cart")
    }

    // Exclusive stacking (ADR-0012 §34): a second code must be rejected
    // while THAMANI10 is already applied, and must never reach Medusa.
    let stackingRejected = false
    try {
      await applyThamaniPromotion(container, percentageCartId, "THAMANIFIXED2000")
    } catch (error) {
      if (!(error instanceof ThamaniPromotionStackingViolationError)) throw error
      stackingRejected = true
    }
    if (!stackingRejected) {
      throw new Error(
        "Expected a second promotion code to be rejected by the exclusive stacking policy",
      )
    }
    const afterStackingAttempt = await readCartItemDiscount(container, percentageCartId)
    if (afterStackingAttempt.promotionCodes.length !== 1) {
      throw new Error(
        `Expected only THAMANI10 to remain applied after the rejected stacking attempt, found [${afterStackingAttempt.promotionCodes.join(", ")}]`,
      )
    }

    // THAMANIFIXED2000 (flat 2,000 UGX off), proven on its own fresh cart
    // so it is not blocked by the stacking policy above.
    const fixedCartId = await createTestCart(
      container,
      ugandaRegion.id,
      salesChannel.id,
      greenTeaVariantId,
    )
    cartIds.push(fixedCartId)
    await applyThamaniPromotion(container, fixedCartId, "THAMANIFIXED2000")
    const afterFixed = await readCartItemDiscount(container, fixedCartId)
    if (afterFixed.discount !== 2_000) {
      throw new Error(
        `Expected THAMANIFIXED2000 to discount 2000 UGX off the green tea, got ${afterFixed.discount}`,
      )
    }
  } finally {
    if (cartIds.length > 0) await cartService.deleteCarts(cartIds)
  }

  container
    .resolve("logger")
    .info("Verified Thamani B2C promotion discount computation and exclusive stacking policy")
}
