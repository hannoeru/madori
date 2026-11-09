CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
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
	`equipment_zh_tw` text,
	`transit` text NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `properties_status_idx` ON `properties` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `property_images` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_images_position_idx` ON `property_images` (`property_id`,`kind`,`position`);