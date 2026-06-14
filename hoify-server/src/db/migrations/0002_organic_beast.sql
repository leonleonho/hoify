CREATE INDEX "albums_artist_id_idx" ON "albums" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "playlists_user_id_idx" ON "playlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracks_album_id_idx" ON "tracks" USING btree ("album_id");