import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, PromotionActions } from "@medusajs/framework/utils"
import { assertPromotionCurrencyMatchesCart, findThamaniPromotionConfig } from "./promotion-config"
import { assertExclusivePromotionStacking } from "./stacking-policy"

/**
 * The single call site a future checkout uses to add a Thamani promotion
 * code to a Cart. Promotions are NATIVE-IN-MEDUSA (`engine-boundaries.md`)
 * — there is no anticipated external Promotion engine to swap in behind a
 * port, unlike `ThamaniPricingDecisionPort` — but Medusa's own
 * `updateCartPromotionsWorkflow` enforces neither Market/currency scope nor
 * an exclusive-stacking policy, so both Baobab checks must run first and
 * fail closed before the workflow is ever called.
 */
export async function applyThamaniPromotion(
  container: MedusaContainer,
  cartId: string,
  code: string,
): Promise<void> {
  const config = findThamaniPromotionConfig(code)
  if (!config) throw new Error(`Unknown Thamani promotion code "${code}"`)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "currency_code", "promotions.code"],
    filters: { id: [cartId] },
  })
  const cart = data[0] as
    | { currency_code: string; promotions?: readonly { code: string }[] }
    | undefined
  if (!cart) throw new Error(`Cart "${cartId}" not found`)

  assertPromotionCurrencyMatchesCart(config, cart.currency_code)
  assertExclusivePromotionStacking(
    (cart.promotions ?? []).map((promotion) => promotion.code),
    code,
  )

  await updateCartPromotionsWorkflow(container).run({
    input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.ADD },
  })
}
