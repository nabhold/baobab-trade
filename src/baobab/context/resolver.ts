import type { ControlPlaneClient } from "../control-plane/client"
import { isCanonicalEntityId, type MappingResolutionResponse } from "../contracts/canonical-mapping"
import { assertMarketTransactable, type BaobabMarket } from "../contracts/market"
import { toContextResolutionResponse, type BaobabTenantContext } from "../contracts/tenant-context"

export type CommerceContextSelection = {
  marketId: string
  digitalEstateCanonicalId: string
}

export type BaobabCommerceContext = {
  tenant: BaobabTenantContext
  market: BaobabMarket
  legalSellerCanonicalId: string
  digitalEstateCanonicalId: string
  externalReferences: {
    market: MappingResolutionResponse
    legalSeller: MappingResolutionResponse
    digitalEstate: MappingResolutionResponse
  }
}

const resolveExternalReference = (
  client: ControlPlaneClient,
  canonicalEntityId: string,
  capability: string,
  context: BaobabTenantContext,
  accessToken: string,
  correlationId: string,
) =>
  client.resolveMapping(
    {
      canonical_entity_id: canonicalEntityId,
      target_capability: capability,
      target_system: "medusa",
      context: toContextResolutionResponse(context),
    },
    accessToken,
    correlationId,
  )

/**
 * Builds the complete governed context used by later commerce workflows.
 * The selection must come from trusted route/deployment policy, never raw
 * tenant, legal-entity, or market headers supplied by a caller.
 */
export const resolveCommerceContext = async (
  client: ControlPlaneClient,
  selection: CommerceContextSelection,
  accessToken: string,
  correlationId: string,
): Promise<BaobabCommerceContext> => {
  if (!selection.marketId.trim()) {
    throw new Error("A trusted Market selection is required")
  }
  if (!isCanonicalEntityId(selection.digitalEstateCanonicalId)) {
    throw new Error("A valid Digital Estate canonical ID is required")
  }

  const tenant = await client.resolveContext(accessToken, correlationId)
  const market = assertMarketTransactable(
    await client.getMarket(selection.marketId, accessToken, correlationId),
  )

  if (market.owner_tenant_id !== tenant.tenantId) {
    throw new Error("Resolved Market is outside the authenticated tenant boundary")
  }
  if (!market.legal_entity_id || !isCanonicalEntityId(market.legal_entity_id)) {
    throw new Error("Resolved Market has no valid Legal Seller canonical ID")
  }

  const [marketReference, legalSellerReference, digitalEstateReference] = await Promise.all([
    resolveExternalReference(
      client,
      market.market_id,
      "commerce.market",
      tenant,
      accessToken,
      correlationId,
    ),
    resolveExternalReference(
      client,
      market.legal_entity_id,
      "commerce.legal-seller",
      tenant,
      accessToken,
      correlationId,
    ),
    resolveExternalReference(
      client,
      selection.digitalEstateCanonicalId,
      "commerce.digital-estate",
      tenant,
      accessToken,
      correlationId,
    ),
  ])

  return {
    tenant,
    market,
    legalSellerCanonicalId: market.legal_entity_id,
    digitalEstateCanonicalId: selection.digitalEstateCanonicalId,
    externalReferences: {
      market: marketReference,
      legalSeller: legalSellerReference,
      digitalEstate: digitalEstateReference,
    },
  }
}
