# Thamani B2C Fulfilment (Gate 12)

Thamani supports local delivery, parcel shipment and customer pickup through a provider-neutral Medusa fulfilment boundary. Live courier adapters remain disabled until contracts, credentials, service areas, rates, webhook security and operational ownership are approved.

```mermaid
flowchart TD
  O[Retail order] --> A[Line allocations]
  A --> L1[Location A]
  A --> L2[Location B]
  L1 --> S[Parcel or delivery]
  L2 --> S
  S --> T[Tracking]
  T --> R[Return and disposition]
```

An order line may be allocated across several Thamani locations, but the allocation set must cover each line exactly: no shortage, overshipment or unknown line. This preserves partial-fulfilment execution without losing order-level accountability.

Fulfilment requires exactly one party reference: a B2B organisation or a B2C customer. Dispatch and delivery transitions require authoritative evidence. Tracking references are operational projections, not invented delivery proof.

Returns are quantity-bounded, reason-coded and assigned an explicit disposition: restock, quarantine, dispose or inspect. A return does not itself authorize a refund; Gate 11's payment boundary owns that consequence.

Run `npm run bootstrap:thamani-fulfilment` after migrations and `npm run verify:thamani-fulfilment` in an integration environment.
