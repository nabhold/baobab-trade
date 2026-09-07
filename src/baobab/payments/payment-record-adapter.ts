import type PaymentBridgeModuleService from "../../modules/payment-bridge/service"
import type {
  InitiatePaymentCommand,
  PaymentRecordRepository,
  PaymentSnapshot,
  PaymentStatus,
} from "./orchestration-port"

type StoredPayment = Awaited<ReturnType<PaymentBridgeModuleService["listCommercePayments"]>>[number]

const snapshot = (payment: StoredPayment): PaymentSnapshot => ({
  id: payment.id,
  paymentReference: payment.payment_reference,
  orderReference: payment.order_reference,
  organisationId: payment.organisation_id,
  marketKey: payment.market_key,
  legalSellerKey: payment.legal_seller_key,
  method: payment.method,
  terms: payment.terms,
  providerKey: payment.provider_key,
  providerReference: payment.provider_reference,
  providerStatus: payment.provider_status,
  currency: payment.currency_code,
  amountMinor: Number(payment.amount_minor),
  status: payment.status,
  idempotencyKey: payment.source_idempotency_key,
  correlationId: payment.correlation_id,
  dueAt: payment.due_at ?? undefined,
})

export class PaymentBridgeRecordAdapter implements PaymentRecordRepository {
  constructor(private readonly bridge: PaymentBridgeModuleService) {}

  async findByIdempotencyKey(key: string): Promise<PaymentSnapshot | undefined> {
    const [payment] = await this.bridge.listCommercePayments({ source_idempotency_key: key })
    return payment ? snapshot(payment) : undefined
  }

  async create(command: InitiatePaymentCommand): Promise<PaymentSnapshot> {
    return snapshot(
      await this.bridge.createCommercePayments({
        payment_reference: command.paymentReference,
        order_reference: command.orderReference,
        organisation_id: command.organisationId,
        market_key: command.marketKey,
        legal_seller_key: command.legalSellerKey,
        method: command.method,
        terms: command.terms,
        provider_key: command.providerKey,
        currency_code: command.currency,
        amount_minor: command.amountMinor,
        status: "CREATED",
        source_idempotency_key: command.idempotencyKey,
        correlation_id: command.correlationId,
        due_at: command.dueAt,
      }),
    )
  }

  async transition(
    paymentId: string,
    from: PaymentStatus,
    to: PaymentStatus,
    idempotencyKey: string,
    providerReference?: string,
    providerStatus?: string,
  ): Promise<PaymentSnapshot> {
    const [existingTransition] = await this.bridge.listPaymentStatusTransitions({
      idempotency_key: idempotencyKey,
    })
    const [current] = await this.bridge.listCommercePayments({ id: paymentId })
    if (!current) throw new Error("Payment does not exist")
    if (existingTransition) return snapshot(current)
    if (current.status !== from)
      throw new Error("Payment state changed before transition could be applied")
    await this.bridge.createPaymentStatusTransitions({
      payment_id: paymentId,
      from_status: from,
      to_status: to,
      idempotency_key: idempotencyKey,
      provider_reference: providerReference,
      provider_status: providerStatus,
      occurred_at: new Date(),
    })
    return snapshot(
      await this.bridge.updateCommercePayments({
        id: paymentId,
        status: to,
        provider_reference: providerReference,
        provider_status: providerStatus,
      }),
    )
  }
}
