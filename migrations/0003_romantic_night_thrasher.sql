CREATE TABLE `lines` (
	`id` text PRIMARY KEY NOT NULL,
	`name_ja` text NOT NULL,
	`name_zh_tw` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lines_name_ja_unique` ON `lines` (`name_ja`);--> statement-breakpoint
CREATE TABLE `stations` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`name_ja` text NOT NULL,
	`name_zh_tw` text NOT NULL,
	FOREIGN KEY (`line_id`) REFERENCES `lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stations_line_name_idx` ON `stations` (`line_id`,`name_ja`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`property_number` text NOT NULL,
	`agency_id` text,
	`status` text NOT NULL,
	`property_type` text NOT NULL,
	`build_status` text NOT NULL,
	`title_zh_tw` text NOT NULL,
	`description_zh_tw` text NOT NULL,
	`price_yen` integer NOT NULL,
	`ward` text NOT NULL,
	`address_zh_tw` text NOT NULL,
	`layout` text NOT NULL,
	`floor_area_sqm` real,
	`land_area_sqm` real,
	`building_area_sqm` real,
	`built_on` text NOT NULL,
	`structure` text,
	`floor_number` integer,
	`total_floors` integer,
	`land_rights` text,
	`management_fee_yen` integer,
	`repair_reserve_yen` integer,
	`transaction_mode` text,
	`equipment_zh_tw` text,
	`next_update_on` text NOT NULL,
	`published_at` text,
	`withdrawn_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "properties_status_check" CHECK("__new_properties"."status" IN ('draft', 'published', 'withdrawn')),
	CONSTRAINT "properties_type_check" CHECK("__new_properties"."property_type" IN ('condominium', 'detached_house')),
	CONSTRAINT "properties_build_status_check" CHECK("__new_properties"."build_status" IN ('new', 'resale')),
	CONSTRAINT "properties_price_check" CHECK("__new_properties"."price_yen" > 0),
	CONSTRAINT "properties_floor_area_check" CHECK("__new_properties"."floor_area_sqm" IS NULL OR "__new_properties"."floor_area_sqm" > 0),
	CONSTRAINT "properties_land_area_check" CHECK("__new_properties"."land_area_sqm" IS NULL OR "__new_properties"."land_area_sqm" > 0),
	CONSTRAINT "properties_building_area_check" CHECK("__new_properties"."building_area_sqm" IS NULL OR "__new_properties"."building_area_sqm" > 0),
	CONSTRAINT "properties_fee_check" CHECK("__new_properties"."management_fee_yen" IS NULL OR "__new_properties"."management_fee_yen" >= 0),
	CONSTRAINT "properties_reserve_check" CHECK("__new_properties"."repair_reserve_yen" IS NULL OR "__new_properties"."repair_reserve_yen" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_properties`("id", "property_number", "agency_id", "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", "land_area_sqm", "building_area_sqm", "built_on", "structure", "floor_number", "total_floors", "land_rights", "management_fee_yen", "repair_reserve_yen", "transaction_mode", "equipment_zh_tw", "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at") SELECT "id", "property_number", NULL, "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", NULL, NULL, "built_on", NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at" FROM `properties`;--> statement-breakpoint
DROP TABLE `properties`;--> statement-breakpoint
ALTER TABLE `__new_properties` RENAME TO `properties`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `properties_property_number_unique` ON `properties` (`property_number`);--> statement-breakpoint
CREATE INDEX `properties_public_search_idx` ON `properties` (`status`,`ward`,`property_type`,`build_status`,`price_yen`,`floor_area_sqm`);--> statement-breakpoint
CREATE INDEX `properties_freshness_idx` ON `properties` (`status`,`next_update_on`);--> statement-breakpoint
CREATE INDEX `properties_agency_idx` ON `properties` (`agency_id`);