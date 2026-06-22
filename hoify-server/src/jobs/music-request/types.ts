export interface MusicRequestPayload {
  requestId: string;
  artistName: string;
  albumName?: string | null;
  songName?: string;
}
