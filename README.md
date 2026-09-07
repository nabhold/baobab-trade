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

Prerequisites: Node.js 24, Git, PostgreSQL and Redis.

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

## Markets

ZuriBeans launches in Uganda and South Africa as two first-class Baobab
Markets on one codebase. See `docs/architecture/market-model.md` for how
Market differs from Medusa Region, and run `npm run bootstrap:market` to
idempotently provision each Market's Region, Sales Channel and Stock
Location.

## ZuriBeans B2B

Gate 5 adds the typed `b2b` Medusa module for organisations, buyer memberships,
organisation-local roles, purchase approvals, PO references, commercial terms,
delivery sites, and tax registrations. Run `npm run verify:b2b-module` after
migrations. The complete authority and persistence model is documented in
`docs/architecture/zuribeans-b2b-commerce.md`.

Gate 6 provisions the focused ten-product wholesale catalogue and independent
UGX/ZAR standard and volume prices with `npm run bootstrap:catalogue`. Trade
profiles, Market eligibility, MOQ/order multiples, and protected contract-price
records remain typed B2B data; see `docs/architecture/zuribeans-catalogue-pricing.md`.

## Repository layout

- `src/api` — Medusa API extensions.
- `src/baobab/contracts` — temporary compatibility adapters with explicit Shared provenance.
- `src/baobab/control-plane` — Control Plane client boundary.
- `src/baobab/events` — versioned cross-engine envelopes and publishers.
- `src/baobab/market` — Market configuration and engine-native mapping helpers.
- `src/baobab/b2b` — server-side B2B purchase and approval policy.
- `src/baobab/catalogue` — governed ZuriBeans product and bootstrap price definitions.
- `src/baobab/pricing` — replaceable pricing decision boundary.
- `src/modules/b2b` — durable B2B Medusa module, models, service, and migrations.
- `src/scripts/bootstrap-market.ts` — idempotent per-Market Medusa provisioning.
- `runtime` — infrastructure-facing runtime requirements.
- `docs` — architecture and decisions.

## Secrets

Never commit credentials. Production injects database, Redis, Medusa signing and webhook secrets through facilities owned by `nabhold/infrastructure`. Access tokens are forwarded only to the configured Control Plane context endpoint and must never be logged.

## Foundation 4

Codespaces uses `ghcr.io/nabhold/baobab-dev:1.2.6`. The reusable, SHA-pinned
Foundation gate validates the environment contract and reproducible inputs and
scans source, dependencies, secrets, configuration, and the Trade image.
