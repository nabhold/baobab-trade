import { describe, expect, it } from "vitest"
import { isValidOrganisationalContext } from "../src/baobab/contracts/organisational-context"

describe("Baobab organisational context", () => {
  it("requires a legal entity boundary without collapsing it into tenant", () => {
    expect(isValidOrganisationalContext({ legalEntityId: "le_123" })).toBe(true)
    expect(isValidOrganisationalContext({ tenantId: "tenant_123" })).toBe(false)
  })
})
