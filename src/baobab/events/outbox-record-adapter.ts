import type EventOutboxModuleService from "../../modules/event-outbox/service"
import type { BaobabCloudEvent } from "./event-contracts"
import type { OutboxRecord, OutboxRepository, OutboxStatus } from "./outbox"

type ServiceRecord = Awaited<ReturnType<EventOutboxModuleService["listEventOutboxes"]>>[number]

const toRecord = (value: ServiceRecord): OutboxRecord => ({
  id: value.id,
  eventId: value.event_id,
  eventType: value.event_type,
  subject: value.subject,
  tenantId: value.tenant_id ?? undefined,
  correlationId: value.correlation_id,
  causationId: value.causation_id ?? undefined,
  idempotencyKey: value.idempotency_key,
  envelope: value.envelope as BaobabCloudEvent,
  status: value.status as OutboxStatus,
  attemptCount: value.attempt_count,
  nextAttemptAt: value.next_attempt_at,
  publishedAt: value.published_at ?? undefined,
  leaseExpiresAt: value.lease_expires_at ?? undefined,
  lastErrorCode: value.last_error_code ?? undefined,
})

export class EventOutboxRecordAdapter implements OutboxRepository {
  constructor(private readonly service: EventOutboxModuleService) {}

  async findByIdempotencyKey(key: string) {
    const [record] = await this.service.listEventOutboxes({ idempotency_key: key })
    return record ? toRecord(record) : undefined
  }

  async create(event: BaobabCloudEvent, idempotencyKey: string) {
    const record = await this.service.createEventOutboxes({
      event_id: event.id,
      event_type: event.type,
      subject: event.subject,
      tenant_id: event.baobabscope === "tenant" ? event.tenantid : null,
      correlation_id: event.correlationid,
      causation_id: event.causationid ?? null,
      idempotency_key: idempotencyKey,
      envelope: event,
      status: "PENDING",
      attempt_count: 0,
      next_attempt_at: new Date(),
    })
    return toRecord(record)
  }

  async listDue(now: Date, limit: number) {
    const records = await this.service.listEventOutboxes({}, { take: limit * 2 })
    return records
      .filter(
        (record) =>
          ((record.status === "PENDING" || record.status === "RETRY") &&
            record.next_attempt_at <= now) ||
          (record.status === "PUBLISHING" &&
            record.lease_expires_at !== null &&
            record.lease_expires_at <= now),
      )
      .slice(0, limit)
      .map(toRecord)
  }

  async markPublishing(id: string, attemptCount: number, leaseExpiresAt: Date) {
    return this.update(id, {
      status: "PUBLISHING",
      attempt_count: attemptCount,
      lease_expires_at: leaseExpiresAt,
    })
  }

  async markPublished(id: string, publishedAt: Date) {
    return this.update(id, {
      status: "PUBLISHED",
      published_at: publishedAt,
      lease_expires_at: null,
      last_error_code: null,
    })
  }

  async markRetry(id: string, nextAttemptAt: Date, lastErrorCode: string) {
    return this.update(id, {
      status: "RETRY",
      next_attempt_at: nextAttemptAt,
      lease_expires_at: null,
      last_error_code: lastErrorCode,
    })
  }

  async markDeadLetter(id: string, lastErrorCode: string) {
    return this.update(id, {
      status: "DEAD_LETTER",
      lease_expires_at: null,
      last_error_code: lastErrorCode,
    })
  }

  private async update(
    id: string,
    values: Parameters<EventOutboxModuleService["updateEventOutboxes"]>[0] extends infer Input
      ? Omit<Input, "id">
      : never,
  ) {
    const record = await this.service.updateEventOutboxes({ id, ...values })
    return toRecord(record)
  }
}
