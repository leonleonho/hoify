import type { MusicRequestPayload } from "../types.js";

export interface DownloadPlugin {
  name: string;
  enabled: boolean;
  download(req: MusicRequestPayload): Promise<DownloadResult>;
  saveState(key: string, data: unknown): Promise<void>;
  resumeState?: unknown;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  format?: string;
  fileCount?: number;
  error?: string;
}
