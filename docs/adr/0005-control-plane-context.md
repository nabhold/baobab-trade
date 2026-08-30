# ADR 0005: Control Plane Owns Runtime Tenant Context

## Status

Accepted

## Decision

`nabhold/baobab-cp` is the runtime authority for authentication-derived tenant context, lifecycle state and Baobab product entitlement. Trade consumes this information through the `ControlPlaneClient` interface.

Trade does not trust caller-supplied tenant headers and rejects missing, inactive, malformed or unentitled context.

## Consequences

- Tenant and legal-entity identity remain distinct.
- Control Plane API evolution is isolated behind an adapter.
- Medusa retains commerce authorization while platform entitlement remains central.
- The Control Plane must publish its context API contract in `nabhold/shared`.
