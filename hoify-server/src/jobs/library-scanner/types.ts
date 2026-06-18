import type { ParsedTrack } from "../../enrichment/types.js";

export type { ParsedTrack };

export interface ScanSummary {
  filesFound: number;
  filesParsed: number;
  skipped: number;
  errors: number;
  counts: {
    artists: number;
    albums: number;
    tracks: number;
    genres: number;
  };
}
