PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`property_number` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`property_type` text NOT NULL,
	`build_status` text NOT NULL,
	`title_zh_tw` text NOT NULL,
	`description_zh_tw` text NOT NULL,
	`price_yen` integer NOT NULL,
	`ward` text NOT NULL,
	`address_zh_tw` text NOT NULL,
	`layout` text NOT NULL,
	`floor_area_sqm` real NOT NULL,
	`built_on` text NOT NULL,
	`next_update_on` text NOT NULL,
	`published_at` text,
	`withdrawn_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "properties_status_check" CHECK("__new_properties"."status" IN ('draft', 'published', 'withdrawn')),
	CONSTRAINT "properties_type_check" CHECK("__new_properties"."property_type" IN ('condominium', 'detached_house')),
	CONSTRAINT "properties_build_status_check" CHECK("__new_properties"."build_status" IN ('new', 'resale')),
	CONSTRAINT "properties_price_check" CHECK("__new_properties"."price_yen" > 0),
	CONSTRAINT "properties_area_check" CHECK("__new_properties"."floor_area_sqm" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_properties`("id", "property_number", "slug", "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", "built_on", "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at") SELECT "id", "property_number", "slug", "status", "property_type", "build_status", "title_zh_tw", "description_zh_tw", "price_yen", "ward", "address_zh_tw", "layout", "floor_area_sqm", "built_on", "next_update_on", "published_at", "withdrawn_at", "created_at", "updated_at" FROM `properties`;--> statement-breakpoint
DROP TABLE `properties`;--> statement-breakpoint
ALTER TABLE `__new_properties` RENAME TO `properties`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `properties_property_number_unique` ON `properties` (`property_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `properties_slug_unique` ON `properties` (`slug`);--> statement-breakpoint
CREATE INDEX `properties_public_search_idx` ON `properties` (`status`,`ward`,`property_type`,`build_status`,`price_yen`,`floor_area_sqm`);--> statement-breakpoint
CREATE INDEX `properties_freshness_idx` ON `properties` (`status`,`next_update_on`);--> statement-breakpoint
CREATE TABLE `__new_property_images` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	`alt_zh_tw` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "property_images_kind_check" CHECK("__new_property_images"."kind" IN ('floor_plan', 'photo')),
	CONSTRAINT "property_images_position_check" CHECK("__new_property_images"."position" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_property_images`("id", "property_id", "object_key", "kind", "position", "is_cover", "alt_zh_tw", "created_at") SELECT "id", "property_id", "object_key", "kind", "position", "is_cover", "alt_zh_tw", "created_at" FROM `property_images`;--> statement-breakpoint
DROP TABLE `property_images`;--> statement-breakpoint
ALTER TABLE `__new_property_images` RENAME TO `property_images`;--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_object_key_unique` ON `property_images` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_position_idx` ON `property_images` (`property_id`,`kind`,`position`);--> statement-breakpoint
CREATE TABLE `__new_property_transit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`line_name_zh_tw` text NOT NULL,
	`station_name_zh_tw` text NOT NULL,
	`walking_minutes` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "property_transit_walk_check" CHECK("__new_property_transit_entries"."walking_minutes" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_property_transit_entries`("id", "property_id", "line_name_zh_tw", "station_name_zh_tw", "walking_minutes") SELECT "id", "property_id", "line_name_zh_tw", "station_name_zh_tw", "walking_minutes" FROM `property_transit_entries`;--> statement-breakpoint
DROP TABLE `property_transit_entries`;--> statement-breakpoint
ALTER TABLE `__new_property_transit_entries` RENAME TO `property_transit_entries`;--> statement-breakpoint
CREATE INDEX `property_transit_search_idx` ON `property_transit_entries` (`station_name_zh_tw`,`walking_minutes`,`property_id`);