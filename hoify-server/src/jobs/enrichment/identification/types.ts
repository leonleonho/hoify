export interface FingerprintResult {
  fingerprint: string;
  duration: number;
}

export interface AcoustidMatch {
  recordingMbid: string;
  score: number;
}

export interface MusicbrainzRecording {
  title: string;
  artist: string;
  album: string | null;
  releaseYear: number | null;
  genres: string[];
  artistMbid?: string;
  albumMbid?: string;
  aliases?: string[];
}

export interface IdentificationResult {
  fingerprint: string | null;
  recordingMbid: string | null;
  artistMbid: string | null;
  albumMbid: string | null;
  overrides: {
    title?: string;
    artist?: string;
    album?: string;
    year?: number | null;
    genreNames?: string[];
  };
}
