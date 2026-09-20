CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`license` text NOT NULL,
	`line_url` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_email_unique` ON `agencies` (`email`);--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_tokens_email_idx` ON `auth_tokens` (`email`);--> statement-breakpoint
CREATE TABLE `lines` (
	`id` text PRIMARY KEY NOT NULL,
	`name_ja` text NOT NULL,
	`name_zh_tw` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lines_name_ja_unique` ON `lines` (`name_ja`);--> statement-breakpoint
CREATE TABLE `properties` (
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
	CONSTRAINT "properties_status_check" CHECK("properties"."status" IN ('draft', 'published', 'withdrawn')),
	CONSTRAINT "properties_type_check" CHECK("properties"."property_type" IN ('condominium', 'detached_house')),
	CONSTRAINT "properties_build_status_check" CHECK("properties"."build_status" IN ('new', 'resale')),
	CONSTRAINT "properties_price_check" CHECK("properties"."price_yen" > 0),
	CONSTRAINT "properties_floor_area_check" CHECK("properties"."floor_area_sqm" IS NULL OR "properties"."floor_area_sqm" > 0),
	CONSTRAINT "properties_land_area_check" CHECK("properties"."land_area_sqm" IS NULL OR "properties"."land_area_sqm" > 0),
	CONSTRAINT "properties_building_area_check" CHECK("properties"."building_area_sqm" IS NULL OR "properties"."building_area_sqm" > 0),
	CONSTRAINT "properties_fee_check" CHECK("properties"."management_fee_yen" IS NULL OR "properties"."management_fee_yen" >= 0),
	CONSTRAINT "properties_reserve_check" CHECK("properties"."repair_reserve_yen" IS NULL OR "properties"."repair_reserve_yen" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_property_number_unique` ON `properties` (`property_number`);--> statement-breakpoint
CREATE INDEX `properties_public_search_idx` ON `properties` (`status`,`ward`,`property_type`,`build_status`,`price_yen`,`floor_area_sqm`);--> statement-breakpoint
CREATE INDEX `properties_freshness_idx` ON `properties` (`status`,`next_update_on`);--> statement-breakpoint
CREATE INDEX `properties_agency_idx` ON `properties` (`agency_id`);--> statement-breakpoint
CREATE TABLE `property_images` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	`alt_zh_tw` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "property_images_kind_check" CHECK("property_images"."kind" IN ('floor_plan', 'photo')),
	CONSTRAINT "property_images_position_check" CHECK("property_images"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_object_key_unique` ON `property_images` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_position_idx` ON `property_images` (`property_id`,`kind`,`position`);--> statement-breakpoint
CREATE TABLE `property_transit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`station_id` text NOT NULL,
	`walking_minutes` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_transit_walk_check" CHECK("property_transit_entries"."walking_minutes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `property_transit_search_idx` ON `property_transit_entries` (`station_id`,`walking_minutes`,`property_id`);--> statement-breakpoint
CREATE TABLE `stations` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`name_ja` text NOT NULL,
	`name_zh_tw` text NOT NULL,
	FOREIGN KEY (`line_id`) REFERENCES `lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stations_line_name_idx` ON `stations` (`line_id`,`name_ja`);