import {
  createArtist,
  createAlbum,
  createTrack,
} from "../../graphql/music/services.js";

/**
 * Seed an artist → album → track chain via the service layer
 * (bypasses GraphQL; tracks are not creatable via the API).
 */
export async function seedArtistAlbumTracks(input: {
  artistName: string;
  albumTitle: string;
  tracks: Array<{
    title: string;
    trackNumber?: number;
    discNumber?: number;
    duration?: number;
    filePath: string;
    fileFormat?: string;
    fileSize?: number;
    genreIds?: string[];
  }>;
}): Promise<{
  artistId: string;
  albumId: string;
  trackIds: string[];
}> {
  const artist = await createArtist({ name: input.artistName });
  const album = await createAlbum({
    title: input.albumTitle,
    artistId: artist.id,
  });

  const trackIds: string[] = [];
  for (const [index, track] of input.tracks.entries()) {
    const row = await createTrack({
      title: track.title,
      albumId: album.id,
      trackNumber: track.trackNumber ?? index + 1,
      discNumber: track.discNumber,
      duration: track.duration,
      filePath: track.filePath,
      fileFormat: track.fileFormat,
      fileSize: track.fileSize,
      genreIds: track.genreIds,
    });
    trackIds.push(row.id);
  }

  return { artistId: artist.id, albumId: album.id, trackIds };
}

export { createArtist, createAlbum, createTrack };
