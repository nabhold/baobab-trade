import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909090000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "erp_projection" add column if not exists "command_digest" text;')
    for (const [table, column, values] of [
      [
        "erp_projection",
        "kind",
        "'PRODUCT','SUPPLIER','WAREHOUSE','ORDER','FULFILMENT','SHIPMENT','PAYMENT','RETURN_REFUND'",
      ],
      [
        "erp_entity_mapping",
        "mapping_type",
        "'BUSINESS_PARTNER','PRODUCT','WAREHOUSE','SALES_ORDER','SHIPMENT','FINANCIAL_CONSEQUENCE','SUPPLIER','PAYMENT','RETURN_REFUND'",
      ],
      [
        "erp_integration_reconciliation",
        "projection_kind",
        "'BUSINESS_PARTNER','PRODUCT','WAREHOUSE','ORDER','FULFILMENT','FINANCIAL_STATUS','SUPPLIER','SHIPMENT','PAYMENT','RETURN_REFUND'",
      ],
    ] as const) {
      this.addSql(`alter table "${table}" drop constraint if exists "${table}_${column}_check";`)
      this.addSql(
        `alter table "${table}" add constraint "${table}_${column}_check" check ("${column}" in (${values}));`,
      )
    }
  }

  async down(): Promise<void> {
    this.addSql(
      `delete from "erp_integration_reconciliation" where "projection_kind" in ('SUPPLIER','SHIPMENT','PAYMENT','RETURN_REFUND');`,
    )
    this.addSql(
      `delete from "erp_entity_mapping" where "mapping_type" in ('SUPPLIER','PAYMENT','RETURN_REFUND');`,
    )
    this.addSql(
      `delete from "erp_projection" where "kind" in ('PRODUCT','SUPPLIER','WAREHOUSE','SHIPMENT','PAYMENT','RETURN_REFUND');`,
    )
    for (const [table, column, values] of [
      ["erp_projection", "kind", "'ORDER','FULFILMENT'"],
      [
        "erp_entity_mapping",
        "mapping_type",
        "'BUSINESS_PARTNER','PRODUCT','WAREHOUSE','SALES_ORDER','SHIPMENT','FINANCIAL_CONSEQUENCE'",
      ],
      [
        "erp_integration_reconciliation",
        "projection_kind",
        "'BUSINESS_PARTNER','PRODUCT','WAREHOUSE','ORDER','FULFILMENT','FINANCIAL_STATUS'",
      ],
    ] as const) {
      this.addSql(`alter table "${table}" drop constraint if exists "${table}_${column}_check";`)
      this.addSql(
        `alter table "${table}" add constraint "${table}_${column}_check" check ("${column}" in (${values}));`,
      )
    }
    this.addSql('alter table "erp_projection" drop column if exists "command_digest";')
  }
}
