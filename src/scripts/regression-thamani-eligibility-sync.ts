/**
 * Regression fixture for a bug a review caught on Gate 7: the search
 * index's `thamani_eligible_markets` field must reflect the `thamani`
 * module's own `MarketProductEligibility` records — the authority for
 * eligibility — not just the static catalogue config a product was
 * originally created from (see `deriveActiveEligibleMarketKeys` in
 * `src/baobab/thamani/search/projection.ts`).
 *
 * DANGER — THIS SCRIPT MUTATES LIVE DATA. It flips a real product's
 * `thamani_za` eligibility to `SUSPENDED` and back to `ACTIVE` inside a
 * try/finally, re-running the real bootstrap/catalogue and bootstrap/search
 * scripts in between. It is deliberately NOT part of `verify:thamani-search`
 * (a read-only health check safe to run against any environment) because:
 *
 *   - A crash or termination between the SUSPENDED write and the `finally`
 *     restore leaves the fixture product suspended in whatever database
 *     this ran against.
 *   - The unconditional `finally` write to `ACTIVE` would silently
 *     overwrite a legitimately SUSPENDED/WITHDRAWN record if one already
 *     existed at that id — this script only ever runs safely against a
 *     disposable database it also owns bootstrapping (CI's ephemeral
 *     Postgres, or a local scratch database), never against a persistent
 *     or production environment.
 *
 * This also demonstrates, not hides, a real limitation: propagation from a
 * `MarketProductEligibility` change to the search index is NOT automatic or
 * event-driven today — it only happens because this script explicitly
 * re-runs `bootstrap-thamani-catalogue.ts` (which refreshes
 * `product.metadata` from the live eligibility rows) and
 * `bootstrap-thamani-search.ts` (which reindexes from that metadata). A
 * production eligibility change made through any other path will not reach
 * search until an operator or scheduled job reruns those bootstraps. See
 * "Eligibility-to-search propagation is not automatic" in
 * `docs/architecture/thamani-search.md`.
 */
import type {
  ExecArgs,
  IProductModuleService,
  ISearchModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { THAMANI_CATALOGUE } from "../baobab/thamani/catalogue"
import { THAMANI_PRODUCT_SEARCH_INDEX } from "../baobab/thamani/search"
import type ThamaniModuleService from "../modules/thamani/service"
import bootstrapThamaniCatalogue from "./bootstrap-thamani-catalogue"
import bootstrapThamaniSearch from "./bootstrap-thamani-search"

export default async function regressionThamaniEligibilitySync({
  container,
}: ExecArgs): Promise<void> {
  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const thamani = container.resolve<ThamaniModuleService>("thamani")
  const searchService = container.resolve<ISearchModuleService>(Modules.SEARCH)

  const handle = "thamani-uganda-black-tea-250g" // eligible in both Markets; not one of the isolation fixtures verify-thamani-search.ts checks
  const [product] = await productService.listProducts({ handle })
  if (!product) throw new Error(`Regression fixture product "${handle}" is missing`)

  const [eligibility] = await thamani.listMarketProductEligibilities({
    product_id: product.id,
    market_key: "thamani_za",
  })
  if (!eligibility) throw new Error(`"${handle}" has no thamani_za eligibility record to suspend`)
  if (eligibility.status !== "ACTIVE") {
    throw new Error(
      `"${handle}"'s thamani_za eligibility is already ${eligibility.status}, not ACTIVE — ` +
        "refusing to run this destructive fixture against a database whose fixture state isn't as expected",
    )
  }

  const rerunFromEligibility = async () => {
    await bootstrapThamaniCatalogue({ container } as ExecArgs)
    await bootstrapThamaniSearch({ container } as ExecArgs)
  }

  try {
    await thamani.updateMarketProductEligibilities({ id: eligibility.id, status: "SUSPENDED" })
    await rerunFromEligibility()

    const zaAfterSuspension = await searchService.search({
      entity: THAMANI_PRODUCT_SEARCH_INDEX,
      fields: ["id", "handle"],
      filters: { eligible_market_keys: { $overlaps: ["thamani_za"] } },
      pagination: { take: THAMANI_CATALOGUE.length },
    })
    if (zaAfterSuspension.hits.some((hit) => hit.document.handle === handle)) {
      throw new Error(
        `"${handle}" still surfaces for thamani_za search after its eligibility was suspended`,
      )
    }
  } finally {
    // Restore, so subsequent CI steps (and a re-run of this script) see the
    // catalogue exactly as bootstrap-thamani-catalogue.ts left it. Safe here
    // only because the ACTIVE precondition above was already checked.
    await thamani.updateMarketProductEligibilities({ id: eligibility.id, status: "ACTIVE" })
    await rerunFromEligibility()
  }

  container
    .resolve("logger")
    .info("Verified Thamani B2C eligibility-suspension reaches search via manual bootstrap resync")
}
