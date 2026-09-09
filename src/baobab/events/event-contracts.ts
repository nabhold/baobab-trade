import type { BaobabTenantContext } from "../contracts/tenant-context"

/**
 * Mirrors nabhold/shared contracts/events/v1/envelope.schema.json — a
 * CloudEvents 1.0 structured JSON profile. `baobabscope` and `tenantid` are
 * modelled as a discriminated union so a platform event can never carry (or
 * omit) tenant context incorrectly at compile time, matching the schema's
 * if/then/else coupling rule.
 */
type BaobabCloudEventBase<TData extends Record<string, unknown>> = {
  specversion: "1.0"
  id: string
  type: string
  source: string
  subject: string
  time: string
  datacontenttype: "application/json"
  dataschema: string
  correlationid: string
  causationid?: string
  idempotencykey?: string
  traceparent?: string
  tracestate?: string
  data: TData
}

export type BaobabTenantEvent<TData extends Record<string, unknown> = Record<string, unknown>> =
  BaobabCloudEventBase<TData> & { baobabscope: "tenant"; tenantid: string }

export type BaobabPlatformEvent<TData extends Record<string, unknown> = Record<string, unknown>> =
  BaobabCloudEventBase<TData> & { baobabscope: "platform" }

export type BaobabCloudEvent<TData extends Record<string, unknown> = Record<string, unknown>> =
  | BaobabTenantEvent<TData>
  | BaobabPlatformEvent<TData>

/** Stable logical producer URI. Must never be a deployment hostname (schema `source` rule). */
export const TRADE_EVENT_SOURCE = "https://engines.nabhold.com/baobab-trade"

const EVENT_TYPE_PATTERN = /^com\.nabhold\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.v[1-9][0-9]*$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const assertValidEventType = (type: string): void => {
  if (!EVENT_TYPE_PATTERN.test(type)) {
    throw new Error(`Event type "${type}" does not match com.nabhold.<name>.v<N>`)
  }
}

export type TradeEventInput<TData extends Record<string, unknown>> = {
  id: string
  type: string
  subject: string
  time: string
  dataschema: string
  correlationid: string
  causationid?: string
  idempotencykey?: string
  traceparent?: string
  tracestate?: string
  data: TData
}

export const createTenantTradeEvent = <TData extends Record<string, unknown>>(
  context: BaobabTenantContext,
  input: TradeEventInput<TData>,
): BaobabTenantEvent<TData> => {
  assertValidEventType(input.type)
  return {
    specversion: "1.0",
    datacontenttype: "application/json",
    source: TRADE_EVENT_SOURCE,
    baobabscope: "tenant",
    tenantid: context.tenantId,
    ...input,
  }
}

export const createPlatformTradeEvent = <TData extends Record<string, unknown>>(
  input: TradeEventInput<TData>,
): BaobabPlatformEvent<TData> => {
  assertValidEventType(input.type)
  return {
    specversion: "1.0",
    datacontenttype: "application/json",
    source: TRADE_EVENT_SOURCE,
    baobabscope: "platform",
    ...input,
  }
}

export const isValidCloudEvent = (candidate: unknown): candidate is BaobabCloudEvent => {
  if (typeof candidate !== "object" || candidate === null) return false
  const value = candidate as Partial<BaobabCloudEvent> & Record<string, unknown>

  const baseValid =
    value.specversion === "1.0" &&
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.type === "string" &&
    EVENT_TYPE_PATTERN.test(value.type) &&
    typeof value.source === "string" &&
    typeof value.subject === "string" &&
    value.subject.length > 0 &&
    typeof value.time === "string" &&
    value.datacontenttype === "application/json" &&
    typeof value.dataschema === "string" &&
    typeof value.correlationid === "string" &&
    UUID_PATTERN.test(value.correlationid) &&
    typeof value.data === "object" &&
    value.data !== null

  if (!baseValid) return false

  if (value.baobabscope === "tenant") {
    return typeof value.tenantid === "string" && value.tenantid.length > 0
  }

  return value.baobabscope === "platform" && value.tenantid === undefined
}

