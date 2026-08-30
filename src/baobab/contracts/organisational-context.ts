export type BaobabOrganisationalContext = {
  tenantId?: string
  organisationId?: string
  legalEntityId: string
  businessUnitId?: string
  functionId?: string
  teamId?: string
}

export const BAOBAB_CONTEXT_HEADERS = {
  tenantId: "x-baobab-tenant-id",
  organisationId: "x-baobab-organisation-id",
  legalEntityId: "x-baobab-legal-entity-id",
  businessUnitId: "x-baobab-business-unit-id",
  functionId: "x-baobab-function-id",
  teamId: "x-baobab-team-id",
} as const

export const isValidOrganisationalContext = (
  context: Partial<BaobabOrganisationalContext>,
): context is BaobabOrganisationalContext => Boolean(context.legalEntityId)
