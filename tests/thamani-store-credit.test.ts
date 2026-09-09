import { describe, expect, it } from "vitest"
import {
  buildThamaniStoreCreditOrderInput,
  createThamaniStoreCreditErpProjection,
  THAMANI_STORE_CREDIT_REASON_CONFIG,
} from "../src/baobab/thamani/store-credit"

describe("Thamani Gate 17 store credit", () => {
  it("gives every reason a distinct, non-revenue-reversing ERP consequence except REFUND", () => {
    expect(THAMANI_STORE_CREDIT_REASON_CONFIG.REFUND.erpFinancialConsequence).toBe("AR_CREDIT_MEMO")
    expect(THAMANI_STORE_CREDIT_REASON_CONFIG.SERVICE.erpFinancialConsequence).toBe(
      "CUSTOMER_SERVICE_EXPENSE",
    )
    expect(THAMANI_STORE_CREDIT_REASON_CONFIG.PROMOTIONAL.erpFinancialConsequence).toBe(
      "MARKETING_EXPENSE",
    )
    const consequences = Object.values(THAMANI_STORE_CREDIT_REASON_CONFIG).map(
      (config) => config.erpFinancialConsequence,
    )
    expect(new Set(consequences).size).toBe(3)
  })

  it("rejects a non-positive amount for every reason", () => {
    for (const reason of ["REFUND", "SERVICE", "PROMOTIONAL"] as const) {
      expect(() =>
        buildThamaniStoreCreditOrderInput({
          orderId: "order_1",
          amountMinor: 0,
          reason,
          referenceId: "ref_1",
          serviceJustification: "note",
        }),
      ).toThrow("positive integer")
      expect(() =>
        buildThamaniStoreCreditOrderInput({
          orderId: "order_1",
          amountMinor: -100,
          reason,
          referenceId: "ref_1",
          serviceJustification: "note",
        }),
      ).toThrow("positive integer")
    }
  })

  it("requires REFUND and PROMOTIONAL to trace back to a source referenceId", () => {
    expect(() =>
      buildThamaniStoreCreditOrderInput({ orderId: "order_1", amountMinor: 100, reason: "REFUND" }),
    ).toThrow("referenceId")
    expect(() =>
      buildThamaniStoreCreditOrderInput({
        orderId: "order_1",
        amountMinor: 100,
        reason: "PROMOTIONAL",
      }),
    ).toThrow("referenceId")
    expect(
      buildThamaniStoreCreditOrderInput({
        orderId: "order_1",
        amountMinor: 100,
        reason: "REFUND",
        referenceId: "return_1",
      }).reference_id,
    ).toBe("return_1")
  })

  it("lets SERVICE substitute a justification for a referenceId, but requires one of them", () => {
    expect(() =>
      buildThamaniStoreCreditOrderInput({
        orderId: "order_1",
        amountMinor: 100,
        reason: "SERVICE",
      }),
    ).toThrow("serviceJustification")
    const withJustification = buildThamaniStoreCreditOrderInput({
      orderId: "order_1",
      amountMinor: 100,
      reason: "SERVICE",
      serviceJustification: "Late delivery goodwill credit",
    })
    expect(withJustification.reference_id).toBeNull()
    expect(withJustification.metadata.service_justification).toBe("Late delivery goodwill credit")
    const withReferenceId = buildThamaniStoreCreditOrderInput({
      orderId: "order_1",
      amountMinor: 100,
      reason: "SERVICE",
      referenceId: "case_42",
    })
    expect(withReferenceId.reference_id).toBe("case_42")
  })

  it("tags every credit line's metadata with its own reason, not a shared default", () => {
    const refund = buildThamaniStoreCreditOrderInput({
      orderId: "order_1",
      amountMinor: 100,
      reason: "REFUND",
      referenceId: "return_1",
    })
    const promotional = buildThamaniStoreCreditOrderInput({
      orderId: "order_1",
      amountMinor: 100,
      reason: "PROMOTIONAL",
      referenceId: "policy_1",
    })
    expect(refund.metadata.baobab_store_credit_reason).toBe("REFUND")
    expect(promotional.metadata.baobab_store_credit_reason).toBe("PROMOTIONAL")
    expect(refund.reference).not.toBe(promotional.reference)
  })

  it("derives the ERP financial consequence from the reason rather than accepting a caller value", () => {
    const command = createThamaniStoreCreditErpProjection({
      reason: "SERVICE",
      orderId: "order_1",
      creditLineId: "ordcrl_1",
      legalSellerKey: "thamani-uganda",
      marketKey: "thamani_ug",
      amountMinor: 500,
      currency: "UGX",
      sourceVersion: 1,
      correlationId: "corr",
    })
    expect(command.kind).toBe("CREDIT_LINE")
    expect(command.payload.erp_financial_consequence).toBe("CUSTOMER_SERVICE_EXPENSE")
    expect(command.payload.reason).toBe("SERVICE")
  })

  it("rejects cross-Market legal sellers, matching every other Thamani ERP projection", () => {
    expect(() =>
      createThamaniStoreCreditErpProjection({
        reason: "REFUND",
        orderId: "order_1",
        creditLineId: "ordcrl_1",
        legalSellerKey: "thamani-south-africa",
        marketKey: "thamani_ug",
        amountMinor: 500,
        currency: "UGX",
        sourceVersion: 1,
        correlationId: "corr",
      }),
    ).toThrow("boundary")
  })
})
