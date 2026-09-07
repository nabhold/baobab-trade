import { model } from "@medusajs/framework/utils"

const MarketProductEligibility = model
  .define(
    { name: "market_product_eligibility", tableName: "b2b_market_product_eligibility" },
    {
      id: model.id({ prefix: "b2belig" }).primaryKey(),
      product_id: model.text().index(),
      market_key: model.text().index(),
      status: model.enum(["ACTIVE", "SUSPENDED", "WITHDRAWN"]).default("ACTIVE"),
      policy_reference: model.text(),
    },
  )
  .indexes([{ on: ["product_id", "market_key"], unique: true }])

export default MarketProductEligibility
