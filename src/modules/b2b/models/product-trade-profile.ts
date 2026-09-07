import { model } from "@medusajs/framework/utils"

const ProductTradeProfile = model.define(
  { name: "product_trade_profile", tableName: "b2b_product_trade_profile" },
  {
    id: model.id({ prefix: "b2bprod" }).primaryKey(),
    product_id: model.text().unique(),
    canonical_product_key: model.text().unique(),
    country_of_origin: model.text(),
    hs_classification_reference: model.text(),
    commodity_category: model.text(),
    trade_uom: model.enum(["BAG", "CARTON"]),
    net_weight_kg: model.float(),
    gross_weight_kg: model.float(),
    packaging: model.text(),
    lot_controlled: model.boolean().default(true),
    batch_controlled: model.boolean().default(true),
    export_eligibility_reference: model.text(),
    commodity_attributes: model.json(),
  },
)

export default ProductTradeProfile
