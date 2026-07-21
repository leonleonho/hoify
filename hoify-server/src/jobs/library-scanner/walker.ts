import { opendir } from "node:fs/promises";
import { join, parse } from "node:path";

// ---------------------------------------------------------------------------
// Supported audio extensions
// ---------------------------------------------------------------------------

export const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".flac",
  ".wav",
  ".ogg",
  ".aac",
  ".m4a",
  ".wma",
]);

export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.has(parse(filePath).ext.toLowerCase());
}

// ---------------------------------------------------------------------------
// Walk directory tree, yielding audio file paths
// ---------------------------------------------------------------------------

export async function* walkDirectory(dir: string): AsyncGenerator<string> {
  const dirEntries = await opendir(dir);
  for await (const entry of dirEntries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else if (entry.isFile() && isAudioFile(fullPath)) {
      yield fullPath;
    }
  }
}
