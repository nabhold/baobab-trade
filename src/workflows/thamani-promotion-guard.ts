/**
 * Registers a `validate` hook on Medusa's native `updateCartPromotionsWorkflow`
 * as a side effect of importing this file — Medusa's `WorkflowLoader` auto-
 * imports every file under `src/workflows/` on boot (workflows and their
 * hook consumers "register themselves... we only need to import them").
 *
 * This is the ONLY enforcement point for Thamani's promotion policies. An
 * earlier version of this fix put the checks in a wrapper function
 * (`applyThamaniPromotion`) that callers had to remember to use instead of
 * calling `updateCartPromotionsWorkflow` directly — a review caught that
 * this was bypassable three ways:
 *
 *   1. Medusa's own Store API route (`POST /store/carts/:id/promotions`)
 *      calls `updateCartPromotionsWorkflow` directly and never went through
 *      the wrapper at all.
 *   2. The wrapper only checked `cart.currency_code`, not the cart's Sales
 *      Channel — ZuriBeans Uganda and Thamani Uganda share the same Region
 *      and the same currency (UGX), so a ZuriBeans B2B cart could apply a
 *      Thamani consumer promotion code.
 *   3. The wrapper's currency/stacking checks ran as a separate read *before*
 *      `updateCartPromotionsWorkflow`'s own lock was acquired, so two
 *      concurrent requests for different codes on the same empty cart could
 *      both pass the check and both end up applied.
 *
 * Hooking the workflow itself fixes all three: `acquireLockStep` (keyed on
 * the cart id) runs before the `validate` hook fires, so this check is
 * serialized per-cart by Medusa's own lock — and it runs for every caller of
 * `updateCartPromotionsWorkflow`, Store API included, not just a wrapper a
 * caller has to remember to use. `cart` here is already fetched with
 * `cartFieldsForRefreshSteps`, which includes `currency_code`,
 * `sales_channel_id`, and `promotions.code` — no extra query needed for
 * those three.
 */
import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import type { ISalesChannelModuleService } from "@medusajs/framework/types"
import { Modules, PromotionActions } from "@medusajs/framework/utils"
import {
  assertPromotionCurrencyMatchesCart,
  findThamaniPromotionConfig,
  THAMANI_SALES_CHANNEL_KEY,
  ThamaniCartEstateMismatchError,
} from "../baobab/thamani/promotions/promotion-config"
import { assertExclusivePromotionStacking } from "../baobab/thamani/promotions/stacking-policy"

type GuardedCart = {
  currency_code: string
  sales_channel_id: string | null
  promotions?: readonly { code: string }[]
}

updateCartPromotionsWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  if (input.action !== PromotionActions.ADD) return

  const requestedCodes = input.promo_codes ?? []
  const thamaniPromotions = requestedCodes
    .map((code) => findThamaniPromotionConfig(code))
    .filter((config) => config !== undefined)
  if (thamaniPromotions.length === 0) return

  const typedCart = cart as GuardedCart

  const salesChannelService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
  const salesChannel = typedCart.sales_channel_id
    ? await salesChannelService.retrieveSalesChannel(typedCart.sales_channel_id)
    : null
  const isThamaniCart =
    salesChannel?.metadata?.baobab_sales_channel_key === THAMANI_SALES_CHANNEL_KEY
  if (!isThamaniCart) {
    throw new ThamaniCartEstateMismatchError(thamaniPromotions[0].code, typedCart.sales_channel_id)
  }

  // Simulate applying the requested codes one at a time against the cart's
  // already-applied codes, so two Thamani codes requested together in one
  // call are checked against each other too, not just against what was
  // already on the cart before this request.
  let appliedCodes = (typedCart.promotions ?? []).map((promotion) => promotion.code)
  for (const config of thamaniPromotions) {
    assertPromotionCurrencyMatchesCart(config, typedCart.currency_code)
    assertExclusivePromotionStacking(appliedCodes, config.code)
    appliedCodes = [...appliedCodes, config.code]
  }
})
