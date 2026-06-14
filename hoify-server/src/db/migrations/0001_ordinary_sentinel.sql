CREATE TYPE "public"."playlist_type" AS ENUM('liked', 'suggested');--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "type" "playlist_type";--> statement-breakpoint
CREATE UNIQUE INDEX "one_liked_per_user" ON "playlists" USING btree ("user_id") WHERE type = 'liked';