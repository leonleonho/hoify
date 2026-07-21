import { dirname, resolve, sep } from "node:path";

const AUDIO_EXT = /\.(mp3|flac|wav|ogg|aac|m4a|wma)$/i;

/**
 * Prefer album folders over individual track files so beets can group albums.
 * Files sitting directly in `ingestRoot` stay as singletons.
 */
function preferImportRoot(path: string, ingestRoot?: string): string {
  const resolved = resolve(path);
  if (!AUDIO_EXT.test(resolved)) return resolved;
  const parent = dirname(resolved);
  if (ingestRoot && resolve(parent) === resolve(ingestRoot)) return resolved;
  return parent;
}

/**
 * Collapse nested paths so a folder drop with many files becomes one import root.
 * `/ingest/Album` wins over `/ingest/Album/01.mp3`.
 */
export function collapseImportRoots(
  paths: string[],
  ingestRoot?: string,
): string[] {
  const normalized = [
    ...new Set(paths.map((p) => preferImportRoot(p, ingestRoot))),
  ].sort();
  const roots: string[] = [];

  for (const p of normalized) {
    if (roots.some((r) => p === r || p.startsWith(r + sep))) {
      continue;
    }
    for (let i = roots.length - 1; i >= 0; i--) {
      if (roots[i]!.startsWith(p + sep)) {
        roots.splice(i, 1);
      }
    }
    roots.push(p);
  }

  return roots;
}
