import { describe, expect, it } from "vitest"
import {
  getMarketBootstrapConfig,
  toMedusaCurrencyCode,
  withAddedStoreCurrency,
  ZURIBEANS_LAUNCH_MARKETS,
  ZURIBEANS_SOUTH_AFRICA,
  ZURIBEANS_UGANDA,
} from "../src/baobab/market/market-config"

describe("ZuriBeans launch Market configuration", () => {
  it("keeps Uganda and South Africa on distinct currencies and countries", () => {
    expect(ZURIBEANS_UGANDA.defaultCurrency).toBe("UGX")
    expect(ZURIBEANS_SOUTH_AFRICA.defaultCurrency).toBe("ZAR")
    expect(ZURIBEANS_UGANDA.countryCode).toBe("UG")
    expect(ZURIBEANS_SOUTH_AFRICA.countryCode).toBe("ZA")
    expect(ZURIBEANS_UGANDA.defaultCurrency).not.toBe(ZURIBEANS_SOUTH_AFRICA.defaultCurrency)
  })

  it("does not leak one Market's allowed currencies into the other", () => {
    expect(ZURIBEANS_UGANDA.allowedCurrencies).not.toContain("ZAR")
    expect(ZURIBEANS_SOUTH_AFRICA.allowedCurrencies).not.toContain("UGX")
  })

  it("gives each Market its own Sales Channel and Stock Location keys", () => {
    expect(ZURIBEANS_UGANDA.salesChannel.key).not.toBe(ZURIBEANS_SOUTH_AFRICA.salesChannel.key)
    expect(ZURIBEANS_UGANDA.stockLocation.key).not.toBe(ZURIBEANS_SOUTH_AFRICA.stockLocation.key)
  })

  it("allows independent payment/fulfilment provider bindings per Market", () => {
    // Independently configurable today just means: distinct config objects,
    // not required to differ in value for the initial launch.
    expect(ZURIBEANS_UGANDA.payment).not.toBe(ZURIBEANS_SOUTH_AFRICA.payment)
    expect(ZURIBEANS_UGANDA.fulfilment).not.toBe(ZURIBEANS_SOUTH_AFRICA.fulfilment)
  })

  it("does not hardcode a UUID as a market identity", () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const market of ZURIBEANS_LAUNCH_MARKETS) {
      expect(uuidPattern.test(market.marketKey)).toBe(false)
    }
  })

  it("resolves a known market key and rejects an unknown one", () => {
    expect(getMarketBootstrapConfig("zuribeans_ug")).toBe(ZURIBEANS_UGANDA)
    expect(() => getMarketBootstrapConfig("zuribeans_ke")).toThrow("Unknown market bootstrap key")
  })

  it("normalises ISO currency codes to Medusa's lowercase convention", () => {
    expect(toMedusaCurrencyCode("UGX")).toBe("ugx")
    expect(toMedusaCurrencyCode("ZAR")).toBe("zar")
  })
})

describe("withAddedStoreCurrency", () => {
  // Regression test: a live Medusa 2.20.1 run against a real store with no
  // currencies yet failed with "There should be a default currency set for
  // the store" because the first currency added was hardcoded to
  // is_default: false. A Store must always have exactly one default.
  it("makes the first currency added to an empty store the default", () => {
    expect(withAddedStoreCurrency([], "ugx")).toEqual([{ currency_code: "ugx", is_default: true }])
  })

  it("does not displace an existing default when adding a second currency", () => {
    const existing = [{ currency_code: "ugx", is_default: true }]
    expect(withAddedStoreCurrency(existing, "zar")).toEqual([
      { currency_code: "ugx", is_default: true },
      { currency_code: "zar", is_default: false },
    ])
  })

  it("preserves every existing currency rather than replacing the list", () => {
    const existing = [
      { currency_code: "ugx", is_default: true },
      { currency_code: "usd", is_default: false },
    ]
    const result = withAddedStoreCurrency(existing, "zar")
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.currency_code)).toEqual(["ugx", "usd", "zar"])
  })
})
