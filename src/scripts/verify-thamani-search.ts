import type {
  ExecArgs,
  IProductModuleService,
  ISearchModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { THAMANI_CATALOGUE, THAMANI_CATEGORY_COUNTS } from "../baobab/thamani/catalogue"
import { THAMANI_PRODUCT_SEARCH_INDEX } from "../baobab/thamani/search"
import type ThamaniModuleService from "../modules/thamani/service"
import bootstrapThamaniCatalogue from "./bootstrap-thamani-catalogue"
import bootstrapThamaniSearch from "./bootstrap-thamani-search"

export default async function verifyThamaniSearch({ container }: ExecArgs): Promise<void> {
  const searchService = container.resolve<ISearchModuleService>(Modules.SEARCH)

  // Search health: the index must be migrated and fully seeded.
  const indexes = await searchService.listIndexes()
  const index = indexes.find((candidate) => candidate.name === THAMANI_PRODUCT_SEARCH_INDEX)
  if (!index) throw new Error(`${THAMANI_PRODUCT_SEARCH_INDEX} search index is not registered`)
  if (index.status !== "ready") {
    throw new Error(`${THAMANI_PRODUCT_SEARCH_INDEX} search index is not ready: ${index.status}`)
  }

  // Every Thamani product, and nothing else — a ZuriBeans product on this
  // same Trade engine instance must never leak into this index.
  const all = await searchService.search({
    entity: THAMANI_PRODUCT_SEARCH_INDEX,
    pagination: { take: THAMANI_CATALOGUE.length + 10 },
  })
  if (all.hits.length !== THAMANI_CATALOGUE.length) {
    throw new Error(
      `Expected ${THAMANI_CATALOGUE.length} indexed Thamani products, found ${all.hits.length}`,
    )
  }

  // Category facets match the governed catalogue composition (spec §15).
  const faceted = await searchService.search({
    entity: THAMANI_PRODUCT_SEARCH_INDEX,
    pagination: { take: 0 },
    search_options: { facets: ["thamani_category"] },
  })
  const categoryFacet = faceted.facets?.thamani_category
  if (!categoryFacet || categoryFacet.type !== "value") {
    throw new Error("thamani_category facet is missing from the search result")
  }
  for (const [category, expectedCount] of Object.entries(THAMANI_CATEGORY_COUNTS)) {
    const facetValue = categoryFacet.values.find((value) => value.value === category)
    if (facetValue?.count !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} indexed products in category ${category}, found ${facetValue?.count ?? 0}`,
      )
    }
  }

  // Market isolation (spec §36): a Uganda-only or South Africa-only SKU must
  // never surface as purchasable when searching the other Market.
  const ugResults = await searchService.search({
    entity: THAMANI_PRODUCT_SEARCH_INDEX,
    fields: ["id", "handle"],
    filters: { eligible_market_keys: { $overlaps: ["thamani_ug"] } },
    pagination: { take: THAMANI_CATALOGUE.length },
  })
  const zaResults = await searchService.search({
    entity: THAMANI_PRODUCT_SEARCH_INDEX,
    fields: ["id", "handle"],
    filters: { eligible_market_keys: { $overlaps: ["thamani_za"] } },
    pagination: { take: THAMANI_CATALOGUE.length },
  })

  const ugHandles = new Set(ugResults.hits.map((hit) => hit.document.handle))
  const zaHandles = new Set(zaResults.hits.map((hit) => hit.document.handle))

  if (!ugHandles.has("thamani-reusable-cotton-tote-bag")) {
    throw new Error("Uganda-only SKU is missing from the Uganda Market search results")
  }
  if (zaHandles.has("thamani-reusable-cotton-tote-bag")) {
    throw new Error("Uganda-only SKU leaked into South Africa Market search results")
  }
  if (!zaHandles.has("thamani-handcrafted-ceramic-mug")) {
    throw new Error("South Africa-only SKU is missing from the South Africa Market search results")
  }
  if (ugHandles.has("thamani-handcrafted-ceramic-mug")) {
    throw new Error("South Africa-only SKU leaked into Uganda Market search results")
  }

  // Free-text keyword search finds the expected products.
  const coffeeResults = await searchService.search({
    entity: THAMANI_PRODUCT_SEARCH_INDEX,
    filters: { q: "coffee" },
  })
  if (coffeeResults.hits.length === 0) {
    throw new Error('Free-text search for "coffee" returned no results')
  }

  await verifyEligibilitySuspensionReachesSearch(container)

  container.resolve("logger").info("Verified Gate 7 Thamani B2C search health and Market isolation")
}

/**
 * Regression scenario for a bug a review caught on Gate 7 (fixed alongside
 * this test): `thamani_eligible_markets` must reflect the `thamani`
 * module's own `MarketProductEligibility` records — the authority for
 * eligibility — not just the static catalogue config a product was
 * originally created from. Suspends a live eligibility record, re-runs the
 * real bootstrap/reindex path (not a reimplementation of it), and confirms
 * the suspended Market disappears from that product's search isolation —
 * then restores it so later CI steps see the catalogue unchanged.
 */
async function verifyEligibilitySuspensionReachesSearch(
  container: ExecArgs["container"],
): Promise<void> {
  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const thamani = container.resolve<ThamaniModuleService>("thamani")
  const searchService = container.resolve<ISearchModuleService>(Modules.SEARCH)

  const handle = "thamani-uganda-black-tea-250g" // eligible in both Markets; not one of the isolation fixtures above
  const [product] = await productService.listProducts({ handle })
  if (!product) throw new Error(`Regression fixture product "${handle}" is missing`)

  const [eligibility] = await thamani.listMarketProductEligibilities({
    product_id: product.id,
    market_key: "thamani_za",
  })
  if (!eligibility) throw new Error(`"${handle}" has no thamani_za eligibility record to suspend`)

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
    // catalogue exactly as bootstrap-thamani-catalogue.ts left it.
    await thamani.updateMarketProductEligibilities({ id: eligibility.id, status: "ACTIVE" })
    await rerunFromEligibility()
  }
}
