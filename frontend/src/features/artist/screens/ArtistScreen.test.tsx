import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';

import { ArtistDocument } from '@/hooks/generated';
import { ArtistScreen } from './ArtistScreen';

// ── expo-router mock ──────────────────────────────────────────────
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  }),
}));

// ── useMusicPlayer mock ──────────────────────────────────────────
const { mockPlayPlaylist } = vi.hoisted(() => ({ mockPlayPlaylist: vi.fn() }));

vi.mock('@/features/player/hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    playPlaylist: mockPlayPlaylist,
  }),
}));

// ── test data ─────────────────────────────────────────────────────

const artistId = 'artist-1';

const successData = {
  artist: {
    __typename: 'Artist',
    id: 'artist-1',
    name: 'Test Artist',
    imageUrl: 'https://example.com/artist.jpg',
    bio: 'A test artist biography.',
    albums: [
      {
        __typename: 'Album',
        id: 'album-1',
        title: 'First Album',
        releaseYear: 2020,
        coverUrl: null,
        artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
        tracks: [
          {
            __typename: 'Track',
            id: 'track-1',
            title: 'Song One',
            trackNumber: 1,
            duration: 200000,
            liked: false,
            filePath: 'music/song1.mp3',
            genres: [{ __typename: 'Genre', id: 'genre-1', name: 'Rock' }],
          },
          {
            __typename: 'Track',
            id: 'track-2',
            title: 'Song Two',
            trackNumber: 2,
            duration: 180000,
            liked: false,
            filePath: 'music/song2.mp3',
            genres: [],
          },
        ],
      },
      {
        __typename: 'Album',
        id: 'album-2',
        title: 'Second Album',
        releaseYear: 2022,
        coverUrl: null,
        artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
        tracks: [
          {
            __typename: 'Track',
            id: 'track-3',
            title: 'Song Three',
            trackNumber: 1,
            duration: 240000,
            liked: false,
            filePath: 'music/song3.mp3',
            genres: [],
          },
        ],
      },
    ],
  },
};

// ── helpers ───────────────────────────────────────────────────────

function renderArtist(mocks: any[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <ArtistScreen artistId={artistId} />
    </MockedProvider>,
  );
}

// ── tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

it('shows loading state while query is in flight', () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
      delay: 50_000,
    },
  ]);

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

it('shows error message when query fails', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      error: new Error('Network error'),
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText(/Failed to load artist/i)).toBeInTheDocument();
  });
});

it('shows not found when artist is null', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: { artist: null } },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Artist not found')).toBeInTheDocument();
  });
});

it('renders artist name, image and bio', async () => {
  const { container } = renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getAllByText('Test Artist').length).toBeGreaterThan(0);
    expect(screen.getByText('A test artist biography.')).toBeInTheDocument();
  });

  // Image rendered with the artist imageUrl
  const img = container.querySelector('img');
  expect(img).toHaveAttribute('src', 'https://example.com/artist.jpg');
});

it('renders albums section', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('First Album')).toBeInTheDocument();
    expect(screen.getByText('Second Album')).toBeInTheDocument();
  });
});

it('renders songs section with all tracks flattened from albums', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
    expect(screen.getByText('Song Three')).toBeInTheDocument();
  });
});

it('navigates to album page when album is pressed', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
    },
  ]);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText('First Album')).toBeInTheDocument();
  });

  await user.click(screen.getByText('First Album'));

  expect(mockPush).toHaveBeenCalledWith('/album/album-1');
});

it('calls playPlaylist with all tracks when song is pressed', async () => {
  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: successData },
    },
  ]);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText('Song Two')).toBeInTheDocument();
  });

  await user.click(screen.getByText('Song Two'));

  expect(mockPlayPlaylist).toHaveBeenCalledTimes(1);
  // Should pass all tracks and start at index of Song Two (index 1)
  const tracksArg = mockPlayPlaylist.mock.calls[0][0];
  expect(tracksArg).toHaveLength(3);
  expect(mockPlayPlaylist.mock.calls[0][1]).toBe(1);
});

it('shows empty albums section when artist has no albums', async () => {
  const noAlbumsData = {
    artist: {
      __typename: 'Artist',
      id: 'artist-1',
      name: 'Empty Artist',
      imageUrl: null,
      bio: null,
      albums: [],
    },
  };

  renderArtist([
    {
      request: { query: ArtistDocument, variables: { id: artistId } },
      result: { data: noAlbumsData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Empty Artist')).toBeInTheDocument();
  });

  expect(screen.queryByText('ALBUMS')).not.toBeInTheDocument();
  expect(screen.queryByText('SONGS')).not.toBeInTheDocument();
});
