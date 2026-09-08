import { QueryContext } from "@medusajs/framework/utils"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import type ThamaniModuleService from "../../../modules/thamani/service"
import {
  assertCurrencyAllowedForMarket,
  ThamaniProductNotEligibleForMarketError,
  toThamaniPricingDecision,
  type ThamaniPricingDecision,
  type ThamaniPricingDecisionPort,
  type ThamaniPricingDecisionRequest,
} from "./decision-port"

/**
 * The initial `ThamaniPricingDecisionPort` implementation (spec §30): reads
 * Medusa's native Pricing calculation directly. Medusa resolves an
 * effective-dated `sale` Price List entirely in its own query — this
 * adapter does no date arithmetic of its own, it only classifies the result
 * (see `toThamaniPricingDecision`).
 *
 * A future `Cart -> PricingDecisionPort -> Baobab Pricing Engine` swap
 * replaces this class; `ThamaniPricingDecisionPort` callers do not change.
 */
export class MedusaThamaniPricingDecisionPort implements ThamaniPricingDecisionPort {
  constructor(
    private readonly query: RemoteQueryFunction,
    private readonly thamani: ThamaniModuleService,
  ) {}

  async decide(request: ThamaniPricingDecisionRequest): Promise<ThamaniPricingDecision> {
    // Fail closed before touching Pricing at all: Gate 6 gives every
    // variant independent UGX/ZAR prices, including single-Market SKUs, so
    // nothing else stops a caller from combining a Market with a currency
    // — or a product — it does not authorize (spec §36 Market isolation).
    assertCurrencyAllowedForMarket(request.marketKey, request.currencyCode)

    const { data } = await this.query.graph({
      entity: "variants",
      fields: ["id", "product_id", "calculated_price.*"],
      filters: { id: [request.variantId] },
      context: {
        calculated_price: QueryContext({ currency_code: request.currencyCode }),
      },
    })

    const variant = data[0] as
      | {
          product_id?: string | null
          calculated_price?: {
            calculated_amount: number | null
            original_amount: number | null
            currency_code: string | null
            calculated_price?: {
              price_list_id: string | null
              price_list_type: string | null
            } | null
          }
        }
      | undefined

    if (variant?.product_id) {
      const eligibility = await this.thamani.listMarketProductEligibilities({
        product_id: variant.product_id,
        market_key: request.marketKey,
      })
      const isEligible = eligibility.some((record) => record.status === "ACTIVE")
      if (!isEligible) {
        throw new ThamaniProductNotEligibleForMarketError(request.variantId, request.marketKey)
      }
    }

    return toThamaniPricingDecision(
      request,
      variant?.calculated_price ?? {
        calculated_amount: null,
        original_amount: null,
        currency_code: null,
      },
    )
  }
}
