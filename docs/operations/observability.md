# Commerce observability

Gate 16 defines one correlated operational view across requests, workflows, outbox publication and reconciliation. Logs, metrics and traces use `correlation_id`; canonical events additionally preserve causation and W3C trace context.

Metrics use bounded labels (`market`, `outcome`, `dependency`). Tenant, organisation, order, customer and event IDs are prohibited as metric labels because they create unbounded series. Those identifiers belong in access-controlled structured logs and traces.

The ZuriBeans operations dashboard covers request rate/errors/latency, outbox backlog/retry/dead letters, dependency health and reconciliation. Alerts require sustained conditions to avoid flapping. A dead letter is always action-required; it is never silently counted as success.

Operational diagnostics contain status and counts, not secrets, PII, payload bodies or database details. The deployment platform owns collectors, retention, alert routing and dashboard provisioning; this repository owns instrumentation names and diagnostic semantics.
