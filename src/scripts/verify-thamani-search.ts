import type { ExecArgs, ISearchModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { THAMANI_CATALOGUE, THAMANI_CATEGORY_COUNTS } from "../baobab/thamani/catalogue"
import { THAMANI_PRODUCT_SEARCH_INDEX } from "../baobab/thamani/search"

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

  container.resolve("logger").info("Verified Gate 7 Thamani B2C search health and Market isolation")
}
