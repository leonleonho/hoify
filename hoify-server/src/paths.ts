import { resolve } from "node:path";

const SERVER_DIR = process.cwd();

export const musicLibraryPath = resolve(
  process.env.MUSIC_LIBRARY_PATH ?? resolve(SERVER_DIR, "music"),
);

export const ingestPath = resolve(
  process.env.BEETS_INGEST_PATH ?? resolve(SERVER_DIR, "ingest"),
);

export const beetsDir = resolve(
  process.env.BEETS_DIR ?? resolve(SERVER_DIR, ".beets"),
);

export const albumArtPath = resolve(
  process.env.ALBUM_ART_PATH ?? resolve(SERVER_DIR, "album-art"),
);
