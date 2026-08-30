import { describe, expect, it } from "vitest"
import {
  assertTradeEntitlement,
  isValidOrganisationalContext,
} from "../src/baobab/contracts/organisational-context"

const activeContext = {
  tenantId: "01K4TENANT",
  entityId: "THAMANI-GLOBAL",
  status: "active" as const,
  productsEnabled: ["baobab-trade"],
}

describe("Baobab organisational context", () => {
  it("requires separate tenant and canonical legal-entity identifiers", () => {
    expect(isValidOrganisationalContext(activeContext)).toBe(true)
    expect(isValidOrganisationalContext({ ...activeContext, tenantId: undefined })).toBe(false)
    expect(isValidOrganisationalContext({ ...activeContext, entityId: undefined })).toBe(false)
  })

  it("fails closed for inactive or unentitled tenants", () => {
    expect(assertTradeEntitlement(activeContext)).toEqual(activeContext)
    expect(() =>
      assertTradeEntitlement({ ...activeContext, status: "suspended" }),
    ).toThrow("not active")
    expect(() =>
      assertTradeEntitlement({ ...activeContext, productsEnabled: [] }),
    ).toThrow("not entitled")
  })
})
