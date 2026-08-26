CREATE TABLE `properties` (
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
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_property_number_unique` ON `properties` (`property_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `properties_slug_unique` ON `properties` (`slug`);--> statement-breakpoint
CREATE INDEX `properties_public_search_idx` ON `properties` (`status`,`ward`,`property_type`,`build_status`,`price_yen`,`floor_area_sqm`);--> statement-breakpoint
CREATE INDEX `properties_freshness_idx` ON `properties` (`status`,`next_update_on`);--> statement-breakpoint
CREATE TABLE `property_images` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	`alt_zh_tw` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_object_key_unique` ON `property_images` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_position_idx` ON `property_images` (`property_id`,`kind`,`position`);--> statement-breakpoint
CREATE TABLE `property_transit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`line_name_zh_tw` text NOT NULL,
	`station_name_zh_tw` text NOT NULL,
	`walking_minutes` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `property_transit_search_idx` ON `property_transit_entries` (`station_name_zh_tw`,`walking_minutes`,`property_id`);