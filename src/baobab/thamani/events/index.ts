import type { BaobabTenantContext } from "../../contracts/tenant-context"
import {
  createTenantTradeEvent,
  THAMANI_EVENT_TYPES,
  type BaobabTenantEvent,
  type ThamaniProjectionEventPayload,
  type ThamaniProjectionKind,
} from "../../events"

const EVENT_TYPE_BY_KIND = {
  PRODUCT: THAMANI_EVENT_TYPES.productProjectionRequested,
  SUPPLIER: THAMANI_EVENT_TYPES.supplierProjectionRequested,
  WAREHOUSE: THAMANI_EVENT_TYPES.warehouseProjectionRequested,
  ORDER: THAMANI_EVENT_TYPES.orderProjectionRequested,
  SHIPMENT: THAMANI_EVENT_TYPES.shipmentProjectionRequested,
  PAYMENT: THAMANI_EVENT_TYPES.paymentProjectionRequested,
  RETURN_REFUND: THAMANI_EVENT_TYPES.returnRefundProjectionRequested,
  CREDIT_LINE: THAMANI_EVENT_TYPES.creditLineProjectionRequested,
} satisfies Record<ThamaniProjectionKind, string>

export const createThamaniProjectionEvent = (
  context: BaobabTenantContext,
  input: {
    id: string
    correlationId: string
    causationId: string
    occurredAt: string
    idempotencyKey: string
    payload: ThamaniProjectionEventPayload
  },
): BaobabTenantEvent<ThamaniProjectionEventPayload> => {
  if (
    context.tenantId !== "tenant-thamani" ||
    context.entityId !== "canonical:legal-entity:thamani"
  )
    throw new Error("Thamani event context belongs to another legal entity")
  if (input.payload.digital_estate !== "estate:thamani-b2c")
    throw new Error("Thamani events require the estate:thamani-b2c Digital Estate")
  if (input.payload.owner_legal_entity_id !== "canonical:legal-entity:thamani")
    throw new Error("Thamani events require the Thamani owning legal entity")
  if (
    (input.payload.market_key === "thamani_ug" &&
      input.payload.legal_seller_key !== "thamani-uganda") ||
    (input.payload.market_key === "thamani_za" &&
      input.payload.legal_seller_key !== "thamani-south-africa")
  )
    throw new Error("Thamani event crosses its Market/legal-seller boundary")
  if (!input.idempotencyKey.startsWith("thamani:erp:"))
    throw new Error("Thamani event requires a legal-entity-scoped idempotency key")
  const kind = input.payload.projection_kind
  return createTenantTradeEvent(context, {
    id: input.id,
    type: EVENT_TYPE_BY_KIND[kind],
    subject: `thamani/${kind.toLowerCase()}/${input.payload.canonical_entity_id}`,
    time: input.occurredAt,
    dataschema: `https://contracts.nabhold.com/commerce/thamani/${kind.toLowerCase()}/projection-requested/v1`,
    correlationid: input.correlationId,
    causationid: input.causationId,
    idempotencykey: input.idempotencyKey,
    data: input.payload,
  })
}
