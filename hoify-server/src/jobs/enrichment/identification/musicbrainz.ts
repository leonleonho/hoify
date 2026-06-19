import { MusicBrainzApi } from "musicbrainz-api";
import { logger } from "../../../util/logger.js";
import type { MusicbrainzRecording } from "./types.js";
import type { ArtData } from "../types/types.js";

let client: MusicBrainzApi | null = null;

function getClient(): MusicBrainzApi {
  if (!client) {
    const defaultContact = "https://github.com/leon/hoify";
    client = new MusicBrainzApi({
      appName: "hoify",
      appVersion: "0.1.0",
      appContactInfo: process.env.MUSICBRAINZ_USER_AGENT ?? defaultContact,
    });
  }
  return client;
}

export async function lookupMusicbrainz(
  recordingMbid: string,
  includeAliases = false,
): Promise<MusicbrainzRecording | null> {
  try {
    const mb = getClient();
    const inc = [
      "artists",
      "releases",
      "genres",
      "tags",
    ];
    if (includeAliases) inc.push("aliases");

    const data = (await mb.lookup("recording", recordingMbid, inc)) as {
      title: string;
      "artist-credit"?: Array<{ artist: { id: string; name: string } }>;
      releases?: Array<{
        id: string;
        title: string;
        date?: string;
      }>;
      genres?: Array<{ name: string }>;
      tags?: Array<{ name: string }>;
      aliases?: Array<{ name: string }>;
    };

    const artistCredit = data["artist-credit"]?.[0];
    const release = data.releases?.[0];
    const releaseYear = release?.date
      ? parseInt(release.date.slice(0, 4), 10) || null
      : null;

    const genreNames = new Set<string>();
    for (const g of data.genres ?? []) {
      genreNames.add(g.name.toLowerCase());
    }
    for (const t of data.tags ?? []) {
      genreNames.add(t.name.toLowerCase());
    }

    const result: MusicbrainzRecording = {
      title: data.title,
      artist: artistCredit?.artist.name ?? "Unknown Artist",
      album: release?.title ?? null,
      releaseYear,
      genres: [...genreNames],
      artistMbid: artistCredit?.artist.id,
      albumMbid: release?.id,
      aliases: (data.aliases ?? []).map((a) => a.name),
    };

    logger.debug({ mbid: recordingMbid, title: result.title }, "MusicBrainz match found");
    return result;
  } catch (err) {
    logger.warn({ error: (err as Error).message, recordingMbid }, "MusicBrainz lookup failed");
    return null;
  }
}

export async function lookupArtistAliases(
  artistMbid: string,
): Promise<string[]> {
  try {
    const mb = getClient();
    const data = (await mb.lookup("artist", artistMbid, [
      "aliases",
    ])) as { aliases?: Array<{ name: string }> };
    return (data.aliases ?? []).map((a) => a.name);
  } catch (err) {
    logger.warn(
      { error: (err as Error).message, artistMbid },
      "Artist alias lookup failed",
    );
    return [];
  }
}

export async function lookupReleaseAliases(
  releaseMbid: string,
): Promise<string[]> {
  try {
    const mb = getClient();
    const data = (await mb.lookup("release", releaseMbid, [
      "aliases",
    ])) as { aliases?: Array<{ name: string }> };
    return (data.aliases ?? []).map((a) => a.name);
  } catch (err) {
    logger.warn(
      { error: (err as Error).message, releaseMbid },
      "Release alias lookup failed",
    );
    return [];
  }
}

export async function lookupCoverArt(
  releaseMbid: string,
): Promise<ArtData | null> {
  const url = `https://coverartarchive.org/release/${releaseMbid}/front`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      logger.debug({ releaseMbid }, "No cover art at Cover Art Archive");
      return null;
    }

    if (!response.ok) {
      logger.warn(
        { status: response.status, releaseMbid },
        "Cover Art Archive request failed",
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    logger.debug({ releaseMbid, format: contentType }, "Cover art downloaded");

    return {
      data: Buffer.from(arrayBuffer),
      format: contentType,
    };
  } catch (err) {
    logger.warn(
      { error: (err as Error).message, releaseMbid },
      "Cover Art Archive request threw",
    );
    return null;
  }
}
