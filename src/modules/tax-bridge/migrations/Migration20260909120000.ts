import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "tax_rule_projection" add column if not exists "digital_estate" text null;',
    )
    // Every tax_rule_projection row created before this migration belongs to Thamani's Gate 13
    // bootstrap — ZuriBeans' own Gate 10 bootstrap deliberately creates no rules yet (see its
    // "without statutory rates" log line), so there is nothing else to disambiguate here.
    this.addSql(
      `update "tax_rule_projection" set "digital_estate" = 'estate:thamani-b2c' where "digital_estate" is null;`,
    )
    this.addSql('alter table "tax_rule_projection" alter column "digital_estate" set not null;')
    this.addSql(
      `alter table "tax_rule_projection" add constraint "tax_rule_digital_estate_check" check ("digital_estate" in ('estate:zuribeans-b2b','estate:thamani-b2c'));`,
    )
    this.addSql('drop index if exists "IDX_tax_rule_version";')
    this.addSql(
      `create unique index if not exists "IDX_tax_rule_version" on "tax_rule_projection" ("digital_estate", "rule_reference", "rule_version") where "deleted_at" is null;`,
    )
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists "IDX_tax_rule_version";')
    this.addSql(
      `create unique index if not exists "IDX_tax_rule_version" on "tax_rule_projection" ("rule_reference", "rule_version") where "deleted_at" is null;`,
    )
    this.addSql(
      'alter table "tax_rule_projection" drop constraint if exists "tax_rule_digital_estate_check";',
    )
    this.addSql('alter table "tax_rule_projection" drop column if exists "digital_estate";')
  }
}
