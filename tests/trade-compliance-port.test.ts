import { describe, expect, it } from "vitest"
import {
  ProjectedTradeComplianceAdapter,
  ZURIBEANS_TRADE_LANES,
  type CrossBorderTransactionMetadata,
} from "../src/baobab/trade-readiness"
const transaction: CrossBorderTransactionMetadata = {
  transactionReference: "tx",
  orderReference: "ord",
  marketKey: "zuribeans_ug",
  legalSellerKey: "seller",
  exporterOrganisationId: "exporter",
  importerOrganisationId: "importer",
  originCountry: "UG",
  destinationCountry: "ZA",
  incoterm: "CIF",
  customsProcedureReference: "procedure",
  exportEligibilityReference: "eligibility",
  exporterRegistrationReference: "export-reg",
  importerRegistrationReference: "import-reg",
  lines: [
    {
      canonicalProductKey: "coffee",
      hsClassificationReference: "HS-0901.11",
      hsClassificationStatus: "VERIFIED",
      customsTariffReference: "customs-tariff",
      landedCostReference: "landed-cost",
      originCountry: "UG",
      tradeUom: "BAG",
      quantity: 1,
      netWeightKg: 60,
      grossWeightKg: 60.3,
    },
  ],
  idempotencyKey: "idem",
  correlationId: "corr",
}
const port = new ProjectedTradeComplianceAdapter(
  {
    async listPolicies(origin, destination) {
      return ZURIBEANS_TRADE_LANES.filter(
        (lane) => lane.originCountry === origin && lane.destinationCountry === destination,
      ).map((lane) => ({
        ...lane,
        permittedIncoterms: [...lane.permittedIncoterms],
        permittedTradeUoms: [...lane.permittedTradeUoms],
      }))
    },
  },
  {
    async isVerified({ canonicalProductKey, hsClassificationReference }) {
      return canonicalProductKey === "coffee" && hsClassificationReference === "HS-0901.11"
    },
  },
)
describe("TradeCompliancePort", () => {
  it("approves a complete configured lane without pretending to be a customs engine", async () => {
    const result = await port.evaluate(transaction, new Date("2026-09-09"))
    expect(result.status).toBe("APPROVED")
    expect(result.source).toContain("NOT_CUSTOMS_AUTHORITY")
  })
  it("routes unsupported terms to review", async () => {
    expect(
      (await port.evaluate({ ...transaction, incoterm: "EXW" }, new Date("2026-09-09"))).status,
    ).toBe("REVIEW_REQUIRED")
  })
  it("does not trust caller-supplied HS verification", async () => {
    const result = await port.evaluate(
      {
        ...transaction,
        lines: [{ ...transaction.lines[0], hsClassificationReference: "HS-0901.12" }],
      },
      new Date("2026-09-09"),
    )
    expect(result.reasons).toContain("HS_CLASSIFICATION_UNVERIFIED")
  })
  it("fails closed when no lane policy exists", async () => {
    await expect(
      port.evaluate(
        { ...transaction, destinationCountry: "KE", lines: [{ ...transaction.lines[0] }] },
        new Date("2026-09-09"),
      ),
    ).rejects.toThrow(/No effective/)
  })
})
