# Baobab Trade

Baobab Trade is the independently deployable Trade Engine of the Baobab Platform. It is a headless B2B/B2C commerce engine built on MedusaJS. Medusa remains the commerce system; Baobab-specific code adds only organisational context, entitlement and explicit integrations.

## Architectural boundaries

- `nabhold/shared` owns canonical organisational contracts and engineering standards.
- `nabhold/baobab-cp` resolves authenticated tenant context, lifecycle and product entitlement.
- `nabhold/infrastructure` owns production infrastructure and deployment orchestration.
- Baobab ERP and Pulse are reached through APIs and signed events, never shared databases.
- Subsidiary frontends remain in their own digital-estate repositories.

Contract provenance is pinned in `contracts.lock.yaml`. Runtime needs are declared in `runtime/requirements.yaml`.

## Local development

Prerequisites follow Medusa guidance: Node.js 20.19+ or 22.12+, Git, PostgreSQL and Redis.

```bash
cp .env.example .env
npm install
npm run dev
```

Or use the local development stack:

```bash
docker compose up --build
```

The Compose file is deliberately local-only; it is not the production deployment model.

## Request context

Trade accepts commerce requests only after authoritative context resolution through the Control Plane adapter. A valid context contains distinct `tenantId` and canonical `entityId` values, an active lifecycle status and the `baobab-trade` product entitlement. Unresolved context fails closed.

## Health

- `GET /health` — process liveness.
- `GET /readiness` — configuration readiness, including Control Plane configuration.

## Repository layout

- `src/api` — Medusa API extensions.
- `src/baobab/contracts` — temporary compatibility adapters with explicit Shared provenance.
- `src/baobab/control-plane` — Control Plane client boundary.
- `src/baobab/events` — versioned cross-engine envelopes and publishers.
- `runtime` — infrastructure-facing runtime requirements.
- `docs` — architecture and decisions.

## Secrets

Never commit credentials. Production injects database, Redis, Medusa signing and webhook secrets through facilities owned by `nabhold/infrastructure`. Access tokens are forwarded only to the configured Control Plane context endpoint and must never be logged.

## Foundation 4

Codespaces uses `ghcr.io/nabhold/baobab-dev:1.2.6`. The reusable, SHA-pinned
Foundation gate validates the environment contract and reproducible inputs and
scans source, dependencies, secrets, configuration, and the Trade image.
