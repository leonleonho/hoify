CREATE INDEX "idx_albums_title" ON "albums" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_albums_artist_title" ON "albums" USING btree ("artist_id","title");