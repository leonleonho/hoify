ALTER TABLE "tracks" ADD COLUMN "file_mtime" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_file_path_idx" ON "tracks" USING btree ("file_path");