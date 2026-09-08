import { createPromotionsWorkflow } from "@medusajs/core-flows"
import type { ExecArgs, IPromotionModuleService } from "@medusajs/framework/types"
import { ApplicationMethodTargetType, Modules } from "@medusajs/framework/utils"
import { THAMANI_PROMOTIONS } from "../baobab/thamani/promotions"

/**
 * Idempotently provisions the two Gate 9 demonstration Promotions (one
 * `percentage`, one `fixed`) using Medusa's native Promotion module. Unlike
 * Gate 8's Price Lists, a Promotion only ever affects a Cart once its code
 * is explicitly applied — nothing here creates or touches a Cart; see
 * `regression-thamani-promotion-application.ts` for the disposable-database
 * fixture that proves a Promotion actually computes the right discount and
 * that the exclusive stacking policy holds.
 */
export default async function bootstrapThamaniPromotions({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve("logger")
  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

  let created = 0
  for (const config of THAMANI_PROMOTIONS) {
    const [existing] = await promotionService.listPromotions({ code: config.code })
    if (existing) continue

    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: config.code,
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: config.applicationType,
              target_type: ApplicationMethodTargetType.ITEMS,
              // "each"/"once" require an explicit max_quantity (Medusa's
              // own validation); "across" needs none and, for this gate's
              // single-item demonstration carts, computes identically.
              allocation: "across",
              value: config.value,
              currency_code: config.currencyCode,
            },
          },
        ],
      },
    })
    created += 1
  }

  logger.info(
    `Bootstrapped ${THAMANI_PROMOTIONS.length} Thamani B2C promotions (${created} newly created)`,
  )
}
