import type { DiscogsResult } from './types';
import type {
  DiscogsArtistDetail,
  DiscogsReleaseDetail,
  DiscogsDetailType,
  DiscogsArtistReleasesResponse,
  DiscogsArtistRelease,
} from './detail-types';

interface DiscogsApiResult {
  id: number;
  type: 'artist' | 'master' | 'release' | 'label';
  title: string;
  year?: number;
  thumb: string;
  cover_image?: string;
  format: string[];
  genre: string[];
  style: string[];
  uri: string;
}

interface DiscogsSearchResponse {
  pagination: { items: number; page: number; pages: number };
  results: DiscogsApiResult[];
}

const DISCOGS_API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'HoifyMusicApp/1.0';

let lastRequestTime = 0;

function getToken(): string {
  const cfg = typeof window !== 'undefined' ? window.__HOIFY_CONFIG__ : undefined;
  const token = cfg?.EXPO_PUBLIC_DISCOGS_TOKEN || process.env.EXPO_PUBLIC_DISCOGS_TOKEN;
  if (!token) throw new Error('Discogs token not configured. Set EXPO_PUBLIC_DISCOGS_TOKEN');
  return token;
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function searchDiscogs(query: string): Promise<DiscogsResult[]> {
  if (query.trim().length < 2) return [];

  const token = getToken();
  await rateLimit();

  const url = new URL(`${DISCOGS_API_BASE}/database/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'all');
  url.searchParams.set('token', token);

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  const data: DiscogsSearchResponse = await response.json();

  return data.results
    .filter((r) => r.type !== 'label')
    .map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      year: r.year,
      thumb: r.thumb,
      coverImage: r.cover_image,
      format: r.format,
      genre: r.genre,
      style: r.style,
      uri: r.uri,
    }));
}

export async function fetchDiscogsArtist(id: number): Promise<DiscogsArtistDetail> {
  await rateLimit();

  const response = await fetch(`${DISCOGS_API_BASE}/artists/${id}?token=${getToken()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDiscogsRelease(id: number, type: DiscogsDetailType): Promise<DiscogsReleaseDetail> {
  await rateLimit();

  const endpoint = type === 'master' ? 'masters' : 'releases';
  const response = await fetch(`${DISCOGS_API_BASE}/${endpoint}/${id}?token=${getToken()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDiscogsArtistReleases(id: number): Promise<DiscogsArtistRelease[]> {
  await rateLimit();

  const response = await fetch(`${DISCOGS_API_BASE}/artists/${id}/releases?token=${getToken()}&per_page=50&sort=year&sort_order=desc`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  const data: DiscogsArtistReleasesResponse = await response.json();
  return data.releases;
}