export type TradeOrderAcceptedPayload = {
  trade_order_id: string
  display_id?: number
  customer_id?: string
  currency: string
  total: number
}

export const B2B_EVENT_TYPES = {
  organisationCreated: "com.nabhold.commerce.b2b-organisation.created.v1",
  buyerAdded: "com.nabhold.commerce.b2b-buyer.added.v1",
  approvalRequested: "com.nabhold.commerce.b2b-approval.requested.v1",
  approvalDecided: "com.nabhold.commerce.b2b-approval.decided.v1",
} as const

export const INVENTORY_EVENT_TYPES = {
  projected: "com.nabhold.commerce.inventory.projected.v1",
  reconciled: "com.nabhold.commerce.inventory.reconciled.v1",
  reserved: "com.nabhold.commerce.inventory.reserved.v1",
  released: "com.nabhold.commerce.inventory.released.v1",
} as const

export const PAYMENT_EVENT_TYPES = {
  initiated: "com.nabhold.commerce.payment.initiated.v1",
  statusChanged: "com.nabhold.commerce.payment.status-changed.v1",
  reconciliationRequired: "com.nabhold.commerce.payment.reconciliation-required.v1",
  reconciled: "com.nabhold.commerce.payment.reconciled.v1",
} as const

export const FULFILMENT_EVENT_TYPES = {
  requested: "com.nabhold.commerce.fulfilment.requested.v1",
  accepted: "com.nabhold.commerce.fulfilment.accepted.v1",
  dispatched: "com.nabhold.commerce.fulfilment.dispatched.v1",
  delivered: "com.nabhold.commerce.fulfilment.delivered.v1",
  exception: "com.nabhold.commerce.fulfilment.exception.v1",
  reconciled: "com.nabhold.commerce.fulfilment.reconciled.v1",
} as const

export const TAX_EVENT_TYPES = {
  determined: "com.nabhold.commerce.tax.determined.v1",
  reconciliationRequired: "com.nabhold.commerce.tax.reconciliation-required.v1",
  reconciled: "com.nabhold.commerce.tax.reconciled.v1",
  profileVerified: "com.nabhold.commerce.tax-profile.verified.v1",
} as const

export const TRADE_READINESS_EVENT_TYPES = {
  classificationAssigned: "com.nabhold.trade.classification.assigned.v1",
  complianceDecided: "com.nabhold.trade.compliance.decided.v1",
  crossBorderCreated: "com.nabhold.trade.cross-border-order.created.v1",
} as const

export const ERP_INTEGRATION_EVENT_TYPES = {
  orderProjectionRequested: "com.nabhold.commerce.erp-order.projection-requested.v1",
  fulfilmentProjectionRequested: "com.nabhold.commerce.erp-fulfilment.projection-requested.v1",
  financialStatusProjected: "com.nabhold.commerce.erp-financial-status.projected.v1",
  reconciliationRequired: "com.nabhold.commerce.erp-integration.reconciliation-required.v1",
} as const

export const THAMANI_EVENT_TYPES = {
  productProjectionRequested: "com.nabhold.commerce.thamani-product.projection-requested.v1",
  supplierProjectionRequested: "com.nabhold.commerce.thamani-supplier.projection-requested.v1",
  warehouseProjectionRequested: "com.nabhold.commerce.thamani-warehouse.projection-requested.v1",
  orderProjectionRequested: "com.nabhold.commerce.thamani-order.projection-requested.v1",
  shipmentProjectionRequested: "com.nabhold.commerce.thamani-shipment.projection-requested.v1",
  paymentProjectionRequested: "com.nabhold.commerce.thamani-payment.projection-requested.v1",
  returnRefundProjectionRequested:
    "com.nabhold.commerce.thamani-return-refund.projection-requested.v1",
  creditLineProjectionRequested: "com.nabhold.commerce.thamani-credit-line.projection-requested.v1",
  reconciliationRequired: "com.nabhold.commerce.thamani.reconciliation-required.v1",
} as const

