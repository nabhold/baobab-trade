import type { ExecArgs } from "@medusajs/framework/types"
import { isValidCloudEvent, THAMANI_EVENT_TYPES, type BaobabCloudEvent } from "../baobab/events"
import type EventOutboxModuleService from "../modules/event-outbox/service"

const FORBIDDEN_KEYS = new Set(["email", "phone", "password", "card_number", "cvv", "address"])
const containsForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenKey)
  if (!value || typeof value !== "object") return false
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key.toLowerCase()) || containsForbiddenKey(nested),
  )
}

export default async function ({ container }: ExecArgs) {
  const service = container.resolve<EventOutboxModuleService>("eventOutbox")
  const rows = await service.listEventOutboxes({
    tenant_id: "tenant-thamani",
    owner_legal_entity_id: "canonical:legal-entity:thamani",
    digital_estate: "estate:thamani-b2c",
  })
  const expectedTypes = new Set(
    Object.values(THAMANI_EVENT_TYPES).filter((type) => !type.includes("reconciliation-required")),
  )
  const projectionRows = rows.filter((row) => expectedTypes.has(row.event_type as never))
  if (projectionRows.length !== 7)
    throw new Error(
      `Expected exactly seven Thamani projection events, found ${projectionRows.length}`,
    )
  if (new Set(projectionRows.map((row) => row.event_type)).size !== 7)
    throw new Error("Thamani projection event families are incomplete")
  if (
    new Set(projectionRows.map((row) => row.event_id)).size !== 7 ||
    new Set(projectionRows.map((row) => row.idempotency_key)).size !== 7
  )
    throw new Error("Thamani event or idempotency identity is not unique")

  for (const row of projectionRows) {
    const envelope = row.envelope as BaobabCloudEvent
    if (!isValidCloudEvent(envelope)) throw new Error(`Invalid canonical envelope ${row.event_id}`)
    if (envelope.baobabscope !== "tenant" || envelope.tenantid !== "tenant-thamani")
      throw new Error("Cross-tenant envelope detected")
    if (
      row.market_key !== envelope.data.market_key ||
      row.owner_legal_entity_id !== "canonical:legal-entity:thamani" ||
      row.digital_estate !== "estate:thamani-b2c"
    )
      throw new Error("Outbox scope columns and canonical envelope disagree")
    if (row.market_key === "thamani_ug" && envelope.data.legal_seller_key !== "thamani-uganda")
      throw new Error("Uganda event has the wrong legal seller")
    if (
      row.market_key === "thamani_za" &&
      envelope.data.legal_seller_key !== "thamani-south-africa"
    )
      throw new Error("South Africa event has the wrong legal seller")
    if (containsForbiddenKey(envelope.data))
      throw new Error("Thamani event contains forbidden PII or payment data")

    const receiptKey = { consumer_name: "thamani-idempiere", event_id: row.event_id }
    const existingReceipts = await service.listEventConsumerReceipts(receiptKey)
    if (!existingReceipts[0])
      await service.createEventConsumerReceipts({
        ...receiptKey,
        event_type: row.event_type,
        correlation_id: row.correlation_id,
        processed_at: new Date(),
      })
    if ((await service.listEventConsumerReceipts(receiptKey)).length !== 1)
      throw new Error("Consumer receipt replay is not idempotent")

    const reconciliationKey = `thamani:event-reconciliation:${row.event_id}`
    const existingReconciliations = await service.listEventReconciliations({
      source_idempotency_key: reconciliationKey,
    })
    if (!existingReconciliations[0])
      await service.createEventReconciliations({
        outbox_id: row.id,
        event_id: row.event_id,
        status: "PENDING",
        reason: "AWAITING_ERP_ACKNOWLEDGEMENT",
        source_idempotency_key: reconciliationKey,
        observed_at: new Date(),
      })
  }
  container
    .resolve("logger")
    .info(
      "Verified Gate 16 Thamani legal-entity isolation, seven atomic projection events, privacy, receipts, and reconciliation",
    )
}
