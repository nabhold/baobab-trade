import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909140000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "erp_entity_mapping" add column if not exists "digital_estate" text null;',
    )
    // Thamani's own canonical keys use a "th-"/"TH-" prefix by convention (see
    // bootstrap-thamani-erp-integration.ts); everything else predates Thamani's Gate 15 and was
    // written by ZuriBeans' Gate 12 bootstrap.
    this.addSql(
      `update "erp_entity_mapping" set "digital_estate" = case
        when lower("canonical_entity_id") like 'th-%' then 'estate:thamani-b2c'
        else 'estate:zuribeans-b2b'
      end where "digital_estate" is null;`,
    )
    this.addSql('alter table "erp_entity_mapping" alter column "digital_estate" set not null;')
    this.addSql(
      `alter table "erp_entity_mapping" add constraint "erp_mapping_digital_estate_check" check ("digital_estate" in ('estate:zuribeans-b2b','estate:thamani-b2c'));`,
    )
    this.addSql('drop index if exists "IDX_erp_mapping_canonical";')
    this.addSql(
      `create unique index if not exists "IDX_erp_mapping_canonical" on "erp_entity_mapping" ("mapping_type", "digital_estate", "canonical_entity_id") where "deleted_at" is null;`,
    )
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists "IDX_erp_mapping_canonical";')
    this.addSql(
      `create unique index if not exists "IDX_erp_mapping_canonical" on "erp_entity_mapping" ("mapping_type", "canonical_entity_id") where "deleted_at" is null;`,
    )
    this.addSql(
      'alter table "erp_entity_mapping" drop constraint if exists "erp_mapping_digital_estate_check";',
    )
    this.addSql('alter table "erp_entity_mapping" drop column if exists "digital_estate";')
  }
}
