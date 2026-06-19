export interface ArtData {
  data: Buffer;
  format: string;
}

export interface ParsedTrack {
  filePath: string;
  fileFormat: string;
  fileSize: number;
  fileMtime: number;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  duration: number | null;
  genreNames: string[];
  acoustidFingerprint?: string;
  musicbrainzRecordingId?: string;
  musicbrainzArtistId?: string;
  musicbrainzAlbumId?: string;
  aliases: string[];
  albumAliases: string[];
  artistAliases: string[];
  embeddedPicture?: ArtData;
}

export interface EnqueuePayload {
  filePath: string;
}
