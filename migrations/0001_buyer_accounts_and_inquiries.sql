CREATE TABLE `buyers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buyers_email_unique` ON `buyers` (`email`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`agency_id` text NOT NULL,
	`property_id` text,
	`submission_key` text NOT NULL,
	`property_title` text NOT NULL,
	`property_number` text NOT NULL,
	`buyer_name` text NOT NULL,
	`buyer_email` text NOT NULL,
	`message` text NOT NULL,
	`notification_status` text DEFAULT 'pending' NOT NULL,
	`notification_error` text,
	`notified_at` text,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "inquiries_notification_check" CHECK("inquiries"."notification_status" IN ('pending', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_submission_idx` ON `inquiries` (`buyer_id`,`submission_key`);--> statement-breakpoint
CREATE INDEX `inquiries_buyer_idx` ON `inquiries` (`buyer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_agency_idx` ON `inquiries` (`agency_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `saved_properties` (
	`buyer_id` text NOT NULL,
	`property_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`buyer_id`, `property_id`),
	FOREIGN KEY (`buyer_id`) REFERENCES `buyers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `_images_backup` AS SELECT * FROM `property_images`;
--> statement-breakpoint
CREATE TABLE `_transit_backup` AS SELECT * FROM `property_transit_entries`;
--> statement-breakpoint
DROP TABLE `property_images`;
--> statement-breakpoint
DROP TABLE `property_transit_entries`;
--> statement-breakpoint
CREATE TABLE `__new_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`property_number` text NOT NULL,
	`agency_id` text NOT NULL,
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
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE restrict,
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
INSERT INTO `__new_properties`("id", "property_number", "agency_id", "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", "land_area_sqm", "building_area_sqm", "built_on", "structure", "floor_number", "total_floors", "land_rights", "management_fee_yen", "repair_reserve_yen", "transaction_mode", "equipment_zh_tw", "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at") SELECT "id", "property_number", "agency_id", "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", "land_area_sqm", "building_area_sqm", "built_on", "structure", "floor_number", "total_floors", "land_rights", "management_fee_yen", "repair_reserve_yen", "transaction_mode", "equipment_zh_tw", "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at" FROM `properties`;--> statement-breakpoint
DROP TABLE `properties`;--> statement-breakpoint
ALTER TABLE `__new_properties` RENAME TO `properties`;--> statement-breakpoint
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
INSERT INTO `property_images` SELECT * FROM `_images_backup`;
--> statement-breakpoint
INSERT INTO `property_transit_entries` SELECT * FROM `_transit_backup`;
--> statement-breakpoint
DROP TABLE `_images_backup`;
--> statement-breakpoint
DROP TABLE `_transit_backup`;
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_property_number_unique` ON `properties` (`property_number`);--> statement-breakpoint
CREATE INDEX `properties_public_search_idx` ON `properties` (`status`,`ward`,`property_type`,`build_status`,`price_yen`,`floor_area_sqm`);--> statement-breakpoint
CREATE INDEX `properties_freshness_idx` ON `properties` (`status`,`next_update_on`);--> statement-breakpoint
CREATE INDEX `properties_agency_idx` ON `properties` (`agency_id`);--> statement-breakpoint
CREATE TABLE `__new_auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "auth_tokens_role_check" CHECK("__new_auth_tokens"."role" IN ('agency', 'buyer'))
);
--> statement-breakpoint
DROP TABLE `auth_tokens`;--> statement-breakpoint
ALTER TABLE `__new_auth_tokens` RENAME TO `auth_tokens`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_tokens_identity_idx` ON `auth_tokens` (`email`,`role`);