DROP TABLE "music_requests";--> statement-breakpoint
DROP TYPE "public"."music_request_status";--> statement-breakpoint
CREATE TYPE "public"."music_download_status" AS ENUM('queued', 'downloading', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "music_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"peer" text NOT NULL,
	"external_id" text NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"status" "music_download_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "music_downloads" ADD CONSTRAINT "music_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
