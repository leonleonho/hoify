CREATE TYPE "public"."music_request_status" AS ENUM('pending', 'downloading', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "music_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_name" text NOT NULL,
	"album_name" text NOT NULL,
	"song_name" text,
	"status" "music_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_requests" ADD CONSTRAINT "music_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;