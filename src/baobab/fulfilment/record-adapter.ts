import type FulfilmentBridgeModuleService from "../../modules/fulfilment-bridge/service"
import type {
  FulfilmentEvidence,
  FulfilmentRecordRepository,
  FulfilmentSnapshot,
  FulfilmentStatus,
  RequestFulfilmentCommand,
} from "./fulfilment-port"
type Stored = Awaited<ReturnType<FulfilmentBridgeModuleService["listCommerceFulfilments"]>>[number]
const snapshot = (record: Stored): FulfilmentSnapshot => ({
  id: record.id,
  fulfilmentReference: record.fulfilment_reference,
  orderReference: record.order_reference,
  organisationId: record.organisation_id,
  marketKey: record.market_key,
  legalSellerKey: record.legal_seller_key,
  sourceLocationKey: record.source_location_key,
  mode: record.mode,
  providerKey: record.provider_key,
  shipment: record.shipment_metadata as RequestFulfilmentCommand["shipment"],
  idempotencyKey: record.source_idempotency_key,
  correlationId: record.correlation_id,
  status: record.status,
  shipmentReference: record.shipment_reference,
  carrierReference: record.carrier_reference,
  trackingReference: record.tracking_reference,
  trackingUrl: record.tracking_url,
  dispatchDate: record.dispatch_date,
  deliveryDate: record.delivery_date,
})
export class FulfilmentBridgeRecordAdapter implements FulfilmentRecordRepository {
  constructor(private readonly bridge: FulfilmentBridgeModuleService) {}
  async findByIdempotencyKey(key: string) {
    const [record] = await this.bridge.listCommerceFulfilments({ source_idempotency_key: key })
    return record ? snapshot(record) : undefined
  }
  async create(command: RequestFulfilmentCommand) {
    return snapshot(
      await this.bridge.createCommerceFulfilments({
        fulfilment_reference: command.fulfilmentReference,
        order_reference: command.orderReference,
        organisation_id: command.organisationId,
        market_key: command.marketKey,
        legal_seller_key: command.legalSellerKey,
        source_location_key: command.sourceLocationKey,
        mode: command.mode,
        provider_key: command.providerKey,
        status: "REQUESTED",
        shipment_metadata: command.shipment,
        source_idempotency_key: command.idempotencyKey,
        correlation_id: command.correlationId,
      }),
    )
  }
  async transition(
    current: FulfilmentSnapshot,
    to: FulfilmentStatus,
    idempotencyKey: string,
    evidence: FulfilmentEvidence = {},
  ) {
    const [prior] = await this.bridge.listFulfilmentStatusTransitions({
      idempotency_key: idempotencyKey,
    })
    const [stored] = await this.bridge.listCommerceFulfilments({ id: current.id })
    if (!stored) throw new Error("Fulfilment does not exist")
    if (prior) return snapshot(stored)
    if (stored.status !== current.status)
      throw new Error("Fulfilment state changed before transition")
    await this.bridge.createFulfilmentStatusTransitions({
      fulfilment_id: current.id,
      from_status: current.status,
      to_status: to,
      idempotency_key: idempotencyKey,
      evidence,
      occurred_at: new Date(),
    })
    return snapshot(
      await this.bridge.updateCommerceFulfilments({
        id: current.id,
        status: to,
        shipment_reference: evidence.shipmentReference,
        carrier_reference: evidence.carrierReference,
        tracking_reference: evidence.trackingReference,
        tracking_url: evidence.trackingUrl,
        dispatch_date: evidence.dispatchDate,
        delivery_date: evidence.deliveryDate,
      }),
    )
  }
}
