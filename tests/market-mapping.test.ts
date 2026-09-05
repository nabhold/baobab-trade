import { describe, expect, it } from "vitest"
import { findByMarketKey, regionMappingTag } from "../src/baobab/market/mapping"
import { readMarketKeyFromMetadata } from "../src/baobab/contracts/canonical-mapping"

describe("engine-native market mapping breadcrumb", () => {
  it("tags a record with the market key and finds it back", () => {
    const tag = regionMappingTag("zuribeans_ug")
    const records = [
      { id: "reg_1", metadata: { baobab_market_key: "zuribeans_za" } },
      { id: "reg_2", metadata: tag as unknown as Record<string, unknown> },
    ]

    expect(findByMarketKey(records, "zuribeans_ug")?.id).toBe("reg_2")
    expect(findByMarketKey(records, "zuribeans_za")?.id).toBe("reg_1")
    expect(findByMarketKey(records, "zuribeans_ke")).toBeUndefined()
  })

  it("never resolves a market key from unrelated metadata", () => {
    expect(readMarketKeyFromMetadata({ car: "white" })).toBeNull()
    expect(readMarketKeyFromMetadata(null)).toBeNull()
    expect(readMarketKeyFromMetadata(undefined)).toBeNull()
  })

  it("marks the mapping as pending Control Plane registration, never authoritative", () => {
    const tag = regionMappingTag("zuribeans_ug")
    expect(tag.baobab_mapping_authority).toBe(
      "trade-engine-native-pending-control-plane-registration",
    )
  })
})
