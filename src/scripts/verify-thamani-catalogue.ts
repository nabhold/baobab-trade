import type { ExecArgs, IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { THAMANI_CATALOGUE } from "../baobab/thamani/catalogue"
import { THAMANI_SUPPLIERS } from "../baobab/thamani/suppliers"
import type ThamaniModuleService from "../modules/thamani/service"

export default async function verifyThamaniCatalogue({ container }: ExecArgs): Promise<void> {
  const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)
  const thamani = container.resolve<ThamaniModuleService>("thamani")

  const products = await productService.listProducts(
    { handle: THAMANI_CATALOGUE.map((product) => product.handle) },
    { relations: ["variants", "categories"] },
  )
  if (products.length !== THAMANI_CATALOGUE.length) {
    throw new Error(
      `Expected ${THAMANI_CATALOGUE.length} Thamani products, found ${products.length}`,
    )
  }

  const [suppliers, profiles, eligibilities] = await Promise.all([
    thamani.listSuppliers({}),
    thamani.listProductRetailProfiles({ product_id: products.map((product) => product.id) }),
    thamani.listMarketProductEligibilities({ product_id: products.map((product) => product.id) }),
  ])

  if (suppliers.length !== THAMANI_SUPPLIERS.length) {
    throw new Error(`Expected ${THAMANI_SUPPLIERS.length} suppliers, found ${suppliers.length}`)
  }
  if (profiles.length !== THAMANI_CATALOGUE.length) {
    throw new Error(
      `Expected ${THAMANI_CATALOGUE.length} retail profiles, found ${profiles.length}`,
    )
  }

  const expectedEligibilities = THAMANI_CATALOGUE.reduce(
    (sum, product) => sum + product.eligibleMarkets.length,
    0,
  )
  if (eligibilities.length !== expectedEligibilities) {
    throw new Error(
      `Expected ${expectedEligibilities} Market eligibility records, found ${eligibilities.length}`,
    )
  }

  // Catalogue isolation: the deliberately single-Market SKUs must resolve to
  // exactly the one Market they were configured for, never both.
  const ugOnlyProduct = products.find((p) => p.handle === "thamani-reusable-cotton-tote-bag")
  const zaOnlyProduct = products.find((p) => p.handle === "thamani-handcrafted-ceramic-mug")
  if (!ugOnlyProduct || !zaOnlyProduct) {
    throw new Error("Expected single-Market isolation SKUs are missing")
  }
  const ugOnlyEligibility = eligibilities.filter((e) => e.product_id === ugOnlyProduct.id)
  const zaOnlyEligibility = eligibilities.filter((e) => e.product_id === zaOnlyProduct.id)
  if (ugOnlyEligibility.length !== 1 || ugOnlyEligibility[0].market_key !== "thamani_ug") {
    throw new Error("Uganda-only SKU eligibility is not isolated to thamani_ug")
  }
  if (zaOnlyEligibility.length !== 1 || zaOnlyEligibility[0].market_key !== "thamani_za") {
    throw new Error("South Africa-only SKU eligibility is not isolated to thamani_za")
  }

  const categoryCount = new Set(products.flatMap((p) => p.categories?.map((c) => c.id) ?? [])).size
  if (categoryCount !== 8) {
    throw new Error(`Expected 8 Thamani product categories, found ${categoryCount}`)
  }

  container.resolve("logger").info("Verified Gate 6 Thamani B2C retail catalogue and suppliers")
}
