# Baobab Trade

Baobab Trade is the independently deployable Trade Engine of the Baobab Platform. It is a headless B2B/B2C commerce engine built on MedusaJS; Medusa remains the primary commerce domain engine and Baobab-specific behaviour is added through Medusa extensions, modules, workflows, subscribers, API routes and configuration.

## Local development

Prerequisites follow Medusa's current guidance: Node.js 20.19+ or 22.12+, Git and PostgreSQL. Docker Compose is provided for a fully local stack.

```bash
cp .env.example .env
npm ci
npm run dev
```

Or run the full stack:

```bash
docker compose up --build
```

Health endpoints:

- `GET /health` for liveness.
- `GET /readiness` for readiness.

## Repository layout

- `medusa-config.ts` — upstream Medusa application configuration.
- `src/api` — custom Medusa API routes for platform-facing capabilities.
- `src/baobab` — Baobab Trade extensions, contracts, context, logging and integration foundations.
- `docs` — architecture documentation and ADRs.
- `tests` — unit and contract tests.
- `.github/workflows` — CI foundation.

## Integration principles

Baobab Trade integrates with Baobab ERP and Baobab Pulse through explicit API and event contracts only. It must not read or write another engine's database. Legal entity is the default tenant boundary, but tenant, organisation, legal entity, business unit, function, team, user, membership, role and permission remain distinct platform concepts.

## Secrets

Never commit real secrets. Use `.env.example` only for documented variable names and local placeholders. Production deployments must inject `JWT_SECRET`, `COOKIE_SECRET`, database credentials, Redis credentials and webhook shared secrets from the deployment secret manager.
