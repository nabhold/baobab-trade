import type { TradeLanePolicy } from "./compliance-port"
export const ZURIBEANS_TRADE_LANES: readonly TradeLanePolicy[] = [
  {
    policyReference: "control-plane:trade-lane:ug-za",
    policyVersion: "gate14-v2",
    originCountry: "UG",
    destinationCountry: "ZA",
    permittedIncoterms: ["FCA", "FOB", "CFR", "CIF", "DAP", "DDP"],
    permittedTradeUoms: ["BAG", "CARTON", "EACH"],
    effectiveFrom: new Date("2026-09-09T00:00:00Z"),
    source: "GATE14_CONFIGURATION_NOT_CUSTOMS_AUTHORITY",
  },
  {
    policyReference: "control-plane:trade-lane:za-ug",
    policyVersion: "gate14-v2",
    originCountry: "ZA",
    destinationCountry: "UG",
    permittedIncoterms: ["FCA", "FOB", "CFR", "CIF", "DAP", "DDP"],
    permittedTradeUoms: ["BAG", "CARTON", "EACH"],
    effectiveFrom: new Date("2026-09-09T00:00:00Z"),
    source: "GATE14_CONFIGURATION_NOT_CUSTOMS_AUTHORITY",
  },
] as const