export type ThamaniProjectionKind =
  | "PRODUCT"
  | "SUPPLIER"
  | "WAREHOUSE"
  | "ORDER"
  | "SHIPMENT"
  | "PAYMENT"
  | "RETURN_REFUND"
  | "CREDIT_LINE"

export type ThamaniProjectionEventPayload = {
  owner_legal_entity_id: "canonical:legal-entity:thamani"
  digital_estate: "estate:thamani-b2c"
  market_key: "thamani_ug" | "thamani_za"
  legal_seller_key: "thamani-uganda" | "thamani-south-africa"
  canonical_entity_id: string
  commerce_reference: string
  projection_kind: ThamaniProjectionKind
  projection_status: "PENDING" | "PROJECTED" | "RECONCILIATION_REQUIRED"
  source_version: number
}

export type ErpIntegrationEventPayload = {
  canonical_entity_id: string
  commerce_reference: string
  erp_external_reference?: string
  projection_kind: "ORDER" | "FULFILMENT" | "FINANCIAL_STATUS"
  projection_status: string
  source_sequence?: number
}

export type TradeReadinessEventPayload = {
  transaction_reference: string
  order_reference: string
  market_key: string
  legal_seller_key: string
  origin_country: string
  destination_country: string
  incoterm: string
  hs_classification_references: string[]
  trade_uoms: string[]
  customs_procedure_reference: string
  compliance_decision_reference: string
  compliance_status: "APPROVED" | "REJECTED" | "REVIEW_REQUIRED"
}

export type TaxEventPayload = {
  determination_reference: string
  organisation_id: string
  market_key: string
  legal_seller_key: string
  jurisdiction_key: string
  product_tax_classification: string
  transaction_type: string
  treatment: "STANDARD" | "ZERO_RATED" | "EXEMPT" | "REVERSE_CHARGE"
  currency: string
  taxable_basis_minor: number
  tax_amount_minor: number
  rule_reference: string
  rule_version: string
  provider_key: string
  calculation_reference: string
  source_authority: string
  effective_at: string
  legal_reason?: string
}

export type FulfilmentEventPayload = {
  fulfilment_reference: string
  order_reference: string
  organisation_id: string
  market_key: string
  legal_seller_key: string
  source_location_key: string
  mode: "LOCAL_DELIVERY" | "BULK_FREIGHT" | "CROSS_BORDER" | "CUSTOMER_COLLECTION"
  provider_key: string
  status: string
  shipment_reference?: string
  carrier_reference?: string
  tracking_reference?: string
  export_reference?: string
  customs_reference?: string
  incoterm?: string
  gross_weight_kg: number
  package_count: number
  dispatch_date?: string
  delivery_date?: string
}

export type PaymentEventPayload = {
  payment_reference: string
  order_reference: string
  organisation_id: string
  market_key: string
  legal_seller_key: string
  method: "BANK_TRANSFER" | "MANUAL_SETTLEMENT" | "INVOICE_TERMS" | "SELECTED_PSP"
  terms: "PREPAID" | "DUE_ON_RECEIPT" | "NET_7" | "NET_14" | "NET_30"
  provider_key: string
  provider_reference?: string
  currency: string
  amount_minor: number
  status: string
  erp_reconciliation_status?: "MATCHED" | "VARIANCE" | "PENDING_ERP" | "RESOLVED"
}

export type InventoryEventPayload = {
  inventory_item_id: string
  stock_location_id: string
  canonical_location_key: string
  erp_warehouse_reference: string
  quantity: number
  source_sequence?: number
  reservation_id?: string
  reconciliation_status?: "MATCHED" | "VARIANCE" | "RESOLVED"
}

export type B2BOrganisationEventPayload = {
  organisation_id: string
  canonical_organisation_id?: string
  market_keys: string[]
}

export type B2BBuyerEventPayload = {
  organisation_id: string
  membership_id: string
  customer_id: string
  principal_id: string
  roles: string[]
}

export type B2BApprovalEventPayload = {
  organisation_id: string
  approval_id: string
  requested_by_membership_id: string
  decided_by_membership_id?: string
  amount_minor: number
  currency_code: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  customer_po_number?: string
}
