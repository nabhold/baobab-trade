import { isValidCloudEvent, type BaobabCloudEvent } from "./event-contracts"

export interface EventPublisher {
  publish<TData extends Record<string, unknown>>(event: BaobabCloudEvent<TData>): Promise<void>
}

export class NoopEventPublisher implements EventPublisher {
  public readonly published: BaobabCloudEvent<Record<string, unknown>>[] = []

  async publish<TData extends Record<string, unknown>>(
    event: BaobabCloudEvent<TData>,
  ): Promise<void> {
    const eventType = event.type
    if (!isValidCloudEvent(event)) {
      throw new Error(`Refusing to publish a non-conforming event: ${eventType}`)
    }
    this.published.push(event)
  }
}
