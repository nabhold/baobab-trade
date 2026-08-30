import type { BaobabOrganisationalContext } from "../contracts/organisational-context"

export type BaobabEventEnvelope<TPayload extends Record<string, unknown>> = {
  id: string
  source: "baobab.trade"
  type: string
  version: "1.0"
  occurredAt: string
  correlationId?: string
  organisationalContext?: BaobabOrganisationalContext
  payload: TPayload
}

export type TradeOrderAcceptedPayload = {
  medusaOrderId: string
  displayId?: number
  customerId?: string
  currencyCode: string
  total: number
}

export type TradeIntegrationEvent = BaobabEventEnvelope<TradeOrderAcceptedPayload>
