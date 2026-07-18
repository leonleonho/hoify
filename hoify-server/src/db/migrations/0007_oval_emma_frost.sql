CREATE TYPE "public"."library_scan_status" AS ENUM('ok', 'failed', 'skipped_dup');--> statement-breakpoint
CREATE TABLE "library_scan_state" (
	"file_path" text PRIMARY KEY NOT NULL,
	"file_mtime" bigint NOT NULL,
	"status" "library_scan_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "library_scan_state" ("file_path", "file_mtime", "status")
SELECT "file_path", "file_mtime", 'ok'::"library_scan_status"
FROM "tracks"
WHERE "file_mtime" IS NOT NULL
ON CONFLICT ("file_path") DO NOTHING;
