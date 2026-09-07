import type { PaymentMethod, PaymentTerms } from "./payment-config"

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN"

export type InitiatePaymentCommand = {
  paymentReference: string
  orderReference: string
  organisationId: string
  marketKey: string
  legalSellerKey: string
  method: PaymentMethod
  terms: PaymentTerms
  providerKey: string
  currency: string
  amountMinor: number
  idempotencyKey: string
  correlationId: string
  dueAt?: Date
}

export type PaymentSnapshot = InitiatePaymentCommand & {
  id: string
  status: PaymentStatus
  providerReference?: string | null
  providerStatus?: string | null
}

export interface PaymentRecordRepository {
  findByIdempotencyKey(key: string): Promise<PaymentSnapshot | undefined>
  create(command: InitiatePaymentCommand): Promise<PaymentSnapshot>
  transition(
    paymentId: string,
    from: PaymentStatus,
    to: PaymentStatus,
    idempotencyKey: string,
    providerReference?: string,
    providerStatus?: string,
  ): Promise<PaymentSnapshot>
}

export interface PaymentOrchestrationPort {
  initiate(command: InitiatePaymentCommand): Promise<PaymentSnapshot>
  transition(
    payment: PaymentSnapshot,
    status: PaymentStatus,
    idempotencyKey: string,
    provider?: { reference?: string; status?: string },
  ): Promise<PaymentSnapshot>
}

const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ["PENDING", "AUTHORIZED", "FAILED", "CANCELLED", "UNKNOWN"],
  PENDING: ["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "UNKNOWN"],
  AUTHORIZED: ["CAPTURED", "CANCELLED", "UNKNOWN"],
  CAPTURED: ["SETTLED", "UNKNOWN"],
  SETTLED: [],
  FAILED: [],
  CANCELLED: [],
  UNKNOWN: ["PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"],
}

export class MedusaPaymentOrchestrationAdapter implements PaymentOrchestrationPort {
  constructor(private readonly records: PaymentRecordRepository) {}

  async initiate(command: InitiatePaymentCommand): Promise<PaymentSnapshot> {
    if (!Number.isSafeInteger(command.amountMinor) || command.amountMinor <= 0) {
      throw new Error("Payment amount must be a positive integer in minor units")
    }
    if (command.terms !== "PREPAID" && command.method !== "INVOICE_TERMS") {
      throw new Error("Commercial invoice terms require the INVOICE_TERMS method")
    }
    const existing = await this.records.findByIdempotencyKey(command.idempotencyKey)
    return existing ?? this.records.create(command)
  }

  async transition(
    payment: PaymentSnapshot,
    status: PaymentStatus,
    idempotencyKey: string,
    provider: { reference?: string; status?: string } = {},
  ): Promise<PaymentSnapshot> {
    if (!TRANSITIONS[payment.status].includes(status)) {
      throw new Error(`Invalid payment transition ${payment.status} -> ${status}`)
    }
    return this.records.transition(
      payment.id,
      payment.status,
      status,
      idempotencyKey,
      provider.reference,
      provider.status,
    )
  }
}
