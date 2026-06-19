CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_albums_title_trgm" ON "albums" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_artists_name_trgm" ON "artists" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_playlists_name_trgm" ON "playlists" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_tracks_title_trgm" ON "tracks" USING gin ("title" gin_trgm_ops);