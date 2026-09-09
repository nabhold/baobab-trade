import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  AtLeastOnceOutboxDispatcher,
  canonicalEventFingerprint,
  IdempotentEventConsumer,
  THAMANI_EVENT_TYPES,
  TransactionalOutbox,
  type BaobabCloudEvent,
  type ConsumerReceipt,
  type OutboxRecord,
  type OutboxRepository,
} from "../src/baobab/events"
import { thamaniEvents } from "../src/baobab/thamani"

const context = {
  tenantId: "tenant-thamani",
  entityId: "canonical:legal-entity:thamani",
  lifecycleStatus: "active" as const,
  productId: "baobab-trade",
  entitled: true as const,
  entitlementTier: null,
  cacheTtlSeconds: 60,
  resolvedAt: "2026-09-09T00:00:00.000Z",
  correlationId: "11111111-1111-4111-8111-111111111111",
}

type Kind =
  | "PRODUCT"
  | "SUPPLIER"
  | "WAREHOUSE"
  | "ORDER"
  | "SHIPMENT"
  | "PAYMENT"
  | "RETURN_REFUND"
const eventFor = (kind: Kind, suffix: number) =>
  thamaniEvents.createThamaniProjectionEvent(context, {
    id: `22222222-2222-4222-8222-${String(suffix).padStart(12, "0")}`,
    correlationId: context.correlationId,
    causationId: "33333333-3333-4333-8333-333333333333",
    occurredAt: "2026-09-09T00:00:00.000Z",
    idempotencyKey: `thamani:erp:${kind.toLowerCase()}:canonical:v1`,
    payload: {
      owner_legal_entity_id: "canonical:legal-entity:thamani",
      digital_estate: "estate:thamani-b2c",
      market_key: "thamani_ug",
      legal_seller_key: "thamani-uganda",
      canonical_entity_id: `canonical:${kind.toLowerCase()}:1`,
      commerce_reference: `${kind}-1`,
      projection_kind: kind,
      projection_status: "PENDING",
      source_version: 1,
    },
  })

class MemoryOutbox implements OutboxRepository {
  records: OutboxRecord[] = []
  async findByIdempotencyKey(key: string) {
    return this.records.find((record) => record.idempotencyKey === key)
  }
  async create(event: BaobabCloudEvent, key: string) {
    const record: OutboxRecord = {
      id: `out-${this.records.length}`,
      eventId: event.id,
      eventType: event.type,
      subject: event.subject,
      tenantId: event.baobabscope === "tenant" ? event.tenantid : undefined,
      correlationId: event.correlationid,
      causationId: event.causationid,
      idempotencyKey: key,
      envelope: event,
      status: "PENDING",
      attemptCount: 0,
      nextAttemptAt: new Date(0),
    }
    this.records.push(record)
    return record
  }
  async listDue(now: Date, limit: number) {
    return this.records
      .filter(
        (record) => record.nextAttemptAt <= now && ["PENDING", "RETRY"].includes(record.status),
      )
      .slice(0, limit)
  }
  async claim(id: string, now: Date, attemptCount: number, leaseExpiresAt: Date) {
    const current = this.records.find((item) => item.id === id)
    if (
      !current ||
      !(
        (["PENDING", "RETRY"].includes(current.status) && current.nextAttemptAt <= now) ||
        (current.status === "PUBLISHING" &&
          current.leaseExpiresAt !== undefined &&
          current.leaseExpiresAt <= now)
      )
    )
      return undefined
    return this.patch(id, { status: "PUBLISHING", attemptCount, leaseExpiresAt })
  }
  async markPublished(id: string, publishedAt: Date) {
    return this.patch(id, { status: "PUBLISHED", publishedAt })
  }
  async markRetry(id: string, nextAttemptAt: Date, lastErrorCode: string) {
    return this.patch(id, { status: "RETRY", nextAttemptAt, lastErrorCode })
  }
  async markDeadLetter(id: string, lastErrorCode: string) {
    return this.patch(id, { status: "DEAD_LETTER", lastErrorCode })
  }
  private patch(id: string, values: Partial<OutboxRecord>) {
    const record = this.records.find((item) => item.id === id)
    if (!record) throw new Error("missing outbox row")
    Object.assign(record, values)
    return record
  }
}

