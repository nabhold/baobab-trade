# Baobab Trade Architecture

## Purpose

Baobab Trade provides commerce and trade capabilities for the Baobab Platform. It exposes APIs and events for subsidiary digital estates, Baobab ERP and Baobab Pulse while avoiding ownership of presentation, ERP or intelligence concerns.

## Boundaries

Medusa owns commerce primitives such as products, catalogues, customers, carts, orders, fulfilment, payments, pricing and inventory abstractions. Baobab extensions associate Medusa records with canonical organisational identities and publish integration events without replacing Medusa's native domain model.

## Extension points

- B2B/B2C commerce: Medusa modules, workflows and API routes.
- Products/catalogue: Medusa product APIs plus Baobab metadata links where required.
- Customers/organisations: Baobab organisational context headers and future modules linking Medusa customers to organisation identities.
- Pricing/carts/orders: Medusa workflows with additional data hooks.
- Fulfilment/payments: Medusa provider integrations.
- Inventory integration: contract-driven ERP integration; no shared tables.
- ERP integration: HTTP APIs and outbound events.
- Pulse intelligence: HTTP APIs for enrichment and decision support, not synchronous hard dependencies unless specified.
- Tenant/entity context: explicit context contract preserving tenant and legal entity as separate concepts.
- Audit/event publication: versioned event envelope and publisher abstraction.

## Runtime

The initial runtime is intentionally simple: Node.js, MedusaJS, PostgreSQL and Redis via Docker Compose. Kubernetes, Kafka, service meshes and search clusters are excluded until requirements justify them.
