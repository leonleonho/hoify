export interface SlskdFile {
  filename: string;
  size: number;
  bitDepth?: number;
  bitRate?: number;
  sampleRate?: number;
  extension?: string;
  isLocked?: boolean;
}

export interface SlskdSearchResponse {
  username: string;
  files: SlskdFile[];
  hasFreeUploadSlot?: boolean;
  uploadSpeed?: number;
  queueLength?: number;
}

export interface SlskdSearchStatus {
  id: string;
  searchText?: string;
  isComplete: boolean;
  fileCount?: number;
  responseCount?: number;
  startedAt?: string;
}

export interface EnqueuedTransfer {
  id: number;
  username: string;
  filename: string;
  size: number;
  state: string;
}

export interface SlskdTransfer {
  id: number;
  username?: string;
  filename?: string;
  size?: number;
  state: string;
  bytesTransferred?: number;
  bytesRemaining?: number;
  percentComplete?: number;
  averageSpeed?: number;
}

export type DownloadStatus =
  | "queued"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled";

export interface DownloadSearchFile {
  filename: string;
  size: number;
  extension: string | null;
  bitRate: number | null;
  bitDepth: number | null;
  sampleRate: number | null;
  isLocked: boolean | null;
}

export interface DownloadSearchFolder {
  name: string;
  files: DownloadSearchFile[];
}

export interface DownloadSearchPeer {
  peer: string;
  hasFreeUploadSlot: boolean | null;
  uploadSpeed: number | null;
  queueLength: number | null;
  folders: DownloadSearchFolder[];
}
