# Baobab Commerce Context

Gate 3 establishes the governed context boundary that every later commerce
workflow must cross.

## Resolution

1. Trade resolves the authenticated tenant and product entitlement through
   `POST /v1/context/resolve`.
2. Trade reads the selected Market through `GET /v1/markets/{market_id}`.
3. Trade verifies that the Market is active and owned by the resolved tenant.
4. The Market supplies the Legal Seller canonical ID. Trade does not infer it
   from country, currency, Medusa Region, or the tenant ID.
5. A trusted route or deployment policy supplies the Digital Estate canonical
   ID. Raw caller-supplied tenancy and Market headers are not authoritative.
6. Trade resolves the Market, Legal Seller, and Digital Estate canonical IDs to
   Medusa ExternalReference IDs through `POST /v1/resolution/mappings`.

The result is immutable request context:

```text
Authenticated tenant
  + active owned Market
  + explicit Legal Seller
  + explicit Digital Estate
  + active Control Plane mappings
  = BaobabCommerceContext
```

## Isolation invariants

- A Market owned by another tenant is rejected before mapping resolution.
- An inactive Market cannot enter a transactional workflow.
- Missing Legal Seller or Digital Estate canonical identity fails closed.
- Mapping responses must be `ACTIVE`, contain a Control Plane-issued
  `external_reference_id`, and repeat the requested canonical entity ID.
- Trade stores or propagates canonical and ExternalReference IDs; it does not
  mint replacement canonical mappings.
- Tenant, Legal Seller, Market, Digital Estate, Medusa Region, and Sales
  Channel remain distinct concepts even when their initial data correlates.

## Current Control Plane boundary

The pinned shared v1 contract publishes tenant-context, Market-read, and
mapping-resolution operations. It does not publish standalone Digital Estate
or ExternalReference read operations. Gate 3 therefore consumes their
canonical IDs and mapping-resolution references without creating local shadow
registries. Rich resource hydration belongs in a compatible Control Plane and
shared-contract change.
