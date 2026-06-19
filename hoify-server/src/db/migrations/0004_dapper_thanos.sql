ALTER TABLE "albums" ADD COLUMN "aliases" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "aliases" text[] DEFAULT '{}'::text[];--> statement-breakpoint
CREATE INDEX "idx_albums_aliases_gin" ON "albums" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "idx_tracks_aliases_gin" ON "tracks" USING gin ("aliases");