export type TenantLifecycleStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "decommissioning"
  | "decommissioned"

export type BaobabOrganisationalContext = {
  tenantId: string
  entityId: string
  organisationId?: string
  legalEntityId?: string
  businessUnitId?: string
  functionId?: string
  teamId?: string
  status: TenantLifecycleStatus
  productsEnabled: readonly string[]
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const isValidOrganisationalContext = (
  context: Partial<BaobabOrganisationalContext>,
): context is BaobabOrganisationalContext =>
  isNonEmptyString(context.tenantId) &&
  isNonEmptyString(context.entityId) &&
  isNonEmptyString(context.status) &&
  Array.isArray(context.productsEnabled)

export const assertTradeEntitlement = (
  context: BaobabOrganisationalContext,
): BaobabOrganisationalContext => {
  if (context.status !== "active") {
    throw new Error(`Tenant context is not active: ${context.status}`)
  }

  if (!context.productsEnabled.includes("baobab-trade")) {
    throw new Error("Tenant is not entitled to Baobab Trade")
  }

  return context
}
