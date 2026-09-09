import type { ILockingModule } from "@medusajs/framework/types"
import type EventOutboxModuleService from "../../modules/event-outbox/service"
import type { BaobabCloudEvent } from "./event-contracts"
import type { ConsumerReceipt, ConsumerReceiptRepository } from "./outbox"

const toReceipt = (value: {
  id: string
  consumer_name: string
  event_id: string
  event_type: string
  correlation_id: string
  processed_at: Date
}): ConsumerReceipt => ({
  id: value.id,
  consumerName: value.consumer_name,
  eventId: value.event_id,
  eventType: value.event_type,
  correlationId: value.correlation_id,
  processedAt: value.processed_at,
})

export class EventConsumerReceiptAdapter implements ConsumerReceiptRepository {
  constructor(
    private readonly service: EventOutboxModuleService,
    private readonly locking: ILockingModule,
  ) {}

  async find(consumerName: string, eventId: string) {
    const [receipt] = await this.service.listEventConsumerReceipts({
      consumer_name: consumerName,
      event_id: eventId,
    })
    return receipt ? toReceipt(receipt) : undefined
  }

  async processAtomically<T extends Record<string, unknown>>(
    consumerName: string,
    event: BaobabCloudEvent<T>,
    handler: (event: BaobabCloudEvent<T>) => Promise<void>,
  ) {
    return this.locking.execute(`event-consumer:${consumerName}:${event.id}`, async () => {
      const existing = await this.find(consumerName, event.id)
      if (existing) return existing
      await handler(event)
      return toReceipt(
        await this.service.createEventConsumerReceipts({
          consumer_name: consumerName,
          event_id: event.id,
          event_type: event.type,
          correlation_id: event.correlationid,
          processed_at: new Date(),
        }),
      )
    })
  }
}
