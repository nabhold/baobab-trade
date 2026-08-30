import type { BaobabEventEnvelope } from "./event-contracts"

export interface EventPublisher {
  publish<TPayload extends Record<string, unknown>>(
    event: BaobabEventEnvelope<TPayload>,
  ): Promise<void>
}

export class NoopEventPublisher implements EventPublisher {
  public readonly published: BaobabEventEnvelope<Record<string, unknown>>[] = []

  async publish<TPayload extends Record<string, unknown>>(
    event: BaobabEventEnvelope<TPayload>,
  ): Promise<void> {
    this.published.push(event)
  }
}
