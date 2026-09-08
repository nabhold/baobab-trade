/**
 * Gate 8's `PricingDecisionPort` (spec §30): the boundary a Thamani checkout
 * calls instead of reading Medusa Pricing directly, so a future Baobab
 * Pricing Engine can sit behind the same interface without changing
 * callers. The ZuriBeans B2B port (`src/baobab/pricing/decision-port.ts`) is
 * organisation/volume-tier shaped and does not fit Thamani's retail model —
 * this is a separate, B2C-shaped port, the same reuse-vs-fork call already
 * made for `thamani/customer`, `thamani/market-config`, and every other
 * B2C-specific boundary so far.
 *
 * `STANDARD_RETAIL` is the Gate 6 catalogue price; `SALE` is a currently
 * effective-dated Price List price (spec §28: "Sale" pricing kind).
 * `MARKET_SPECIFIC` is not a separate kind here: Gate 6 already gives every
 * product independent UGX/ZAR amounts, so Market-specific pricing is the
 * `currencyCode` selection itself, not an overlay on top of it.
 */
export type ThamaniPricingKind = "STANDARD_RETAIL" | "SALE"

export type ThamaniPricingDecisionRequest = {
  variantId: string
  marketKey: string
  currencyCode: string
}

export type ThamaniPricingDecision = {
  variantId: string
  marketKey: string
  currencyCode: string
  kind: ThamaniPricingKind
  amount: number
  /** The Gate 6 standard price, even when `kind` is `SALE`. `null` if neither resolved. */
  standardAmount: number | null
  /** Set only when `kind` is `SALE`: the Price List backing the discounted amount. */
  priceListId: string | null
}

export interface ThamaniPricingDecisionPort {
  decide(request: ThamaniPricingDecisionRequest): Promise<ThamaniPricingDecision>
}

export class ThamaniPricingUnavailableError extends Error {
  constructor(
    readonly variantId: string,
    readonly currencyCode: string,
  ) {
    super(`No retail price is available for variant ${variantId} in ${currencyCode}`)
    this.name = "ThamaniPricingUnavailableError"
  }
}

/**
 * Pure classification of a Medusa `calculatePrices` result into a
 * `ThamaniPricingDecision`. Kept separate from the Medusa-calling adapter so
 * the classification rule — a Price List of type `sale` wins, its absence
 * means the standard price — is unit-testable without a database.
 */
export type CalculatedPriceLike = {
  calculated_amount: number | null
  original_amount: number | null
  currency_code: string | null
  calculated_price?: { price_list_id: string | null; price_list_type: string | null } | null
}

export function toThamaniPricingDecision(
  request: ThamaniPricingDecisionRequest,
  calculated: CalculatedPriceLike,
): ThamaniPricingDecision {
  if (calculated.calculated_amount === null || calculated.currency_code === null) {
    throw new ThamaniPricingUnavailableError(request.variantId, request.currencyCode)
  }

  const isSale = calculated.calculated_price?.price_list_type === "sale"

  return {
    variantId: request.variantId,
    marketKey: request.marketKey,
    currencyCode: request.currencyCode,
    kind: isSale ? "SALE" : "STANDARD_RETAIL",
    amount: calculated.calculated_amount,
    standardAmount: calculated.original_amount,
    priceListId: isSale ? (calculated.calculated_price?.price_list_id ?? null) : null,
  }
}
