import { describe, expect, it } from "vitest"
import {
  isCanonicalEntityId,
  isValidMappingResolutionResponse,
} from "../src/baobab/contracts/canonical-mapping"

describe("canonical mapping contract", () => {
  const response = {
    mapping_id: "map_zuribeansmarket",
    canonical_entity_id: "zuribeans_za_b2b",
    external_reference_id: "ref_medusaregion",
    status: "ACTIVE",
    resolution_reason: "scope_matched",
    effective_timestamp: "2026-09-07T10:00:00Z",
  }

  it("accepts opaque canonical IDs without deriving business identity from them", () => {
    expect(isCanonicalEntityId("ZURIBEANS-ZA")).toBe(true)
    expect(isCanonicalEntityId("estate:zuribeans-b2b")).toBe(true)
    expect(isCanonicalEntityId("not valid/id")).toBe(false)
  })

  it("requires active Control Plane mapping and ExternalReference IDs", () => {
    expect(isValidMappingResolutionResponse(response)).toBe(true)
    expect(isValidMappingResolutionResponse({ ...response, status: "DRAFT" })).toBe(false)
    expect(
      isValidMappingResolutionResponse({ ...response, external_reference_id: undefined }),
    ).toBe(false)
  })
})
