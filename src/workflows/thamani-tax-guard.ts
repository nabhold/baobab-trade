/**
 * Registers a `setTaxLineContext` hook on Medusa's native
 * `updateTaxLinesWorkflow` and `upsertTaxLinesWorkflow` as a side effect of
 * importing this file — Medusa's `WorkflowLoader` auto-imports every file
 * under `src/workflows/` on boot, the same mechanism
 * `thamani-promotion-guard.ts` relies on.
 *
 * `refreshCartItemsWorkflow` (core-flows) invokes both of these workflows
 * directly, and it itself runs on every real cart mutation (add-to-cart,
 * update-line-item, etc.) — so this hook is a genuine, real-checkout
 * integration point, not an obscure or test-only one.
 *
 * `setTaxLineContext` can only inject `additional_context` for the tax
 * provider to read; it cannot override the computed rate itself. The actual
 * rate computation happens in `../modules/thamani-tax-provider/service.ts`
 * — a Tax Provider whose own container is module-isolated and so cannot
 * reach the `thamani` or Sales Channel services itself. This hook does that
 * cross-module work (it runs with full app-container access, like any
 * workflow hook) and hands the provider only what it needs: whether this is
 * a Thamani cart, and each line item's `product_tax_category`.
 */
import { updateTaxLinesWorkflow, upsertTaxLinesWorkflow } from "@medusajs/core-flows"
import type {
  ISalesChannelModuleService,
  MedusaContainer,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { THAMANI_DIGITAL_ESTATE_CANONICAL_ID } from "../baobab/context/digital-estates"
import { THAMANI_SALES_CHANNEL_KEY } from "../baobab/thamani/promotions/promotion-config"
import type { ThamaniTaxLineContext } from "../modules/thamani-tax-provider/service"
import type ThamaniModuleService from "../modules/thamani/service"

type GuardedCart = { id: string; sales_channel_id?: string | null }
type GuardedItem = { id: string; product_id?: string | null }

const isThamaniCart = async (cartId: string, container: MedusaContainer): Promise<boolean> => {
  const query = container.resolve<RemoteQueryFunction>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["sales_channel_id"],
    filters: { id: cartId },
  })
  const salesChannelId = (data[0] as { sales_channel_id?: string | null } | undefined)
    ?.sales_channel_id
  if (!salesChannelId) return false
  const salesChannelService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
  const salesChannel = await salesChannelService.retrieveSalesChannel(salesChannelId)
  return salesChannel.metadata?.baobab_sales_channel_key === THAMANI_SALES_CHANNEL_KEY
}

const buildItemTaxCategoryByLineItemId = async (
  items: readonly GuardedItem[],
  container: MedusaContainer,
): Promise<ThamaniTaxLineContext["itemTaxCategoryByLineItemId"]> => {
  const productIds = [
    ...new Set(items.map((item) => item.product_id).filter((id): id is string => Boolean(id))),
  ]
  if (productIds.length === 0) return {}

  const thamani = container.resolve<ThamaniModuleService>("thamani")
  const profiles = await thamani.listProductRetailProfiles({ product_id: productIds })
  const categoryByProductId = new Map(
    profiles.map((profile) => [profile.product_id, profile.product_tax_category]),
  )

  const result: ThamaniTaxLineContext["itemTaxCategoryByLineItemId"] = {}
  for (const item of items) {
    const category = item.product_id ? categoryByProductId.get(item.product_id) : undefined
    if (category) result[item.id] = category
  }
  return result
}

const setThamaniTaxLineContext = async (
  cart: GuardedCart,
  items: readonly GuardedItem[] | undefined,
  container: MedusaContainer,
): Promise<StepResponse<ThamaniTaxLineContext | undefined>> => {
  if (!(await isThamaniCart(cart.id, container))) return new StepResponse(undefined)
  return new StepResponse({
    digitalEstate: THAMANI_DIGITAL_ESTATE_CANONICAL_ID,
    itemTaxCategoryByLineItemId: await buildItemTaxCategoryByLineItemId(items ?? [], container),
  })
}

updateTaxLinesWorkflow.hooks.setTaxLineContext(async ({ cart, items }, { container }) =>
  setThamaniTaxLineContext(cart as GuardedCart, items as GuardedItem[] | undefined, container),
)

upsertTaxLinesWorkflow.hooks.setTaxLineContext(async ({ cart, items }, { container }) =>
  setThamaniTaxLineContext(cart as GuardedCart, items as GuardedItem[] | undefined, container),
)
