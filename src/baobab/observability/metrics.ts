export const TRADE_METRICS = [
  "http_requests_total",
  "http_request_duration_ms",
  "outbox_pending",
  "outbox_retry_total",
  "outbox_dead_letter",
  "integration_reconciliation_required",
  "dependency_health",
] as const
export type TradeMetric = (typeof TRADE_METRICS)[number]
type Labels = { market?: string; outcome?: string; dependency?: string }
const labelsKey = (labels: Labels) =>
  Object.entries(labels)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join(",")
export class TradeMetrics {
  private readonly values = new Map<string, number>()
  increment(metric: TradeMetric, labels: Labels = {}, value = 1) {
    const key = `${metric}|${labelsKey(labels)}`
    this.values.set(key, (this.values.get(key) ?? 0) + value)
  }
  gauge(metric: TradeMetric, value: number, labels: Labels = {}) {
    this.values.set(`${metric}|${labelsKey(labels)}`, value)
  }
  snapshot() {
    return [...this.values.entries()].map(([key, value]) => ({ key, value }))
  }
}
