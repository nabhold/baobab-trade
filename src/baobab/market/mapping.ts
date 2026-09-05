import {
  buildEngineNativeMappingTag,
  readMarketKeyFromMetadata,
  type EngineNativeMappingTag,
} from "../contracts/canonical-mapping"

type HasMetadata = { metadata?: Record<string, unknown> | null }

/**
 * Finds a previously-provisioned Medusa record by the market-key breadcrumb
 * this bootstrap leaves in `metadata`. Used to make Market provisioning
 * idempotent (ADR-0010 §51-§52) without a published Control Plane mapping
 * write API to register against instead.
 */
export const findByMarketKey = <T extends HasMetadata>(
  records: readonly T[],
  marketKey: string,
): T | undefined =>
  records.find((record) => readMarketKeyFromMetadata(record.metadata) === marketKey)

export const regionMappingTag = (marketKey: string): EngineNativeMappingTag =>
  buildEngineNativeMappingTag("COMMERCE", marketKey)

export const salesChannelMappingTag = (marketKey: string): EngineNativeMappingTag =>
  buildEngineNativeMappingTag("CHANNEL", marketKey)

export const stockLocationMappingTag = (marketKey: string): EngineNativeMappingTag =>
  buildEngineNativeMappingTag("WAREHOUSE", marketKey)
