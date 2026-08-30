/**
 * These identifiers describe the canonical sources consumed by this adapter.
 * They are intentionally not presented as canonical definitions themselves.
 * Update them together with contracts.lock.yaml after compatibility review.
 */
export const CONTRACT_PROVENANCE = {
  sharedRepository: "nabhold/shared",
  sharedCommit: "498c431ea7eb76eb038975bc49e7087499d30d48",
  tenancyPath: "contracts/tenancy/tenancy.yaml",
  legalEntityRegistryPath: "contracts/legal-entity/registry.yaml",
  tenancyVersion: "1.0",
} as const
