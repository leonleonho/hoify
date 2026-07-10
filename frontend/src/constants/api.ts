import { Platform } from 'react-native';
import { getItem } from '@/utils/storage';

let apiBase = '';

// Sync init from env var at module load
(function initFromEnv() {
  try {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    apiBase = envUrl ? envUrl.replace('/graphql', '') : '';
  } catch {
    apiBase = '';
  }
})();

const STORAGE_KEY = 'server_host';

export async function loadSavedApiBase(): Promise<void> {
  if (Platform.OS === 'web') return;
  const saved = await getItem(STORAGE_KEY);
  if (saved) {
    apiBase = saved.replace(/\/+$/, '');
  }
}

export function getApiBase(): string {
  return apiBase;
}

export function getGraphQlUrl(): string {
  return `${apiBase}/graphql`;
}

export function setApiBase(base: string): void {
  apiBase = base.replace(/\/graphql\/?$/, '').replace(/\/+$/, '');
}

export function artUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getApiBase()}${path}`;
}
