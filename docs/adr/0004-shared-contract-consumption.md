# ADR 0004: Consume Canonical Contracts From Nabhold Shared

## Status

Accepted

## Decision

Baobab Trade pins the reviewed `nabhold/shared` commit and canonical contract paths in `contracts.lock.yaml`. Local TypeScript shapes are explicitly compatibility adapters, not canonical definitions.

The current `@nabhold/contracts-ts` package contains only placeholder health contracts. Trade therefore will not add a misleading package dependency until tenancy, legal-entity and event artefacts are actually published.

## Consequences

- Contract provenance is reviewable and deterministic.
- Shared remains the governance authority.
- CI can later replace adapters with generated types without changing domain ownership.
- Event-envelope publication in Shared remains an identified dependency.
