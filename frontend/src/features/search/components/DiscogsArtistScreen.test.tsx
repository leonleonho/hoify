import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DiscogsArtistScreen } from './DiscogsArtistScreen';

// ── mocks ───────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetchDiscogsArtist = vi.fn();
const mockFetchDiscogsArtistReleases = vi.fn();

vi.mock('@/features/search/discogs/client', () => ({
  fetchDiscogsArtist: (...args: any[]) => mockFetchDiscogsArtist(...args),
  fetchDiscogsArtistReleases: (...args: any[]) => mockFetchDiscogsArtistReleases(...args),
}));

const artistData = {
  id: 42,
  name: 'Test Artist',
  profile: 'A test biography.',
  images: [
    { uri: 'https://img.jpg', height: 500, width: 500, type: 'primary' },
  ],
  members: [
    { id: 1, name: 'Member One', active: true, thumbnail_url: '' },
    { id: 2, name: 'Member Two', active: false, thumbnail_url: '' },
  ],
  urls: ['https://example.com'],
  namevariations: ['Alt Name'],
};

const releasesData = [
  { id: 1, type: 'master', title: 'Album One', year: 2020, role: 'Main', artist: 'Test Artist', thumb: '' },
  { id: 2, type: 'release', title: 'Single One', year: 2021, role: 'Main', artist: 'Test Artist', thumb: '' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

function mockArtistFetch(releasesArg?: any[]) {
  mockFetchDiscogsArtist.mockResolvedValue(artistData);
  mockFetchDiscogsArtistReleases.mockResolvedValue(releasesArg ?? []);
}

function renderArtist() {
  return render(<DiscogsArtistScreen artistId="42" />);
}

// ── tests ───────────────────────────────────────────────────────────────

describe('DiscogsArtistScreen — loading & error', () => {
  it('shows spinner while loading', () => {
    mockFetchDiscogsArtist.mockReturnValue(new Promise(() => {}));
    mockFetchDiscogsArtistReleases.mockReturnValue(new Promise(() => {}));
    renderArtist();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    mockFetchDiscogsArtist.mockRejectedValue(new Error('Discogs API error: 404 Not Found'));
    mockFetchDiscogsArtistReleases.mockRejectedValue(new Error('Discogs API error: 404 Not Found'));
    renderArtist();

    const el = await screen.findByText('Discogs API error: 404 Not Found');
    expect(el).toBeInTheDocument();
  });
});

describe('DiscogsArtistScreen — display', () => {
  it('renders artist name, image, and profile', async () => {
    mockArtistFetch();
    const { container } = renderArtist();

    expect(await screen.findByText('Test Artist')).toBeInTheDocument();
    expect(await screen.findByText('A test biography.')).toBeInTheDocument();

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img.jpg');
  });

  it('renders members section', async () => {
    mockArtistFetch();
    renderArtist();

    expect(await screen.findByText('MEMBERS')).toBeInTheDocument();
    expect(await screen.findByText('Member One')).toBeInTheDocument();
    expect(await screen.findByText('Member Two')).toBeInTheDocument();
  });

  it('renders external links', async () => {
    mockArtistFetch();
    renderArtist();

    expect(await screen.findByText('LINKS')).toBeInTheDocument();
    expect(await screen.findByText('example.com')).toBeInTheDocument();
  });

  it('does not render name variations section that was removed', async () => {
    mockArtistFetch();
    renderArtist();

    expect(screen.queryByText('ALSO KNOWN AS')).not.toBeInTheDocument();
  });
});

describe('DiscogsArtistScreen — releases', () => {
  it('fetches and renders releases list', async () => {
    mockArtistFetch(releasesData);
    renderArtist();

    expect(await screen.findByText('RELEASES')).toBeInTheDocument();
    expect(await screen.findByText('Album One')).toBeInTheDocument();
    expect(await screen.findByText('Single One')).toBeInTheDocument();
  });

  it('renders release years', async () => {
    mockArtistFetch(releasesData);
    renderArtist();

    expect(await screen.findByText('2020')).toBeInTheDocument();
    expect(await screen.findByText('2021')).toBeInTheDocument();
  });

  it('navigates to album page when release pressed', async () => {
    mockArtistFetch(releasesData);

    const user = userEvent.setup();
    renderArtist();

    expect(await screen.findByText('Album One')).toBeInTheDocument();

    await user.click(screen.getByText('Album One'));

    expect(mockPush).toHaveBeenCalledWith('/discogs/album/1?type=master');
  });
});
