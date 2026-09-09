/**
 * Gate 17 — Store Credit. Medusa v2.20.1 has no persistent customer-wallet
 * primitive (a running balance redeemable on any future order): the only
 * native "credit" concept is an Order Credit Line — a one-off amount
 * attached to a single order. This module implements Store Credit as three
 * explicitly reasoned uses of that same native primitive, not a bespoke
 * wallet ledger — "implement only as approved native capability" per the
 * completion plan.
 *
 * Both credit-line workflows in `@medusajs/core-flows`
 * (`createOrderCreditLinesWorkflow`, `createOrderRefundCreditLinesWorkflow`)
 * exist for order-edit/exchange reconciliation: the generic one only
 * accepts a call when the order already has a non-zero pending difference
 * (an edit already in flight), and the refund-specific one isn't part of
 * the package's public export surface in this Medusa version. Neither fits
 * "grant credit against an otherwise-settled order," which is what all
 * three Store Credit reasons need. `IOrderModuleService.createOrderCreditLines`
 * — the module service's own method, part of its published, typed API — has
 * no such restriction and accepts `metadata` directly, so the reason and its
 * trace-back reference travel there rather than through either workflow.
 */

export type ThamaniStoreCreditReason = "REFUND" | "SERVICE" | "PROMOTIONAL"

/**
 * Each reason has a distinct ERP accounting consequence: a REFUND-reason
 * credit reduces revenue/accounts-receivable for a specific returned or
 * cancelled order, a SERVICE-reason credit is a goodwill adjustment booked
 * as a customer-service cost (never a revenue reversal), and a
 * PROMOTIONAL-reason credit is a marketing-driven adjustment booked as a
 * marketing expense (also never a revenue reversal). Getting this wrong
 * mis-states the ERP's revenue and expense lines, so it is derived here from
 * the reason rather than left to each caller to set by hand.
 */
export const THAMANI_STORE_CREDIT_REASON_CONFIG: Record<
  ThamaniStoreCreditReason,
  {
    /** `reference` on the native Order Credit Line — a model-name-shaped tag, not free text. */
    reference: string
    /** ERP financial treatment this reason's credit lines are booked under. */
    erpFinancialConsequence: "AR_CREDIT_MEMO" | "CUSTOMER_SERVICE_EXPENSE" | "MARKETING_EXPENSE"
    /**
     * Whether this reason requires a `referenceId` tracing the credit back to
     * its source: a REFUND must trace to the return/cancellation it offsets,
     * and a PROMOTIONAL credit must trace to the approved campaign/policy
     * that authorised it — an unaccountable promotional credit is exactly
     * the kind of thing a real finance team needs to be able to trace back.
     * SERVICE credits are goodwill judgement calls with no such prior
     * record; a human-readable justification is required in its place (see
     * `buildThamaniStoreCreditOrderInput`).
     */
    requiresReferenceId: boolean
  }
> = {
  REFUND: {
    reference: "thamani_store_credit_refund",
    erpFinancialConsequence: "AR_CREDIT_MEMO",
    requiresReferenceId: true,
  },
  SERVICE: {
    reference: "thamani_store_credit_service",
    erpFinancialConsequence: "CUSTOMER_SERVICE_EXPENSE",
    requiresReferenceId: false,
  },
  PROMOTIONAL: {
    reference: "thamani_store_credit_promotional",
    erpFinancialConsequence: "MARKETING_EXPENSE",
    requiresReferenceId: true,
  },
}

export type ThamaniStoreCreditIssuanceInput = {
  orderId: string
  amountMinor: number
  reason: ThamaniStoreCreditReason
  /** Required for REFUND (the return/cancellation) and PROMOTIONAL (the campaign/policy). */
  referenceId?: string | null
  /** Required for SERVICE in place of a referenceId — a human-readable reason a credit was granted. */
  serviceJustification?: string | null
}

/** The shape `IOrderModuleService.createOrderCreditLines` actually accepts. */
export type ThamaniStoreCreditOrderCreditLineInput = {
  order_id: string
  amount: number
  reference: string
  reference_id: string | null
  metadata: { baobab_store_credit_reason: ThamaniStoreCreditReason; service_justification?: string }
}

export const buildThamaniStoreCreditOrderInput = (
  input: ThamaniStoreCreditIssuanceInput,
): ThamaniStoreCreditOrderCreditLineInput => {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    throw new Error("Store credit amount must be a positive integer in minor units")
  const config = THAMANI_STORE_CREDIT_REASON_CONFIG[input.reason]
  if (config.requiresReferenceId && !input.referenceId)
    throw new Error(
      `Store credit reason ${input.reason} requires a referenceId tracing it to its source`,
    )
  if (input.reason === "SERVICE" && !input.referenceId && !input.serviceJustification)
    throw new Error("A SERVICE store credit requires a serviceJustification or a referenceId")
  return {
    order_id: input.orderId,
    amount: input.amountMinor,
    reference: config.reference,
    reference_id: input.referenceId ?? null,
    metadata: {
      baobab_store_credit_reason: input.reason,
      ...(input.serviceJustification ? { service_justification: input.serviceJustification } : {}),
    },
  }
}
