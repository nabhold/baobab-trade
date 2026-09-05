# Market model: Baobab Market vs. Medusa Region

Governing decision: `docs/adr/ADR-0010_ MedusaJS Commerce Market, Region,
Currency, Sales Channel and Legal Seller Model.md`.

## The distinction

A **Baobab Market** is a Control Plane canonical concept: a governed
commercial operating context (`nabhold/shared`
`contracts/control-plane/v1/market.schema.json`). It carries a country/
currency policy, a legal seller, tax/pricing/catalogue/payment/fulfilment
policy references, and a lifecycle (`DRAFT → VALIDATED → ACTIVE → …`).

A **Medusa Region** is Trade's local commerce-execution mechanism: a
currency, a set of countries, payment providers and tax behaviour. Trade
provisions one Region (plus a Sales Channel and Stock Location) as its
projection of a Market. The two are never assumed equal:

- one Market may span multiple countries or Regions;
- Country, Currency, Sales Channel, Digital Estate, Legal Seller and
  EngineInstance are each explicitly **not** synonyms for Market
  (ADR-0010 §95-§101).

Trade reads Market configuration from the Control Plane
(`GET /v1/markets/{market_id}` — `HttpControlPlaneClient.getMarket`) and never
authors or redefines it locally.

## Current state: no Market instance exists yet

`nabhold/shared` `contracts/legal-entity/registry.yaml` records the
`ZURIBEANS` legal entity with `markets: []`, explicitly deferred until the
canonical Market, Region and domain contract is approved and a market is
registered through `POST /v1/markets`. That has not happened for Uganda or
South Africa.

This repository therefore drives its own Medusa-side provisioning from
**candidate market keys** defined in `src/baobab/market/market-config.ts`
(`zuribeans_ug`, `zuribeans_za`) rather than a `market_id` it would otherwise
have to invent. Once Control Plane registers and activates the real Markets,
the resulting `market_id` must be reconciled against the local
`baobab_market_key` breadcrumb (see below) — this repository does not do that
reconciliation automatically yet.

## Engine-native mapping breadcrumb (not the canonical mapping)

`src/baobab/market/mapping.ts` tags each Medusa Region, Sales Channel and
Stock Location's own `metadata` with `{ baobab_market_key, baobab_mapping_authority: "trade-engine-native-pending-control-plane-registration" }`.
This is deliberately **not** the canonical mapping record described in
`contracts/control-plane/v1/canonical-mapping.schema.json` — that record is
minted and owned by Control Plane. The local tag exists only so
`npm run bootstrap:market` is idempotent (safe to re-run) and so a future
reconciliation job can find what Trade already provisioned.

## Uganda and South Africa launch configuration

|                        | Uganda                                      | South Africa                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------- |
| Market key (candidate) | `zuribeans_ug`                              | `zuribeans_za`                              |
| Country                | UG                                          | ZA                                          |
| Default currency       | UGX                                         | ZAR                                         |
| Sales Channel          | ZuriBeans Uganda                            | ZuriBeans South Africa                      |
| Stock Location         | development placeholder, Kampala            | development placeholder, Johannesburg       |
| Payment                | `NATIVE`, Medusa system default placeholder | `NATIVE`, Medusa system default placeholder |
| Fulfilment             | `NATIVE`, Medusa manual placeholder         | `NATIVE`, Medusa manual placeholder         |
| Tax                    | `NATIVE` (no provider selected)             | `NATIVE` (no provider selected)             |

No production payment, fulfilment or tax provider has been approved for
either Market — see Outstanding Decisions in `docs/architecture.md`. Both
Markets are configured symmetrically in shape but independently in value:
adding a real provider to one does not require touching the other.

## Running the bootstrap

```bash
npm run bootstrap:market            # provisions both launch Markets
medusa exec ./src/scripts/bootstrap-market.ts zuribeans_ug   # one Market only
```

The script is idempotent: re-running it detects already-provisioned records
by the mapping breadcrumb and leaves them untouched. It provisions Medusa's
Region, Sales Channel, Stock Location and Store currency support; it does
**not** install or configure a payment/fulfilment/tax provider package.
