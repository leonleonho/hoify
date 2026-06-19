ALTER TABLE "artists" ADD COLUMN "aliases" text[] DEFAULT '{}'::text[];--> statement-breakpoint
CREATE INDEX "idx_artists_aliases_gin" ON "artists" USING gin ("aliases");