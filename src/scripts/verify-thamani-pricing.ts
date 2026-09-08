import { QueryContext } from "@medusajs/framework/utils"
import type {
  ExecArgs,
  IPricingModuleService,
  IProductModuleService,
} from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  isSaleActive,
  salePriceListKey,
  THAMANI_SALES,
} from "../baobab/thamani/pricing/sale-config"
import { toThamaniPricingDecision } from "../baobab/thamani/pricing/decision-port"
import { findByMetadataKey } from "../baobab/market/mapping"

export default async function verifyThamaniPricing({ container }: ExecArgs): Promise<void> {
  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const pricingService = container.resolve<IPricingModuleService>(Modules.PRICING)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const priceLists = await pricingService.listPriceLists({})
  for (const sale of THAMANI_SALES) {
    const key = salePriceListKey(sale.windowKind)
    const priceList = findByMetadataKey(priceLists, "baobab_price_list_key", key)
    if (!priceList) throw new Error(`Expected sale Price List "${key}" to exist`)

    const now = Date.now()
    const startsAt = priceList.starts_at ? new Date(priceList.starts_at).getTime() : null
    const endsAt = priceList.ends_at ? new Date(priceList.ends_at).getTime() : null
    const windowCoversNow = startsAt !== null && endsAt !== null && startsAt <= now && now <= endsAt
    if (windowCoversNow !== isSaleActive(sale.windowKind)) {
      throw new Error(
        `Price List "${key}" window covering now=${windowCoversNow} does not match expected active=${isSaleActive(sale.windowKind)}`,
      )
    }

    const [product] = await productService.listProducts(
      { handle: sale.productHandle },
      { relations: ["variants"] },
    )
    const variant = product?.variants?.[0]
    if (!variant) throw new Error(`Product "${sale.productHandle}" is missing its variant`)

    for (const price of sale.prices) {
      const { data } = await query.graph({
        entity: "variants",
        fields: ["id", "calculated_price.*"],
        filters: { id: [variant.id] },
        context: { calculated_price: QueryContext({ currency_code: price.currencyCode }) },
      })
      const calculated = data[0]?.calculated_price
      const decision = toThamaniPricingDecision(
        { variantId: variant.id, marketKey: "thamani_ug", currencyCode: price.currencyCode },
        calculated ?? { calculated_amount: null, original_amount: null, currency_code: null },
      )

      if (isSaleActive(sale.windowKind)) {
        if (decision.kind !== "SALE") {
          throw new Error(
            `Expected ${sale.productHandle} to resolve a SALE price in ${price.currencyCode} while its window is active, got ${decision.kind}`,
          )
        }
        if (decision.amount !== price.saleAmount) {
          throw new Error(
            `Expected ${sale.productHandle} sale amount ${price.saleAmount} in ${price.currencyCode}, got ${decision.amount}`,
          )
        }
      } else if (decision.kind !== "STANDARD_RETAIL") {
        throw new Error(
          `Expected ${sale.productHandle} to resolve STANDARD_RETAIL in ${price.currencyCode} while its ${sale.windowKind} sale window does not cover now, got ${decision.kind}`,
        )
      }
    }
  }

  container.resolve("logger").info("Verified Gate 8 Thamani B2C sale pricing and effective dating")
}
