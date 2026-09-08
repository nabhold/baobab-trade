import { describe, expect, it } from "vitest"
import {
  B2B_EVENT_TYPES,
  INVENTORY_EVENT_TYPES,
  PAYMENT_EVENT_TYPES,
  FULFILMENT_EVENT_TYPES,
  TAX_EVENT_TYPES,
  TRADE_READINESS_EVENT_TYPES,
  createPlatformTradeEvent,
  createTenantTradeEvent,
  isValidCloudEvent,
  TRADE_EVENT_SOURCE,
} from "../src/baobab/events/event-contracts"
import { fromContextResolutionResponse } from "../src/baobab/contracts/tenant-context"

const tenantContext = fromContextResolutionResponse({
  tenant_id: "tn_01k4m7x9q2v6c8r3d5f1h0j4",
  entity_id: "ZURIBEANS",
  lifecycle_status: "active",
  product_id: "baobab-trade",
  entitled: true,
  entitlement_tier: null,
  cache_ttl_seconds: 15,
  resolved_at: "2026-09-01T10:00:00Z",
  correlation_id: "7c8f131b-d8ba-4d89-b60b-a187d3944074",
})

const baseInput = {
  id: "b1f2c3d4-5e6f-4789-9abc-1234567890ab",
  type: "com.nabhold.trade.order-accepted.v1",
  subject: "trade_order_123",
  time: "2026-09-05T12:00:00Z",
  dataschema: "https://contracts.nabhold.com/trade/v1/order-accepted.schema.json",
  correlationid: "c1f2c3d4-5e6f-4789-9abc-1234567890ab",
  data: { trade_order_id: "trade_order_123", currency: "UGX", total: 15000 },
}

describe("Baobab CloudEvents envelope", () => {
  it("builds a tenant-scoped event carrying the resolved tenant id", () => {
    const event = createTenantTradeEvent(tenantContext, baseInput)
    expect(event.baobabscope).toBe("tenant")
    expect(event.tenantid).toBe(tenantContext.tenantId)
    expect(event.source).toBe(TRADE_EVENT_SOURCE)
    expect(isValidCloudEvent(event)).toBe(true)
  })

  it("builds a platform event without inventing a tenant", () => {
    const event = createPlatformTradeEvent(baseInput)
    expect(event.baobabscope).toBe("platform")
    expect("tenantid" in event).toBe(false)
    expect(isValidCloudEvent(event)).toBe(true)
  })

  it("rejects a type that does not match com.nabhold.<name>.v<N>", () => {
    expect(() => createPlatformTradeEvent({ ...baseInput, type: "trade.order.accepted" })).toThrow(
      "com.nabhold.<name>.v<N>",
    )
  })

  it("rejects a tenant event whose tenantid has been stripped", () => {
    const event: Record<string, unknown> = { ...createTenantTradeEvent(tenantContext, baseInput) }
    delete event.tenantid
    expect(isValidCloudEvent(event)).toBe(false)
  })

  it("uses canonical versioned names for Gate 5 B2B facts", () => {
    for (const type of Object.values(B2B_EVENT_TYPES)) {
      const event = createTenantTradeEvent(tenantContext, { ...baseInput, type })
      expect(isValidCloudEvent(event)).toBe(true)
    }
  })

  it("uses canonical versioned names for Gate 7 inventory facts", () => {
    for (const type of Object.values(INVENTORY_EVENT_TYPES)) {
      expect(isValidCloudEvent(createTenantTradeEvent(tenantContext, { ...baseInput, type }))).toBe(
        true,
      )
    }
  })

  it("uses canonical versioned names for Gate 8 payment facts", () => {
    for (const type of Object.values(PAYMENT_EVENT_TYPES)) {
      expect(isValidCloudEvent(createTenantTradeEvent(tenantContext, { ...baseInput, type }))).toBe(
        true,
      )
    }
  })

  it("uses canonical versioned names for Gate 9 fulfilment facts", () => {
    for (const type of Object.values(FULFILMENT_EVENT_TYPES)) {
      expect(isValidCloudEvent(createTenantTradeEvent(tenantContext, { ...baseInput, type }))).toBe(
        true,
      )
    }
  })

  it("uses canonical versioned names for Gate 10 tax facts", () => {
    for (const type of Object.values(TAX_EVENT_TYPES)) {
      expect(isValidCloudEvent(createTenantTradeEvent(tenantContext, { ...baseInput, type }))).toBe(
        true,
      )
    }
  })

  it("uses canonical versioned names for Gate 11 trade-readiness facts", () => {
    for (const type of Object.values(TRADE_READINESS_EVENT_TYPES))
      expect(isValidCloudEvent(createTenantTradeEvent(tenantContext, { ...baseInput, type }))).toBe(
        true,
      )
  })
})
