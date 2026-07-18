export const SEARCH_TIMEOUT_MS = 15_000;

const AUDIO_EXTS = new Set([".flac", ".mp3", ".m4a", ".opus", ".ogg"]);

const FORMAT_RANK: Record<string, number> = {
  ".flac": 3,
  ".mp3": 2,
  ".m4a": 1,
  ".opus": 1,
  ".ogg": 1,
};

export function isAudioFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...AUDIO_EXTS].some((ext) => lower.endsWith(ext));
}

export function formatRank(filename: string): number {
  const lower = filename.toLowerCase();
  for (const ext of Object.keys(FORMAT_RANK)) {
    if (lower.endsWith(ext)) return FORMAT_RANK[ext];
  }
  return 0;
}

/** Soulseek paths use backslashes; return parent folder or "." for root. */
export function folderNameFromPath(filename: string): string {
  const normalized = filename.replace(/\//g, "\\");
  const idx = normalized.lastIndexOf("\\");
  if (idx <= 0) return ".";
  return normalized.slice(0, idx);
}

export function fileExtension(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const ext of AUDIO_EXTS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export function fileQualityScore(file: {
  filename: string;
  bitRate?: number | null;
  bitDepth?: number | null;
  sampleRate?: number | null;
  isLocked?: boolean | null;
}): number {
  let score = formatRank(file.filename) * 1_000_000;
  score += (file.bitRate ?? 0) * 10;
  score += (file.bitDepth ?? 0) * 100;
  score += Math.floor((file.sampleRate ?? 0) / 1000);
  if (file.isLocked === true) score -= 500_000;
  return score;
}

export function compareFilesByQuality(
  a: {
    filename: string;
    bitRate?: number | null;
    bitDepth?: number | null;
    sampleRate?: number | null;
    isLocked?: boolean | null;
  },
  b: {
    filename: string;
    bitRate?: number | null;
    bitDepth?: number | null;
    sampleRate?: number | null;
    isLocked?: boolean | null;
  },
): number {
  return fileQualityScore(b) - fileQualityScore(a);
}
