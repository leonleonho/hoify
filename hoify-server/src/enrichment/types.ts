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
}

export interface EnqueuePayload {
  filePath: string;
}
