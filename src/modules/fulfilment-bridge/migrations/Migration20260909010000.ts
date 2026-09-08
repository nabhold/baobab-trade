import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909010000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "commerce_fulfilment" alter column "organisation_id" drop not null;')
    this.addSql(
      'alter table "commerce_fulfilment" add column if not exists "customer_reference" text null;',
    )
    this.addSql(
      'alter table "commerce_fulfilment" drop constraint if exists "commerce_fulfilment_mode_check";',
    )
    this.addSql(
      `alter table "commerce_fulfilment" add constraint "commerce_fulfilment_mode_check" check ("mode" in ('LOCAL_DELIVERY','PARCEL_SHIPMENT','BULK_FREIGHT','CROSS_BORDER','CUSTOMER_COLLECTION'));`,
    )
    this
      .addSql(`alter table "commerce_fulfilment" add constraint "commerce_fulfilment_one_party" check (
      ("organisation_id" is not null and "customer_reference" is null) or
      ("organisation_id" is null and "customer_reference" is not null)
    );`)
    this.addSql(
      `create index if not exists "IDX_commerce_fulfilment_customer" on "commerce_fulfilment" ("customer_reference") where "deleted_at" is null;`,
    )
    this.addSql(`create table if not exists "fulfilment_allocation" (
      "id" text not null, "fulfilment_id" text not null, "order_line_reference" text not null,
      "source_location_key" text not null, "quantity" integer not null, "source_idempotency_key" text not null,
      "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null, constraint "fulfilment_allocation_pkey" primary key ("id"),
      constraint "fulfilment_allocation_fk" foreign key ("fulfilment_id") references "commerce_fulfilment" ("id") on delete cascade,
      constraint "fulfilment_allocation_positive" check ("quantity" > 0)
    );`)
    this.addSql(
      `create unique index if not exists "IDX_fulfilment_allocation_idempotency" on "fulfilment_allocation" ("source_idempotency_key") where "deleted_at" is null;`,
    )
    this.addSql(`create table if not exists "commerce_return" (
      "id" text not null, "return_reference" text not null, "fulfilment_id" text not null,
      "order_reference" text not null, "order_line_reference" text not null, "quantity" integer not null,
      "reason" text check ("reason" in ('DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','CUSTOMER_REMORSE')) not null,
      "disposition" text check ("disposition" in ('RESTOCK','QUARANTINE','DISPOSE','INSPECT')) not null,
      "status" text check ("status" in ('REQUESTED','AUTHORIZED','RECEIVED','COMPLETED','REJECTED')) not null,
      "source_idempotency_key" text not null, "correlation_id" text not null,
      "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null, constraint "commerce_return_pkey" primary key ("id"),
      constraint "commerce_return_fulfilment_fk" foreign key ("fulfilment_id") references "commerce_fulfilment" ("id") on delete cascade,
      constraint "commerce_return_positive" check ("quantity" > 0)
    );`)
    this.addSql(
      `create unique index if not exists "IDX_commerce_return_reference" on "commerce_return" ("return_reference") where "deleted_at" is null;`,
    )
    this.addSql(
      `create unique index if not exists "IDX_commerce_return_idempotency" on "commerce_return" ("source_idempotency_key") where "deleted_at" is null;`,
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "commerce_return" cascade;')
    this.addSql('drop table if exists "fulfilment_allocation" cascade;')
    this.addSql(
      'alter table "commerce_fulfilment" drop constraint if exists "commerce_fulfilment_one_party";',
    )
    this.addSql('drop index if exists "IDX_commerce_fulfilment_customer";')
    this.addSql('alter table "commerce_fulfilment" drop column if exists "customer_reference";')
    this.addSql('alter table "commerce_fulfilment" alter column "organisation_id" set not null;')
    this.addSql(
      'alter table "commerce_fulfilment" drop constraint if exists "commerce_fulfilment_mode_check";',
    )
    this.addSql(
      `alter table "commerce_fulfilment" add constraint "commerce_fulfilment_mode_check" check ("mode" in ('LOCAL_DELIVERY','BULK_FREIGHT','CROSS_BORDER','CUSTOMER_COLLECTION'));`,
    )
  }
}
