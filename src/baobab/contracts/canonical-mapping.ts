/**
 * Mirrors the subset of nabhold/shared
 * contracts/control-plane/v1/canonical-mapping.schema.json that Trade needs
 * to describe its own engine-native projections of canonical entities
 * (Markets, Legal Entities) onto Medusa records (Region, Sales Channel,
 * Stock Location). The Control Plane remains the mapping authority; Trade
 * does not write to the canonical mapping registry in this phase.
 */
export type MappingType =
  | "IDENTITY"
  | "REPRESENTATION"
  | "ORGANISATIONAL"
  | "CONTENT"
  | "COMMERCE"
  | "ERP"
  | "CATALOGUE"
  | "PRICING"
  | "TAX"
  | "WAREHOUSE"
  | "FULFILMENT"
  | "PAYMENT"
  | "DOMAIN"
  | "LOCALE"
  | "CURRENCY"
  | "CHANNEL"
  | "CAPABILITY"
  | "INTEGRATION"
  | "MIGRATION"
  | "ALIAS"
  | "SUCCESSOR"

export type ExternalReference = {
  system_namespace: string
  engine_id: string
  engine_instance_id?: string | null
  native_entity_type: string
  native_id: string
  native_key?: string | null
  source_authority: "engine" | "external-sync" | "manual-import" | "reconciliation"
  status: "active" | "unverified" | "suspect" | "orphan" | "archived"
}

/**
 * A breadcrumb Trade attaches to a Medusa record's own `metadata` so a
 * bootstrap run can detect what it already provisioned (idempotency) and so
 * a reconciliation job can find it later. This is deliberately NOT the
 * canonical mapping record itself (that is minted and owned by Control
 * Plane once published) — see docs/architecture/market-model.md.
 */
export type EngineNativeMappingTag = {
  baobab_mapping_type: Extract<MappingType, "COMMERCE" | "CHANNEL" | "WAREHOUSE">
  baobab_market_key: string
  baobab_mapping_authority: "trade-engine-native-pending-control-plane-registration"
}

export const buildEngineNativeMappingTag = (
  mappingType: EngineNativeMappingTag["baobab_mapping_type"],
  marketKey: string,
): EngineNativeMappingTag => ({
  baobab_mapping_type: mappingType,
  baobab_market_key: marketKey,
  baobab_mapping_authority: "trade-engine-native-pending-control-plane-registration",
})

export const readMarketKeyFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): string | null => {
  const value = metadata?.baobab_market_key
  return typeof value === "string" && value.trim().length > 0 ? value : null
}
