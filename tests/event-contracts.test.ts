import { describe, expect, it } from "vitest"
import { createTradeEvent } from "../src/baobab/events/event-contracts"

describe("Baobab event envelope", () => {
  it("propagates authoritative tenant and entity context", () => {
    const event = createTradeEvent(
      {
        tenantId: "01K4TENANT",
        entityId: "THAMANI-GLOBAL",
        status: "active",
        productsEnabled: ["baobab-trade"],
      },
      {
        event_id: "01K4EVENT",
        event_type: "trade.order.accepted",
        occurred_at: "2026-08-30T12:00:00Z",
        correlation_id: "01K4CORRELATION",
        payload: { trade_order_id: "order_123" },
      },
    )

    expect(event.tenant_id).toBe("01K4TENANT")
    expect(event.entity_id).toBe("THAMANI-GLOBAL")
    expect(event.source).toBe("baobab-trade")
  })
})
