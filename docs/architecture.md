# Baobab Trade Architecture

## Responsibility

Baobab Trade is the independently deployable commerce engine. Medusa owns products, catalogues, customers, carts, orders, pricing, fulfilment, payment and commerce inventory abstractions. Baobab-specific code is limited to platform context, entitlement, mappings and cross-engine integration.

## Repository relationships

| Repository | Authority | Trade obligation |
| --- | --- | --- |
| `nabhold/shared` | Organisational contracts, identifiers and engineering standards | Pin, validate and adapt published contracts; do not redefine them as canonical |
| `nabhold/baobab-cp` | Authentication-derived tenant context, lifecycle and product entitlement | Resolve context through an explicit client and fail closed |
| `nabhold/infrastructure` | Production cloud resources, networking, secrets and deployment | Publish runtime requirements; do not own production IaC here |
| `nabhold/baobab-erp` | ERP operational records | Integrate through APIs and signed events only |
| `nabhold/baobab-pulse` | Intelligence and signals | Consume APIs/events without database access |

## Request boundary

1. A client authenticates through the platform identity path.
2. Trade passes the access token to the configured Control Plane context endpoint.
3. The Control Plane returns authoritative `tenantId`, `entityId`, lifecycle state and product entitlements.
4. Trade rejects unresolved, inactive or unentitled contexts.
5. Medusa workflows execute inside that context.
6. Outbound events carry `tenant_id`, `entity_id`, correlation and causation identifiers.

Caller-supplied tenant headers are not authoritative. Legal entity remains the default tenant boundary, but `tenant_id` and canonical `entity_id` are separate immutable identifiers.

## Contracts

`contracts.lock.yaml` pins the exact Shared revision and contract paths reviewed by Trade. Local TypeScript definitions are compatibility adapters until Shared publishes tenancy and event artefacts through `@nabhold/contracts-ts`. They must then be replaced by generated imports rather than allowed to become a competing standard.

## Deployment

`docker-compose.yml` is local development tooling. `runtime/requirements.yaml` is the hand-off contract for `nabhold/infrastructure`. This repository builds the application image; Infrastructure owns production topology, managed databases, networks, domains, certificates, secret injection, scaling and rollback.

No engine shares database tables with another engine.
