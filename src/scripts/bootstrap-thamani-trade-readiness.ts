import type { ExecArgs } from "@medusajs/framework/types"
import { THAMANI_TRADE_PROFILES } from "../baobab/thamani/trade-readiness"
import type TradeReadinessModuleService from "../modules/trade-readiness/service"

export default async function ({ container }: ExecArgs) {
  const service = container.resolve<TradeReadinessModuleService>("tradeReadiness")
  for (const profile of THAMANI_TRADE_PROFILES) {
    const [existing] = await service.listThamaniTradeProfiles({
      canonical_product_key: profile.canonicalProductKey,
      market_key: profile.marketKey,
    })
    if (!existing)
      await service.createThamaniTradeProfiles({
        canonical_product_key: profile.canonicalProductKey,
        market_key: profile.marketKey,
        origin_country: profile.originCountry,
        hs_classification_reference: profile.hsClassificationReference,
        hs_classification_status: profile.hsClassificationStatus,
        customs_tariff_reference: profile.customsTariffReference,
        landed_cost_reference: profile.landedCostReference,
        source: profile.source,
      })
  }
  container
    .resolve("logger")
    .info("Bootstrapped Thamani Gate 14 fail-closed product trade profiles")
}
