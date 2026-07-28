import { Directory, File, Paths } from 'expo-file-system';
import { isOfflineSupported } from './isOfflineSupported';

const OFFLINE_DIR = 'offline';
const AUDIO_DIR = 'audio';

function offlineRoot(): Directory {
  return new Directory(Paths.document, OFFLINE_DIR);
}

function audioRoot(): Directory {
  return new Directory(Paths.document, OFFLINE_DIR, AUDIO_DIR);
}

/** Ensure offline/ and offline/audio/ directories exist. */
export function ensureOfflineDirs(): void {
  if (!isOfflineSupported()) return;
  const root = offlineRoot();
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
  const audio = audioRoot();
  if (!audio.exists) {
    audio.create({ intermediates: true, idempotent: true });
  }
}

export function catalogFile(): File {
  return new File(Paths.document, OFFLINE_DIR, 'catalog.json');
}

export function audioFile(trackId: string, ext: string): File {
  const safeExt = ext.replace(/^\./, '') || 'bin';
  return new File(Paths.document, OFFLINE_DIR, AUDIO_DIR, `${trackId}.${safeExt}`);
}

/** Find an existing audio file for a track id by scanning the audio directory. */
export function findAudioFile(trackId: string): File | null {
  if (!isOfflineSupported()) return null;
  ensureOfflineDirs();
  const dir = audioRoot();
  if (!dir.exists) return null;
  try {
    for (const item of dir.list()) {
      if (item instanceof File) {
        const name = item.name;
        if (name === trackId || name.startsWith(`${trackId}.`)) {
          return item;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function deleteAudioFile(trackId: string): void {
  if (!isOfflineSupported()) return;
  const existing = findAudioFile(trackId);
  if (existing?.exists) {
    existing.delete();
  }
}

export function hasLocalAudio(trackId: string): boolean {
  const file = findAudioFile(trackId);
  return Boolean(file?.exists);
}

export function getLocalAudioUri(trackId: string): string | null {
  const file = findAudioFile(trackId);
  if (!file?.exists) return null;
  return file.uri;
}

export function extensionFromFilePath(filePath: string | null | undefined): string {
  if (!filePath) return 'bin';
  const base = filePath.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot < 0 || dot === base.length - 1) return 'bin';
  return base.slice(dot + 1).toLowerCase() || 'bin';
}
