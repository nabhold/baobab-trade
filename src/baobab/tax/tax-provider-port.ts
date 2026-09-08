export type TaxTreatment = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "REVERSE_CHARGE"
export type TransactionType = "GOODS" | "SHIPPING" | "DISCOUNT" | "RETURN" | "REFUND"

export type EffectiveTaxRule = {
  ruleReference: string
  ruleVersion: string
  jurisdictionKey: string
  productTaxClassification: string
  transactionType: TransactionType
  treatment: TaxTreatment
  rateBasisPoints: number
  effectiveFrom: Date
  effectiveUntil?: Date | null
  sourceAuthority: string
  sourceRetrievedAt: Date
  legalReason?: string
}

export type TaxDeterminationRequest = {
  determinationReference: string
  marketKey: string
  legalSellerKey: string
  sellerRegistrationReference: string
  organisationId: string
  customerTaxRegistrationReference?: string
  customerTaxVerificationStatus?: "VERIFIED" | "UNVERIFIED" | "EXPIRED" | "REJECTED"
  jurisdictionKey: string
  shipFromCountry: string
  shipToCountry: string
  billToCountry: string
  productTaxClassification: string
  transactionType: TransactionType
  currency: string
  taxableBasisMinor: number
  effectiveAt: Date
  idempotencyKey: string
  correlationId: string
}

export type TaxDetermination = TaxDeterminationRequest & {
  ruleReference: string
  ruleVersion: string
  treatment: TaxTreatment
  rateBasisPoints: number
  taxAmountMinor: number
  legalReason?: string
  providerKey: string
  calculationReference: string
  sourceAuthority: string
  sourceRetrievedAt: Date
}

export interface EffectiveTaxRuleProvider {
  providerKey: string
  listRules(request: TaxDeterminationRequest): Promise<EffectiveTaxRule[]>
}

export interface TaxDeterminationPort {
  determine(request: TaxDeterminationRequest): Promise<TaxDetermination>
}

export const selectEffectiveRule = (rules: readonly EffectiveTaxRule[], effectiveAt: Date) => {
  const matches = rules.filter(
    (rule) =>
      rule.effectiveFrom <= effectiveAt &&
      (!rule.effectiveUntil || effectiveAt < rule.effectiveUntil),
  )
  if (matches.length !== 1)
    throw new Error(matches.length ? "Ambiguous effective tax rules" : "No effective tax rule")
  return matches[0]
}

export class EffectiveDatedTaxProviderAdapter implements TaxDeterminationPort {
  constructor(private readonly provider: EffectiveTaxRuleProvider) {}
  async determine(request: TaxDeterminationRequest): Promise<TaxDetermination> {
    if (!Number.isSafeInteger(request.taxableBasisMinor) || request.taxableBasisMinor < 0)
      throw new Error("Taxable basis must be a non-negative integer in minor units")
    const rule = selectEffectiveRule(await this.provider.listRules(request), request.effectiveAt)
    if (
      rule.jurisdictionKey !== request.jurisdictionKey ||
      rule.productTaxClassification !== request.productTaxClassification ||
      rule.transactionType !== request.transactionType
    )
      throw new Error("Tax provider returned a rule outside the requested context")
    if (["ZERO_RATED", "EXEMPT", "REVERSE_CHARGE"].includes(rule.treatment) && !rule.legalReason)
      throw new Error("Protected zero-tax treatment requires legal reason provenance")
    const taxAmountMinor =
      rule.treatment === "STANDARD"
        ? Math.round((request.taxableBasisMinor * rule.rateBasisPoints) / 10_000)
        : 0
    return {
      ...request,
      ruleReference: rule.ruleReference,
      ruleVersion: rule.ruleVersion,
      treatment: rule.treatment,
      rateBasisPoints: rule.rateBasisPoints,
      taxAmountMinor,
      legalReason: rule.legalReason,
      providerKey: this.provider.providerKey,
      calculationReference: `${request.determinationReference}:${rule.ruleVersion}`,
      sourceAuthority: rule.sourceAuthority,
      sourceRetrievedAt: rule.sourceRetrievedAt,
    }
  }
}
