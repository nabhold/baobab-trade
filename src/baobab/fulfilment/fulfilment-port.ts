import type { FulfilmentMode } from "./fulfilment-config"

export type Incoterm = "EXW" | "FCA" | "FOB" | "CFR" | "CIF" | "DAP" | "DPU" | "DDP"
export type FulfilmentStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ALLOCATED"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED"
  | "EXCEPTION"
  | "RECONCILIATION_REQUIRED"

export type ShipmentMetadata = {
  originCountry: string
  destinationCountry: string
  exporterOrganisationId?: string
  importerOrganisationId?: string
  hsReferences?: string[]
  complianceDecisionId?: string
  incoterm?: Incoterm
  grossWeightKg: number
  packageCount: number
  exportReference?: string
  customsReference?: string
}

export type RequestFulfilmentCommand = {
  fulfilmentReference: string
  orderReference: string
  organisationId: string
  marketKey: string
  legalSellerKey: string
  sourceLocationKey: string
  mode: FulfilmentMode
  providerKey: string
  shipment: ShipmentMetadata
  idempotencyKey: string
  correlationId: string
}

export type FulfilmentSnapshot = RequestFulfilmentCommand & {
  id: string
  status: FulfilmentStatus
  shipmentReference?: string | null
  carrierReference?: string | null
  trackingReference?: string | null
  trackingUrl?: string | null
  dispatchDate?: Date | null
  deliveryDate?: Date | null
}

export interface FulfilmentRecordRepository {
  findByIdempotencyKey(key: string): Promise<FulfilmentSnapshot | undefined>
  create(command: RequestFulfilmentCommand): Promise<FulfilmentSnapshot>
  transition(
    current: FulfilmentSnapshot,
    to: FulfilmentStatus,
    idempotencyKey: string,
    evidence?: FulfilmentEvidence,
  ): Promise<FulfilmentSnapshot>
}

export type FulfilmentEvidence = {
  shipmentReference?: string
  carrierReference?: string
  trackingReference?: string
  trackingUrl?: string
  dispatchDate?: Date
  deliveryDate?: Date
}

export interface FulfilmentPort {
  request(command: RequestFulfilmentCommand): Promise<FulfilmentSnapshot>
  transition(
    current: FulfilmentSnapshot,
    to: FulfilmentStatus,
    idempotencyKey: string,
    evidence?: FulfilmentEvidence,
  ): Promise<FulfilmentSnapshot>
}

const TRANSITIONS: Record<FulfilmentStatus, readonly FulfilmentStatus[]> = {
  REQUESTED: ["ACCEPTED", "CANCELLED", "EXCEPTION", "RECONCILIATION_REQUIRED"],
  ACCEPTED: ["ALLOCATED", "CANCELLED", "EXCEPTION", "RECONCILIATION_REQUIRED"],
  ALLOCATED: ["DISPATCHED", "EXCEPTION", "RECONCILIATION_REQUIRED"],
  DISPATCHED: ["DELIVERED", "EXCEPTION", "RECONCILIATION_REQUIRED"],
  DELIVERED: [],
  CANCELLED: [],
  EXCEPTION: ["RECONCILIATION_REQUIRED", "ACCEPTED", "ALLOCATED", "DISPATCHED"],
  RECONCILIATION_REQUIRED: ["ACCEPTED", "ALLOCATED", "DISPATCHED", "DELIVERED", "CANCELLED"],
}

const validateShipment = (command: RequestFulfilmentCommand) => {
  if (
    !(command.shipment.grossWeightKg > 0) ||
    !Number.isInteger(command.shipment.packageCount) ||
    command.shipment.packageCount <= 0
  )
    throw new Error("Shipment weight and package count must be positive")
  if (command.mode === "CROSS_BORDER") {
    const s = command.shipment
    if (s.originCountry === s.destinationCountry)
      throw new Error("Cross-border origin and destination must differ")
    if (
      !s.exporterOrganisationId ||
      !s.importerOrganisationId ||
      !s.incoterm ||
      !s.hsReferences?.length ||
      !s.complianceDecisionId
    )
      throw new Error("Cross-border fulfilment metadata is incomplete")
  }
}

export class MedusaFulfilmentAdapter implements FulfilmentPort {
  constructor(private readonly records: FulfilmentRecordRepository) {}
  async request(command: RequestFulfilmentCommand) {
    validateShipment(command)
    return (
      (await this.records.findByIdempotencyKey(command.idempotencyKey)) ??
      this.records.create(command)
    )
  }
  async transition(
    current: FulfilmentSnapshot,
    to: FulfilmentStatus,
    idempotencyKey: string,
    evidence: FulfilmentEvidence = {},
  ) {
    if (!TRANSITIONS[current.status].includes(to))
      throw new Error(`Invalid fulfilment transition ${current.status} -> ${to}`)
    if (to === "DISPATCHED" && (!evidence.shipmentReference || !evidence.dispatchDate))
      throw new Error("Authoritative shipment evidence is required for dispatch")
    if (to === "DELIVERED" && !evidence.deliveryDate)
      throw new Error("Authoritative delivery evidence is required")
    return this.records.transition(current, to, idempotencyKey, evidence)
  }
}
