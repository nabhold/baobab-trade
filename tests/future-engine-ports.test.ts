import { describe, expect, it } from "vitest"
import { DisabledLedgerEvidenceAdapter } from "../src/baobab/ledger"
import {
  MedusaOrderOrchestrationAdapter,
  type OrderCommand,
  type OrderSnapshot,
} from "../src/baobab/orders"
import { NATIVE_CAPABILITY_BINDINGS } from "../src/baobab/ports"
const command: OrderCommand = {
  orderReference: "order-14",
  organisationId: "org-1",
  marketKey: "zuribeans_ug",
  legalSellerKey: "zuribeans-uganda",
  currencyCode: "UGX",
  totalMinor: 1000,
  idempotencyKey: "gate14:order",
  correlationId: "corr-14",
}
describe("future engine ports", () => {
  it("keeps native capabilities bound", () =>
    expect(NATIVE_CAPABILITY_BINDINGS).toMatchObject({
      orders: "MEDUSA_NATIVE",
      inventory: "MEDUSA_NATIVE",
      pricing: "MEDUSA_NATIVE",
      payments: "MEDUSA_NATIVE",
      fulfilment: "MEDUSA_NATIVE",
      ledgerEvidence: "DISABLED_BOUNDARY",
    }))
  it("places orders idempotently", async () => {
    const records = new Map<string, OrderSnapshot>()
    const adapter = new MedusaOrderOrchestrationAdapter({
      findByIdempotencyKey: async (key) => records.get(key),
      create: async (input) => {
        const result = { ...input, id: "order-native-1", status: "PENDING" }
        records.set(input.idempotencyKey, result)
        return result
      },
      retrieve: async () => {
        const result = records.get(command.idempotencyKey)
        if (!result) throw new Error("missing")
        return result
      },
    })
    expect((await adapter.place(command)).id).toBe((await adapter.place(command)).id)
  })
  it("keeps the ledger disabled and validates monetary evidence", async () => {
    await expect(
      new DisabledLedgerEvidenceAdapter().append({
        evidenceId: "evidence-1",
        evidenceType: "PAYMENT_OBSERVED",
        canonicalEntityId: "canonical:payment:1",
        commerceReference: "payment-1",
        amountMinor: 100,
        occurredAt: new Date().toISOString(),
        idempotencyKey: "ledger-1",
        correlationId: "corr-1",
        evidence: {},
      }),
    ).rejects.toThrow(/currency/)
  })
})
