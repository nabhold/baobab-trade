import { describe, expect, it } from "vitest"
import {
  MedusaPaymentOrchestrationAdapter,
  type InitiatePaymentCommand,
  type PaymentRecordRepository,
  type PaymentSnapshot,
} from "../src/baobab/payments"

const command: InitiatePaymentCommand = {
  paymentReference: "pay-1",
  orderReference: "order-1",
  organisationId: "org-1",
  marketKey: "zuribeans-ug",
  legalSellerKey: "zuribeans-uganda",
  method: "INVOICE_TERMS",
  terms: "NET_30",
  providerKey: "medusa-manual-ug",
  currency: "UGX",
  amountMinor: 1000,
  idempotencyKey: "init-1",
  correlationId: "correlation-1",
}

class MemoryRepository implements PaymentRecordRepository {
  records = new Map<string, PaymentSnapshot>()
  async findByIdempotencyKey(key: string) {
    return this.records.get(key)
  }
  async create(input: InitiatePaymentCommand) {
    const payment = { ...input, id: "pay_1", status: "CREATED" as const }
    this.records.set(input.idempotencyKey, payment)
    return payment
  }
  async transition(id: string, from: PaymentSnapshot["status"], to: PaymentSnapshot["status"]) {
    const current = [...this.records.values()].find((record) => record.id === id)
    if (!current) throw new Error("Payment does not exist")
    const payment = { ...current, status: to }
    this.records.set(current.idempotencyKey, payment)
    return payment
  }
}

describe("PaymentOrchestrationPort", () => {
  it("initiates idempotently and preserves account terms as pending", async () => {
    const adapter = new MedusaPaymentOrchestrationAdapter(new MemoryRepository())
    const first = await adapter.initiate(command)
    expect((await adapter.initiate(command)).id).toBe(first.id)
    expect((await adapter.transition(first, "PENDING", "pending-1")).status).toBe("PENDING")
  })

  it("rejects invalid transitions and terms disguised as settlement", async () => {
    const adapter = new MedusaPaymentOrchestrationAdapter(new MemoryRepository())
    const payment = await adapter.initiate(command)
    await expect(adapter.transition(payment, "SETTLED", "settled-1")).rejects.toThrow(/Invalid/)
    await expect(adapter.initiate({ ...command, method: "BANK_TRANSFER" })).rejects.toThrow(
      /INVOICE_TERMS/,
    )
  })
})
