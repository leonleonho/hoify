import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchDiscogs,
  fetchDiscogsArtist,
  fetchDiscogsRelease,
  fetchDiscogsArtistReleases,
} from './client';

// ── helpers ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = mockFetch;
  process.env = { ...originalEnv, EXPO_PUBLIC_DISCOGS_TOKEN: 'test-token' };
});

afterEach(() => {
  process.env = originalEnv;
});

function okResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
}

function errorResponse(status: number, statusText: string) {
  return Promise.resolve({ ok: false, status, statusText } as Response);
}

// ── searchDiscogs ───────────────────────────────────────────────────────

describe('searchDiscogs', () => {
  it('returns empty array for query shorter than 2 characters', async () => {
    const result = await searchDiscogs('a');
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when EXPO_PUBLIC_DISCOGS_TOKEN is not set', async () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_DISCOGS_TOKEN: undefined };
    delete process.env.EXPO_PUBLIC_DISCOGS_TOKEN;

    await expect(searchDiscogs('test query')).rejects.toThrow('Discogs token not configured');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValue(errorResponse(429, 'Too Many Requests'));

    await expect(searchDiscogs('test query')).rejects.toThrow('Discogs API error: 429 Too Many Requests');
  });

  it('maps results and filters out label type', async () => {
    const apiResults = [
      { id: 1, type: 'artist', title: 'Artist One', year: 2000, thumb: '', cover_image: undefined, format: [], genre: ['Rock'], style: [], uri: 'https://discogs.com/1' },
      { id: 2, type: 'master', title: 'Album One', year: 2001, thumb: '', cover_image: 'https://img.jpg', format: ['Vinyl'], genre: [], style: [], uri: 'https://discogs.com/2' },
      { id: 3, type: 'label', title: 'Label Corp', year: null, thumb: '', cover_image: null, format: [], genre: [], style: [], uri: 'https://discogs.com/3' },
      { id: 4, type: 'release', title: 'Single', year: 2002, thumb: 'thumb.jpg', cover_image: undefined, format: ['CD'], genre: ['Pop'], style: [], uri: 'https://discogs.com/4' },
    ];

    mockFetch.mockReturnValue(okResponse({ pagination: { items: 4, page: 1, pages: 1 }, results: apiResults }));

    const results = await searchDiscogs('test');

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.type === 'label')).toBeUndefined();
    expect(results).toEqual([
      { id: 1, type: 'artist', title: 'Artist One', year: 2000, thumb: '', coverImage: undefined, format: [], genre: ['Rock'], style: [], uri: 'https://discogs.com/1' },
      { id: 2, type: 'master', title: 'Album One', year: 2001, thumb: '', coverImage: 'https://img.jpg', format: ['Vinyl'], genre: [], style: [], uri: 'https://discogs.com/2' },
      { id: 4, type: 'release', title: 'Single', year: 2002, thumb: 'thumb.jpg', coverImage: undefined, format: ['CD'], genre: ['Pop'], style: [], uri: 'https://discogs.com/4' },
    ]);
  });

  it('sends correct query params and headers', async () => {
    mockFetch.mockReturnValue(okResponse({ pagination: { items: 0, page: 1, pages: 1 }, results: [] }));

    await searchDiscogs('search term');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('q=search+term');
    expect(url).toContain('type=all');
    expect(url).toContain('token=test-token');
    expect(opts.headers['User-Agent']).toBe('HoifyMusicApp/1.0');
  });
});

// ── fetchDiscogsArtist ──────────────────────────────────────────────────

describe('fetchDiscogsArtist', () => {
  it('fetches and returns artist detail', async () => {
    const artistData = { id: 123, name: 'Test Artist', profile: 'A bio' };
    mockFetch.mockReturnValue(okResponse(artistData));

    const result = await fetchDiscogsArtist(123);

    expect(result).toEqual(artistData);
    expect(mockFetch.mock.calls[0][0]).toContain('/artists/123');
  });

  it('throws on error', async () => {
    mockFetch.mockReturnValue(errorResponse(404, 'Not Found'));

    await expect(fetchDiscogsArtist(999)).rejects.toThrow('Discogs API error: 404 Not Found');
  });
});

// ── fetchDiscogsRelease ─────────────────────────────────────────────────

describe('fetchDiscogsRelease', () => {
  it('fetches release detail with release type', async () => {
    mockFetch.mockReturnValue(okResponse({ id: 1, title: 'Test' }));

    await fetchDiscogsRelease(1, 'release');

    expect(mockFetch.mock.calls[0][0]).toContain('/releases/1');
  });

  it('fetches master detail with master type', async () => {
    mockFetch.mockReturnValue(okResponse({ id: 2, title: 'Master' }));

    await fetchDiscogsRelease(2, 'master');

    expect(mockFetch.mock.calls[0][0]).toContain('/masters/2');
  });
});

// ── fetchDiscogsArtistReleases ──────────────────────────────────────────

describe('fetchDiscogsArtistReleases', () => {
  it('fetches and returns release list', async () => {
    const releases = [
      { id: 1, type: 'master', title: 'Album 1', year: 2020, role: 'Main', artist: 'Test', thumb: '' },
    ];
    mockFetch.mockReturnValue(okResponse({ pagination: { items: 1, page: 1, pages: 1 }, releases }));

    const result = await fetchDiscogsArtistReleases(123);

    expect(result).toEqual(releases);
    expect(mockFetch.mock.calls[0][0]).toContain('/artists/123/releases');
    expect(mockFetch.mock.calls[0][0]).toContain('per_page=50');
    expect(mockFetch.mock.calls[0][0]).toContain('sort=year');
    expect(mockFetch.mock.calls[0][0]).toContain('sort_order=desc');
  });
});
