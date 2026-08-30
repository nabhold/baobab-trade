import type { BaobabOrganisationalContext } from "../contracts/organisational-context"

export type BaobabEventEnvelope<TPayload extends Record<string, unknown>> = {
  event_id: string
  event_type: string
  schema_version: "1.0"
  occurred_at: string
  source: "baobab-trade"
  correlation_id: string
  causation_id?: string | null
  tenant_id: string
  entity_id: string
  payload: TPayload
}

export type TradeOrderAcceptedPayload = {
  trade_order_id: string
  display_id?: number
  customer_id?: string
  currency: string
  total: number
}

export const createTradeEvent = <TPayload extends Record<string, unknown>>(
  context: BaobabOrganisationalContext,
  event: Omit<
    BaobabEventEnvelope<TPayload>,
    "source" | "schema_version" | "tenant_id" | "entity_id"
  >,
): BaobabEventEnvelope<TPayload> => ({
  ...event,
  source: "baobab-trade",
  schema_version: "1.0",
  tenant_id: context.tenantId,
  entity_id: context.entityId,
})

export type TradeIntegrationEvent = BaobabEventEnvelope<TradeOrderAcceptedPayload>
