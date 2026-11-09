CREATE TABLE `pending_image_deletions` (
	`object_key` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `pending_image_deletions_agency_idx` ON `pending_image_deletions` (`agency_id`);