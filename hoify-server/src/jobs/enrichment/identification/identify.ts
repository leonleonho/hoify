import { parse } from "node:path";
import { logger } from "../../../util/logger.js";
import { getFingerprint } from "./fpcalc.js";
import { lookupAcoustid } from "./acoustid.js";
import { lookupMusicbrainz, lookupCoverArt, lookupReleaseAliases } from "./musicbrainz.js";
import type { ParsedTrack } from "../types/types.js";
import type { MusicbrainzRecording } from "./types.js";

interface Placeholders {
  titleIsPlaceholder: boolean;
  artistIsPlaceholder: boolean;
  albumIsPlaceholder: boolean;
  genresMissing: boolean;
}

const NON_ENGLISH_RE = /[^\x00-\x7F]/;

export function detectNonEnglish(track: ParsedTrack): boolean {
  return NON_ENGLISH_RE.test(track.title + track.artist + track.album);
}

export function detectPlaceholders(track: ParsedTrack, filePath: string): Placeholders {
  const fileName = parse(filePath).name;
  return {
    titleIsPlaceholder: track.title === fileName,
    artistIsPlaceholder: track.artist === "Unknown Artist",
    albumIsPlaceholder: track.album === "Unknown Album",
    genresMissing: track.genreNames.length === 0,
  };
}

export function needsFingerprint(p: Placeholders, isNonEnglish = false): boolean {
  return isNonEnglish || p.titleIsPlaceholder || p.artistIsPlaceholder || p.albumIsPlaceholder;
}

export function mergeOverrides(
  track: ParsedTrack,
  mbData: MusicbrainzRecording | null,
  p: Placeholders,
): ParsedTrack {
  const merged = { ...track };

  if (mbData) {
    if (p.titleIsPlaceholder) merged.title = mbData.title;
    if (p.artistIsPlaceholder) merged.artist = mbData.artist;
    if (p.albumIsPlaceholder && mbData.album) merged.album = mbData.album;
    if (track.year === null && mbData.releaseYear !== null) merged.year = mbData.releaseYear;
    if (p.genresMissing && mbData.genres.length > 0) merged.genreNames = mbData.genres;
    if (mbData.artistMbid) merged.musicbrainzArtistId = mbData.artistMbid;
    if (mbData.albumMbid) merged.musicbrainzAlbumId = mbData.albumMbid;
    if (mbData.aliases && mbData.aliases.length > 0) merged.aliases = mbData.aliases;
  }

  return merged;
}

export async function identify(
  filePath: string,
  track: ParsedTrack,
): Promise<ParsedTrack> {
  try {
    const p = detectPlaceholders(track, filePath);
    const isNonEnglish = detectNonEnglish(track);

    // Skip fingerprinting only for English tracks with complete metadata
    if (!needsFingerprint(p, isNonEnglish) && !p.genresMissing) {
      logger.debug({ filePath }, "All metadata present — skipping identification");
      return track;
    }

    let fingerprint: string | null = null;
    let recordingMbid: string | null = null;
    let mbData: MusicbrainzRecording | null = null;

    if (needsFingerprint(p, isNonEnglish)) {
      logger.info(`Running fingerprint identification for ${filePath}`);
      const fpResult = await getFingerprint(filePath);
      if (fpResult) {
        fingerprint = fpResult.fingerprint;
        const acoustidMatch = await lookupAcoustid(fpResult.fingerprint, fpResult.duration);
        if (acoustidMatch) {
          recordingMbid = acoustidMatch.recordingMbid;
          mbData = await lookupMusicbrainz(acoustidMatch.recordingMbid, isNonEnglish);
        }
      }
    }

    const merged = mergeOverrides(track, mbData, p);

    if (fingerprint) merged.acoustidFingerprint = fingerprint;
    if (recordingMbid) merged.musicbrainzRecordingId = recordingMbid;

    // --- Release aliases for non-English albums ---
    if (isNonEnglish && merged.musicbrainzAlbumId) {
      const releaseAliases = await lookupReleaseAliases(merged.musicbrainzAlbumId);
      if (releaseAliases.length > 0) {
        merged.albumAliases = releaseAliases;
        merged.aliases = [...new Set([...merged.aliases, ...releaseAliases])];
      }
    }

    // --- Album art: prefer embedded, fall back to MusicBrainz ---
    if (!merged.embeddedPicture && merged.musicbrainzAlbumId) {
      const artData = await lookupCoverArt(merged.musicbrainzAlbumId);
      if (artData) {
        merged.embeddedPicture = artData;
      }
    }

    return merged;
  } catch (err) {
    logger.warn({ filePath, error: (err as Error).message }, "Identification failed");
    return track;
  }
}
