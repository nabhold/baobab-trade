import { describe, expect, it } from "vitest"
import {
  isSaleActive,
  resolveSaleWindow,
  salePriceListKey,
  THAMANI_SALES,
  THAMANI_SALE_WINDOW_KINDS,
} from "../src/baobab/thamani/pricing/sale-config"
import {
  ThamaniPricingUnavailableError,
  toThamaniPricingDecision,
  type ThamaniPricingDecisionRequest,
} from "../src/baobab/thamani/pricing/decision-port"

const FIXED_NOW = new Date("2026-09-08T00:00:00.000Z")

describe("resolveSaleWindow", () => {
  it("keeps an ACTIVE window straddling now", () => {
    const window = resolveSaleWindow("ACTIVE", FIXED_NOW)
    expect(window.startsAt.getTime()).toBeLessThan(FIXED_NOW.getTime())
    expect(window.endsAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime())
  })

  it("keeps an UPCOMING window entirely after now", () => {
    const window = resolveSaleWindow("UPCOMING", FIXED_NOW)
    expect(window.startsAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime())
    expect(window.endsAt.getTime()).toBeGreaterThan(window.startsAt.getTime())
  })

  it("keeps an EXPIRED window entirely before now", () => {
    const window = resolveSaleWindow("EXPIRED", FIXED_NOW)
    expect(window.endsAt.getTime()).toBeLessThan(FIXED_NOW.getTime())
    expect(window.startsAt.getTime()).toBeLessThan(window.endsAt.getTime())
  })

  it("is stable regardless of which moment is passed as now", () => {
    const later = new Date(FIXED_NOW.getTime() + 10 * 24 * 60 * 60 * 1000)
    const activeAtLater = resolveSaleWindow("ACTIVE", later)
    expect(activeAtLater.startsAt.getTime()).toBeLessThan(later.getTime())
    expect(activeAtLater.endsAt.getTime()).toBeGreaterThan(later.getTime())
  })
})

describe("isSaleActive", () => {
  it("is true only for ACTIVE", () => {
    expect(isSaleActive("ACTIVE")).toBe(true)
    expect(isSaleActive("UPCOMING")).toBe(false)
    expect(isSaleActive("EXPIRED")).toBe(false)
  })
})

describe("THAMANI_SALES fixture", () => {
  it("covers every window kind exactly once, in UGX and ZAR", () => {
    const kinds = THAMANI_SALES.map((sale) => sale.windowKind)
    expect(new Set(kinds)).toEqual(new Set(THAMANI_SALE_WINDOW_KINDS))
    for (const sale of THAMANI_SALES) {
      expect(sale.prices.map((p) => p.currencyCode).sort()).toEqual(["ugx", "zar"])
      for (const price of sale.prices) {
        expect(price.saleAmount).toBeGreaterThan(0)
      }
    }
  })

  it("derives a stable, distinct price-list key per window kind", () => {
    const keys = THAMANI_SALE_WINDOW_KINDS.map(salePriceListKey)
    expect(new Set(keys).size).toBe(keys.length)
    expect(salePriceListKey("ACTIVE")).toBe("thamani_sale_active")
  })
})

describe("toThamaniPricingDecision", () => {
  const request: ThamaniPricingDecisionRequest = {
    variantId: "variant_1",
    marketKey: "thamani_ug",
    currencyCode: "ugx",
  }

  it("classifies a sale Price List result as SALE with the standard amount preserved", () => {
    const decision = toThamaniPricingDecision(request, {
      calculated_amount: 15_000,
      original_amount: 18_000,
      currency_code: "ugx",
      calculated_price: { price_list_id: "plist_1", price_list_type: "sale" },
    })
    expect(decision).toEqual({
      variantId: "variant_1",
      marketKey: "thamani_ug",
      currencyCode: "ugx",
      kind: "SALE",
      amount: 15_000,
      standardAmount: 18_000,
      priceListId: "plist_1",
    })
  })

  it("classifies a plain result with no Price List as STANDARD_RETAIL", () => {
    const decision = toThamaniPricingDecision(request, {
      calculated_amount: 18_000,
      original_amount: 18_000,
      currency_code: "ugx",
      calculated_price: null,
    })
    expect(decision.kind).toBe("STANDARD_RETAIL")
    expect(decision.priceListId).toBeNull()
    expect(decision.amount).toBe(18_000)
  })

  it("never reports SALE for a non-sale Price List type (e.g. an override)", () => {
    const decision = toThamaniPricingDecision(request, {
      calculated_amount: 18_000,
      original_amount: 18_000,
      currency_code: "ugx",
      calculated_price: { price_list_id: "plist_2", price_list_type: "override" },
    })
    expect(decision.kind).toBe("STANDARD_RETAIL")
    expect(decision.priceListId).toBeNull()
  })

  it("fails closed when Medusa has no price at all for the requested currency", () => {
    expect(() =>
      toThamaniPricingDecision(request, {
        calculated_amount: null,
        original_amount: null,
        currency_code: null,
      }),
    ).toThrow(ThamaniPricingUnavailableError)
  })
})
