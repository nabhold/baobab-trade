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
 * No production provider has been approved for either Market. `payment` and
 * `fulfilment` intentionally use Medusa's own built-in development providers
 * as an explicit placeholder (ADR-0010 §30-§32; task brief §46-§47) — never
 * invent production credentials here.
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
  fulfilment: { mode: ProviderMode; providerIds: readonly string[] }
  tax: { mode: ProviderMode }
}

export const toMedusaCurrencyCode = (isoCurrencyCode: string): string =>
  isoCurrencyCode.toLowerCase()

export const ZURIBEANS_UGANDA: MarketBootstrapConfig = {
  marketKey: "zuribeans_ug",
  displayName: "ZuriBeans Uganda",
  countryCode: "UG",
  defaultCurrency: "UGX",
  allowedCurrencies: ["UGX"],
  salesChannel: { key: "zuribeans_ug_default", name: "ZuriBeans Uganda" },
  stockLocation: {
    key: "zuribeans_ug_primary",
    name: "ZuriBeans Uganda Distribution (development placeholder)",
    addressLine: "Development placeholder address — not a real warehouse",
    city: "Kampala",
  },
  payment: { mode: "NATIVE", providerIds: ["pp_system_default"] },
  fulfilment: { mode: "NATIVE", providerIds: ["manual_manual"] },
  tax: { mode: "NATIVE" },
}

export const ZURIBEANS_SOUTH_AFRICA: MarketBootstrapConfig = {
  marketKey: "zuribeans_za",
  displayName: "ZuriBeans South Africa",
  countryCode: "ZA",
  defaultCurrency: "ZAR",
  allowedCurrencies: ["ZAR"],
  salesChannel: { key: "zuribeans_za_default", name: "ZuriBeans South Africa" },
  stockLocation: {
    key: "zuribeans_za_primary",
    name: "ZuriBeans South Africa Distribution (development placeholder)",
    addressLine: "Development placeholder address — not a real warehouse",
    city: "Johannesburg",
  },
  payment: { mode: "NATIVE", providerIds: ["pp_system_default"] },
  fulfilment: { mode: "NATIVE", providerIds: ["manual_manual"] },
  tax: { mode: "NATIVE" },
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
