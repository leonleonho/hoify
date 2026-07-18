import { Platform } from 'react-native';
import { getItem } from '@/utils/storage';

const STORAGE_KEY = 'server_host';

let apiBase = '';

function readEnvApiUrl(): string | undefined {
  try {
    const fromProcess = process.env.EXPO_PUBLIC_API_URL;
    if (fromProcess) return fromProcess;
  } catch {
    // process.env may be unavailable in some runtimes
  }
  if (typeof window !== 'undefined') {
    return window.__HOIFY_CONFIG__?.EXPO_PUBLIC_API_URL;
  }
  return undefined;
}

function normalizeBase(url: string): string {
  return url.replace(/\/graphql\/?$/, '').replace(/\/+$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** True when the page is likely served through a reverse proxy on 80/443. */
function isProxiedWebOrigin(location: Location): boolean {
  return location.port === '' || location.port === '80' || location.port === '443';
}

/**
 * Resolve the API origin for web.
 *
 * @rntp/player treats root-relative URLs (`/stream/...`) as `file://`, so we
 * always return an absolute http(s) origin.
 *
 * - Explicit non-localhost EXPO_PUBLIC_API_URL → use as-is
 * - localhost config + page on 80/443 (e.g. hoify.leonho.net) → same origin
 *   (external proxy forwards /graphql, /stream, /art)
 * - localhost config + page on a dev port (e.g. :3000 on a LAN IP) → same
 *   hostname, keep the configured API port (:4000)
 * - no config → same origin
 */
function resolveWebApiBase(configured: string): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return configured;
  }

  const page = window.location;

  if (!configured) {
    return page.origin;
  }

  try {
    const api = new URL(configured);
    if (!isLoopbackHost(api.hostname)) {
      return api.origin;
    }

    if (isProxiedWebOrigin(page)) {
      return page.origin;
    }

    // Dev / LAN: frontend on :3000, API still on configured port
    api.hostname = page.hostname;
    return api.origin;
  } catch {
    return page.origin;
  }
}

// Sync init from env / runtime config at module load
(function initFromEnv() {
  const envUrl = readEnvApiUrl();
  apiBase = envUrl ? normalizeBase(envUrl) : '';
})();

export async function loadSavedApiBase(): Promise<void> {
  if (Platform.OS === 'web') return;
  const saved = await getItem(STORAGE_KEY);
  if (saved) {
    apiBase = normalizeBase(saved);
  }
}

export function getApiBase(): string {
  if (Platform.OS === 'web') {
    return resolveWebApiBase(apiBase);
  }
  return apiBase;
}

export function getGraphQlUrl(): string {
  return `${getApiBase()}/graphql`;
}

export function setApiBase(base: string): void {
  apiBase = normalizeBase(base);
}

export function artUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getApiBase()}${path}`;
}
