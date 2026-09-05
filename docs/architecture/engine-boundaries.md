# Engine boundaries

Baobab is a platform of specialised engines. This table distinguishes who
holds authority **today** from where that capability could be extracted to a
dedicated engine **later**. Extraction happens only when independent
authority, scale, complexity or multiple consumers justify a new engine — not
merely because the target architecture diagram has a box for it.

| Capability                                        | Current authority           | Status                                                                      | Future extractable engine          |
| ------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| Commerce Order                                    | Medusa (`baobab-trade`)     | NATIVE-IN-MEDUSA                                                            | Baobab Order Engine / DOM          |
| Commerce Product & catalogue                      | Medusa                      | NATIVE-IN-MEDUSA                                                            | — (stays with Commerce Engine)     |
| Commerce Pricing                                  | Medusa                      | NATIVE-IN-MEDUSA                                                            | Pricing Engine                     |
| Promotions                                        | Medusa                      | NATIVE-IN-MEDUSA                                                            | Pricing Engine                     |
| Commerce availability / reservation               | Medusa                      | NATIVE-IN-MEDUSA                                                            | Inventory Engine                   |
| Payment orchestration                             | Medusa                      | NATIVE-IN-MEDUSA (placeholder providers only, none approved)                | Payments Engine                    |
| Commerce fulfilment                               | Medusa                      | NATIVE-IN-MEDUSA (placeholder providers only, none approved)                | Fulfilment Engine                  |
| Tax calculation                                   | Medusa / provider           | NATIVE-IN-MEDUSA (no provider selected)                                     | Tax capability / external provider |
| Physical inventory                                | iDempiere (`baobab-erp`)    | EXTERNAL, not yet integrated                                                | Inventory Engine / WMS             |
| Accounting                                        | iDempiere                   | EXTERNAL, not yet integrated                                                | Remains ERP                        |
| ERP Business Partner                              | iDempiere                   | EXTERNAL, not yet integrated                                                | Remains ERP                        |
| Editorial content                                 | Payload CMS                 | EXTERNAL, not yet integrated                                                | Remains Payload                    |
| Platform Context (Tenant, lifecycle, entitlement) | Control Plane (`baobab-cp`) | ACTIVE — `HttpControlPlaneClient.resolveContext`                            | Remains Control Plane              |
| Baobab Market registry                            | Control Plane               | PLANNED — schema published, no Market instance registered yet for ZuriBeans | Remains Control Plane              |
| Canonical mapping / ExternalReference             | Control Plane               | PLANNED — Trade only writes a local engine-native breadcrumb today          | Remains Control Plane              |
| Trade compliance                                  | —                           | PLANNED, no integration point built yet                                     | Trade Compliance Engine            |
| Ledger evidence                                   | —                           | PLANNED, no integration point built yet                                     | Ledger Engine                      |
| Intelligence / signals                            | `baobab-pulse`              | PLANNED, no event consumer built yet                                        | Remains Pulse                      |

## Reading the "Status" column

- **ACTIVE** — implemented and exercised by this repository today.
- **NATIVE-IN-MEDUSA** — Medusa's own module is the current implementation;
  Trade has not built a capability port around it because there is no second
  consumer or competing implementation yet to justify one (task brief §17,
  §66).
- **PLANNED** — a boundary this repository intends to integrate with, but has
  not yet, because either the dependency isn't ready (no Market registered,
  no ERP contract exercised) or nothing in this codebase needs it yet (no
  commerce order flow exists to publish `commerce.order.placed` from).
- **EXTERNAL** — owned by another repository/engine; Trade must reach it only
  through APIs, signed events and `ExternalReference`, never a shared
  database (task brief §28, `docs/architecture.md` "No engine shares database
  tables with another engine").

## What this repository does not do

Per the engineering principle in the task brief: this repository does not
scaffold empty deployable services for Order, Inventory, Pricing, Payments,
Fulfilment or Compliance. Where a future engine is anticipated, the boundary
is a typed contract or client (`src/baobab/contracts/`,
`src/baobab/control-plane/client.ts`) and, where a real cross-engine
consequence exists, an event (`src/baobab/events/`) — not a running service.
