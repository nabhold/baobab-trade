export type ErpMappingType =
  | "BUSINESS_PARTNER"
  | "PRODUCT"
  | "WAREHOUSE"
  | "SALES_ORDER"
  | "SHIPMENT"
  | "FINANCIAL_CONSEQUENCE"
export type ProjectionKind = "ORDER" | "FULFILMENT"
export type ProjectionStatus =
  | "PENDING"
  | "PUBLISHED"
  | "ACKNOWLEDGED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"
export type FinancialStatus =
  | "OPEN"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CREDIT_HOLD"
  | "CANCELLED"
export type ErpProjectionCommand = {
  kind: ProjectionKind
  commerceReference: string
  canonicalEntityId: string
  legalSellerKey: string
  marketKey: string
  payload: Record<string, unknown>
  idempotencyKey: string
  correlationId: string
}
export type FinancialStatusProjection = {
  commercePaymentReference: string
  erpPaymentReference: string
  status: FinancialStatus
  amountMinor: number
  outstandingMinor: number
  currency: string
  sourceSequence: number
  sourceIdempotencyKey: string
  observedAt: Date
}

export const assertFinancialProjection = (
  currentSequence: number | null,
  projection: FinancialStatusProjection,
) => {
  if (!Number.isInteger(projection.sourceSequence) || projection.sourceSequence <= 0)
    throw new Error("ERP financial sequence must be positive")
  if (currentSequence !== null && projection.sourceSequence <= currentSequence)
    throw new Error("Stale or replayed ERP financial-status projection")
  if (
    !Number.isSafeInteger(projection.amountMinor) ||
    projection.amountMinor < 0 ||
    !Number.isSafeInteger(projection.outstandingMinor) ||
    projection.outstandingMinor < 0 ||
    projection.outstandingMinor > projection.amountMinor
  )
    throw new Error("Invalid ERP financial amounts")
}

export const reconcileErpProjection = (input: {
  expected: Record<string, unknown>
  observed?: Record<string, unknown> | null
}) => {
  if (!input.observed)
    return { status: "PENDING_ERP" as const, differences: ["ERP_PROJECTION_MISSING"] }
  const keys = [...new Set([...Object.keys(input.expected), ...Object.keys(input.observed)])].sort()
  const differences = keys.filter(
    (key) => JSON.stringify(input.expected[key]) !== JSON.stringify(input.observed?.[key]),
  )
  return { status: differences.length ? ("VARIANCE" as const) : ("MATCHED" as const), differences }
}

export interface ErpProjectionRepository {
  findByIdempotencyKey(key: string): Promise<{ id: string } | undefined>
  create(command: ErpProjectionCommand): Promise<{ id: string }>
}
export interface ErpIntegrationPort {
  queue(command: ErpProjectionCommand): Promise<{ id: string }>
}
export class DurableErpIntegrationAdapter implements ErpIntegrationPort {
  constructor(private readonly repository: ErpProjectionRepository) {}
  async queue(command: ErpProjectionCommand) {
    if (
      !command.canonicalEntityId ||
      !command.commerceReference ||
      !Object.keys(command.payload).length
    )
      throw new Error("ERP projection requires canonical identity and payload")
    return (
      (await this.repository.findByIdempotencyKey(command.idempotencyKey)) ??
      this.repository.create(command)
    )
  }
}
