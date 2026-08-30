# ADR 0002: Contract-Driven Integration Between Baobab Engines

## Status

Accepted

## Decision

Baobab Trade integrates with Baobab ERP, Baobab Pulse and the platform control plane using APIs, webhooks and events. It must not directly access another engine's database.

## Consequences

- Engine autonomy and independent deployment are preserved.
- Integration contracts must be versioned and tested.
- Cross-engine workflows should tolerate unavailable downstream systems where business rules permit.
