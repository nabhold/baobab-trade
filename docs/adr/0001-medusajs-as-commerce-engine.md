# ADR 0001: Use MedusaJS as the Commerce Domain Engine

## Status

Accepted

## Decision

Baobab Trade uses MedusaJS as the primary commerce engine. Custom Baobab behaviour will be implemented through Medusa-supported extension mechanisms rather than forks or parallel rewrites of commerce capabilities.

## Consequences

- Baobab Trade benefits from upstream Medusa commerce functionality.
- Custom code focuses on Baobab contracts, context, integrations and extension points.
- Divergence from upstream Medusa must be justified by explicit requirements.
