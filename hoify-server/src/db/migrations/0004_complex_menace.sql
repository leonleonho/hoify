ALTER TABLE "music_requests" ADD COLUMN "plugin_used" text;--> statement-breakpoint
ALTER TABLE "music_requests" ADD COLUMN "download_meta" jsonb;