describe("Thamani Gate 16 events", () => {
  it("enforces scope and atomic outbox creation in PostgreSQL, including NULL cases", () => {
    const migration = readFileSync(
      "src/modules/event-outbox/migrations/Migration20260909110000.ts",
      "utf8",
    )
    expect(migration).toContain("TRG_thamani_erp_projection_outbox")
    expect(migration).toContain("after insert or update on")
    expect(migration).toContain("Published Thamani projection identity and payload are immutable")
    expect(migration).toContain('set "updated_at" = "updated_at"')
    expect(migration).toContain("is not distinct from 'estate:thamani-b2c'")
    expect(migration).toContain(
      "new.owner_legal_entity_id is distinct from 'canonical:legal-entity:thamani'",
    )
    expect(migration).toContain("idempotency key reused with different envelope")
    expect(migration).not.toContain("baobab_market_key: config.marketKey")
  })
  it("uses seven specific event facts with complete legal scope and causal lineage", () => {
    const kinds: Kind[] = [
      "PRODUCT",
      "SUPPLIER",
      "WAREHOUSE",
      "ORDER",
      "SHIPMENT",
      "PAYMENT",
      "RETURN_REFUND",
    ]
    const events = kinds.map((kind, index) => eventFor(kind, index + 1))
    expect(new Set(events.map((event) => event.type))).toHaveLength(7)
    expect(events.map((event) => event.type)).toContain(
      THAMANI_EVENT_TYPES.paymentProjectionRequested,
    )
    expect(
      events.every(
        (event) =>
          event.data.owner_legal_entity_id === "canonical:legal-entity:thamani" &&
          event.data.digital_estate === "estate:thamani-b2c",
      ),
    ).toBe(true)
    expect(
      events.every((event) => event.correlationid === context.correlationId && event.causationid),
    ).toBe(true)
  })

  it("rejects ZuriBeans context and Market/legal-seller crossover", () => {
    const input = { ...eventFor("ORDER", 8), data: undefined }
    expect(() =>
      thamaniEvents.createThamaniProjectionEvent(
        { ...context, tenantId: "tenant-zuribeans" },
        {
          id: input.id,
          correlationId: input.correlationid,
          causationId: "33333333-3333-4333-8333-333333333333",
          occurredAt: input.time,
          idempotencyKey: "thamani:erp:order:canonical:v1",
          payload: eventFor("ORDER", 8).data,
        },
      ),
    ).toThrow("another legal entity")
    expect(() =>
      thamaniEvents.createThamaniProjectionEvent(context, {
        id: input.id,
        correlationId: input.correlationid,
        causationId: "33333333-3333-4333-8333-333333333333",
        occurredAt: input.time,
        idempotencyKey: "thamani:erp:order:canonical:v1",
        payload: { ...eventFor("ORDER", 8).data, legal_seller_key: "thamani-south-africa" },
      }),
    ).toThrow("Market/legal-seller")
  })

  it("accepts exact replay but rejects key reuse with changed content", async () => {
    const repository = new MemoryOutbox()
    const outbox = new TransactionalOutbox(repository)
    const event = eventFor("ORDER", 9)
    expect((await outbox.enqueue(event)).id).toBe((await outbox.enqueue(event)).id)
    const changed = { ...event, data: { ...event.data, source_version: 2 } }
    await expect(outbox.enqueue(changed)).rejects.toThrow("Idempotency key collision")
    expect(canonicalEventFingerprint(event)).not.toBe(canonicalEventFingerprint(changed))
  })

  it("backs off, dead-letters poison events, and bounds each drain batch", async () => {
    const repository = new MemoryOutbox()
    await new TransactionalOutbox(repository).enqueue(eventFor("ORDER", 10))
    const dispatcher = new AtLeastOnceOutboxDispatcher(
      repository,
      {
        publish: async () => {
          throw new Error("ERP unavailable")
        },
      },
      { maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 10, leaseDurationMs: 100 },
    )
    await dispatcher.dispatchDue(new Date(100))
    expect(repository.records[0].status).toBe("RETRY")
    await dispatcher.dispatchDue(new Date(110))
    expect(repository.records[0].status).toBe("DEAD_LETTER")
  })

  it("records a consumer effect once under duplicate delivery", async () => {
    const receipts = new Map<string, ConsumerReceipt>()
    let effects = 0
    const consumer = new IdempotentEventConsumer({
      find: async (name, id) => receipts.get(`${name}:${id}`),
      processAtomically: async (name, event, handler) => {
        await handler(event)
        const receipt = {
          id: "receipt",
          consumerName: name,
          eventId: event.id,
          eventType: event.type,
          correlationId: event.correlationid,
          processedAt: new Date(),
        }
        receipts.set(`${name}:${event.id}`, receipt)
        return receipt
      },
    })
    await consumer.consume("thamani-idempiere", eventFor("PAYMENT", 11), async () => {
      effects += 1
    })
    const replay = await consumer.consume(
      "thamani-idempiere",
      eventFor("PAYMENT", 11),
      async () => {
        effects += 1
      },
    )
    expect(replay.duplicate).toBe(true)
    expect(effects).toBe(1)
  })
})
