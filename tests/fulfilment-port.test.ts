import { describe, expect, it } from "vitest"
import {
  MedusaFulfilmentAdapter,
  type FulfilmentRecordRepository,
  type FulfilmentSnapshot,
  type RequestFulfilmentCommand,
} from "../src/baobab/fulfilment"
const command: RequestFulfilmentCommand = {
  fulfilmentReference: "ful-1",
  orderReference: "ord-1",
  organisationId: "org-1",
  marketKey: "zuribeans_ug",
  legalSellerKey: "seller-ug",
  sourceLocationKey: "UG-EBB-01",
  mode: "CROSS_BORDER",
  providerKey: "erp",
  shipment: {
    originCountry: "UG",
    destinationCountry: "ZA",
    exporterOrganisationId: "seller-ug",
    importerOrganisationId: "org-1",
    hsReferences: ["0901.11"],
    complianceDecisionId: "decision-1",
    incoterm: "CIF",
    grossWeightKg: 100,
    packageCount: 2,
  },
  idempotencyKey: "request-1",
  correlationId: "corr-1",
}
class MemoryRecords implements FulfilmentRecordRepository {
  record?: FulfilmentSnapshot
  async findByIdempotencyKey(key: string) {
    return this.record?.idempotencyKey === key ? this.record : undefined
  }
  async create(input: RequestFulfilmentCommand) {
    return (this.record = { ...input, id: "ful_1", status: "REQUESTED" })
  }
  async transition(
    current: FulfilmentSnapshot,
    to: FulfilmentSnapshot["status"],
    _key: string,
    evidence = {},
  ) {
    return (this.record = { ...current, ...evidence, status: to })
  }
}
describe("FulfilmentPort", () => {
  it("requests idempotently and requires dispatch evidence", async () => {
    const port = new MedusaFulfilmentAdapter(new MemoryRecords())
    const first = await port.request(command)
    expect((await port.request(command)).id).toBe(first.id)
    const accepted = await port.transition(first, "ACCEPTED", "accept-1")
    const allocated = await port.transition(accepted, "ALLOCATED", "allocate-1")
    await expect(port.transition(allocated, "DISPATCHED", "dispatch-1")).rejects.toThrow(/evidence/)
  })
  it("rejects incomplete cross-border trade metadata", async () => {
    const port = new MedusaFulfilmentAdapter(new MemoryRecords())
    await expect(
      port.request({ ...command, shipment: { ...command.shipment, hsReferences: [] } }),
    ).rejects.toThrow(/incomplete/)
  })
})
