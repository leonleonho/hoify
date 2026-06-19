import { MusicBrainzApi } from "musicbrainz-api";
import { logger } from "../../../util/logger.js";
import type { MusicbrainzRecording } from "./types.js";

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
): Promise<MusicbrainzRecording | null> {
  try {
    const mb = getClient();
    const data = (await mb.lookup("recording", recordingMbid, [
      "artists",
      "releases",
      "genres",
      "tags",
    ])) as {
      title: string;
      "artist-credit"?: Array<{ artist: { id: string; name: string } }>;
      releases?: Array<{
        id: string;
        title: string;
        date?: string;
      }>;
      genres?: Array<{ name: string }>;
      tags?: Array<{ name: string }>;
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
    };

    logger.debug({ mbid: recordingMbid, title: result.title }, "MusicBrainz match found");
    return result;
  } catch (err) {
    logger.warn({ error: (err as Error).message, recordingMbid }, "MusicBrainz lookup failed");
    return null;
  }
}
