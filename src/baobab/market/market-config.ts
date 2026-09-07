/**
 * Data-driven ZuriBeans launch Market configuration. No Baobab Market
 * instance exists yet in the Control Plane for these keys — see
 * nabhold/shared contracts/legal-entity/registry.yaml, where the ZURIBEANS
 * entity's `markets` list is still empty pending Control Plane approval.
 *
 * These `marketKey` values are candidate `canonical_key`s (see
 * contracts/control-plane/v1/market.schema.json). They let Trade provision
 * its own Medusa-side commerce projection (Region, Sales Channel, Stock
 * Location) ahead of that approval, without inventing a `market_id`: once
 * Control Plane registers and activates the real Market, the resulting
 * `market_id` must be reconciled against the `baobab_market_key` tag this
 * bootstrap leaves on each Medusa record (see src/baobab/market/mapping.ts).
 *
 * No external production provider has been approved for either Market.
 * Payment, tax, and shipping therefore bind Medusa's built-in providers
 * explicitly. Do not invent provider credentials, tax rates, or shipping
 * prices here.
 */
export type ProviderMode = "NATIVE" | "EXTERNAL" | "DISABLED"

export type MarketBootstrapConfig = {
  /** Candidate canonical_key once registered with Control Plane. */
  marketKey: string
  displayName: string
  /** ISO 3166-1 alpha-2, uppercase per market.schema.json `default_country`. */
  countryCode: string
  /** ISO 4217, uppercase per market.schema.json `default_currency`. */
  defaultCurrency: string
  allowedCurrencies: readonly string[]
  salesChannel: { key: string; name: string }
  stockLocation: {
    key: string
    name: string
    addressLine: string
    city: string
  }
  payment: { mode: ProviderMode; providerIds: readonly string[] }
  shipping: {
    mode: ProviderMode
    providerIds: readonly string[]
    fulfillmentSet: { key: string; name: string; type: "shipping" }
    serviceZone: { key: string; name: string; countryCode: string }
  }
  tax: {
    mode: ProviderMode
    providerId: string
    automaticTaxes: boolean
    policyReference: string
  }
}

export const toMedusaCurrencyCode = (isoCurrencyCode: string): string =>
  isoCurrencyCode.toLowerCase()

export type StoreSupportedCurrency = { currency_code: string; is_default: boolean }

/**
 * Computes the supported-currency list to write back to a Store after adding
 * one new currency. A Medusa Store must always have exactly one default
 * currency (`StoreModuleService.validateCreateRequest`), so the first
 * currency ever added to a store with none yet has to become the default;
 * once a default exists, a newly added currency must never displace it.
 */
export const withAddedStoreCurrency = (
  existingCurrencies: readonly StoreSupportedCurrency[],
  newCurrencyCode: string,
): StoreSupportedCurrency[] => {
  const hasDefault = existingCurrencies.some((currency) => currency.is_default)
  return [
    ...existingCurrencies.map((currency) => ({
      currency_code: currency.currency_code,
      is_default: currency.is_default,
    })),
    { currency_code: newCurrencyCode, is_default: !hasDefault },
  ]
}

export const ZURIBEANS_UGANDA: MarketBootstrapConfig = {
  marketKey: "zuribeans_ug",
  displayName: "ZuriBeans Uganda",
  countryCode: "UG",
  defaultCurrency: "UGX",
  allowedCurrencies: ["UGX"],
  salesChannel: { key: "zuribeans_b2b", name: "ZuriBeans B2B" },
  stockLocation: {
    key: "zuribeans_ug_primary",
    name: "ZuriBeans Uganda Distribution (development placeholder)",
    addressLine: "Development placeholder address — not a real warehouse",
    city: "Kampala",
  },
  payment: { mode: "NATIVE", providerIds: ["pp_system_default"] },
  shipping: {
    mode: "NATIVE",
    providerIds: ["manual_manual"],
    fulfillmentSet: {
      key: "zuribeans_ug_shipping",
      name: "ZuriBeans Uganda Shipping",
      type: "shipping",
    },
    serviceZone: {
      key: "zuribeans_ug_domestic",
      name: "Uganda Domestic",
      countryCode: "UG",
    },
  },
  tax: {
    mode: "NATIVE",
    providerId: "tp_system",
    automaticTaxes: true,
    policyReference: "control-plane:zuribeans_ug:tax",
  },
}

export const ZURIBEANS_SOUTH_AFRICA: MarketBootstrapConfig = {
  marketKey: "zuribeans_za",
  displayName: "ZuriBeans South Africa",
  countryCode: "ZA",
  defaultCurrency: "ZAR",
  allowedCurrencies: ["ZAR"],
  salesChannel: { key: "zuribeans_b2b", name: "ZuriBeans B2B" },
  stockLocation: {
    key: "zuribeans_za_primary",
    name: "ZuriBeans South Africa Distribution (development placeholder)",
    addressLine: "Development placeholder address — not a real warehouse",
    city: "Johannesburg",
  },
  payment: { mode: "NATIVE", providerIds: ["pp_system_default"] },
  shipping: {
    mode: "NATIVE",
    providerIds: ["manual_manual"],
    fulfillmentSet: {
      key: "zuribeans_za_shipping",
      name: "ZuriBeans South Africa Shipping",
      type: "shipping",
    },
    serviceZone: {
      key: "zuribeans_za_domestic",
      name: "South Africa Domestic",
      countryCode: "ZA",
    },
  },
  tax: {
    mode: "NATIVE",
    providerId: "tp_system",
    automaticTaxes: true,
    policyReference: "control-plane:zuribeans_za:tax",
  },
}

export const ZURIBEANS_LAUNCH_MARKETS: readonly MarketBootstrapConfig[] = [
  ZURIBEANS_UGANDA,
  ZURIBEANS_SOUTH_AFRICA,
]

export const getMarketBootstrapConfig = (marketKey: string): MarketBootstrapConfig => {
  const config = ZURIBEANS_LAUNCH_MARKETS.find((market) => market.marketKey === marketKey)
  if (!config) {
    const known = ZURIBEANS_LAUNCH_MARKETS.map((market) => market.marketKey).join(", ")
    throw new Error(`Unknown market bootstrap key "${marketKey}". Known keys: ${known}`)
  }
  return config
}
