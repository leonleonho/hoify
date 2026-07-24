import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';

import { AlbumDocument } from '@/hooks/generated';
import { AlbumScreen } from './AlbumScreen';

// ── useMusicPlayer mock ──────────────────────────────────────────
const { mockPlayPlaylist, mockPush, mockUseCanModerate } = vi.hoisted(() => ({
  mockPlayPlaylist: vi.fn(),
  mockPush: vi.fn(),
  mockUseCanModerate: vi.fn(() => ({ canModerate: false, loading: false })),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/features/auth/hooks/useCanModerate', () => ({
  useCanModerate: () => mockUseCanModerate(),
}));

vi.mock('@/features/player/hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    playPlaylist: mockPlayPlaylist,
  }),
}));

vi.mock('@/features/player/components/PlayerProvider', async () => {
  const actual = await vi.importActual<typeof import('@/features/player/components/PlayerProvider')>(
    '@/features/player/components/PlayerProvider',
  );
  return {
    ...actual,
    useMusicPlayer: () => ({ playPlaylist: mockPlayPlaylist, playNext: vi.fn() }),
  };
});

// ── test data ─────────────────────────────────────────────────────

const albumId = 'album-1';

const successData = {
  album: {
    __typename: 'Album',
    id: 'album-1',
    title: 'Test Album',
    releaseYear: 2020,
    coverUrl: 'https://example.com/cover.jpg',
    artist: {
      __typename: 'Artist',
      id: 'artist-1',
      name: 'Test Artist',
      imageUrl: null,
    },
    tracks: [
      {
        __typename: 'Track',
        id: 'track-1',
        title: 'Song One',
        trackArtist: 'Test Artist',
        trackNumber: 1,
        duration: 200,
        liked: false,
        filePath: 'music/song1.mp3',
        genres: [{ __typename: 'Genre', id: 'g1', name: 'Rock' }],
      },
      {
        __typename: 'Track',
        id: 'track-2',
        title: 'Song Two',
        artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
        trackNumber: 2,
        duration: 180,
        liked: false,
        filePath: 'music/song2.mp3',
        genres: [],
      },
      {
        __typename: 'Track',
        id: 'track-3',
        title: 'Song Three',
        artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
        trackNumber: 3,
        duration: 240,
        liked: false,
        filePath: 'music/song3.mp3',
        genres: [],
      },
    ],
  },
};

// ── helpers ───────────────────────────────────────────────────────

function renderAlbum(mocks: any[] = [], id: string = albumId) {
  return render(
    <MockedProvider mocks={mocks}>
      <AlbumScreen albumId={id} />
    </MockedProvider>,
  );
}

// ── tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCanModerate.mockReturnValue({ canModerate: false, loading: false });
});

it('shows loading state while query is in flight', () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
      delay: 50_000,
    },
  ]);

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

it('shows error message when query fails', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      error: new Error('Network error'),
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText(/Failed to load album/i)).toBeInTheDocument();
  });
});

it('shows not found when album is null', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: { album: null } },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Album not found')).toBeInTheDocument();
  });
});

it('renders album title, artist name, and release year', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getAllByText('Test Artist').length).toBeGreaterThan(0);
    expect(screen.getByText('2020')).toBeInTheDocument();
  });
});

it('renders cover image', async () => {
  const { container } = renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });
});

it('renders tracks list with durations', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
    expect(screen.getByText('Song Three')).toBeInTheDocument();
    // 200s = 3:20, 180s = 3:00, 240s = 4:00
    expect(screen.getByText('3:20')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByText('4:00')).toBeInTheDocument();
  });
});

it('renders Play All button', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /play all/i })).toBeInTheDocument();
  });
});

it('does not show Edit for non-moderators', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /play all/i })).toBeInTheDocument();
  });

  expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
});

it('shows Edit for moderators and navigates to edit page', async () => {
  mockUseCanModerate.mockReturnValue({ canModerate: true, loading: false });

  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: /^edit$/i }));
  expect(mockPush).toHaveBeenCalledWith('/album/album-1/edit');
});

it('calls playPlaylist with all tracks from start when Play All is pressed', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /play all/i })).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: /play all/i }));

  expect(mockPlayPlaylist).toHaveBeenCalledTimes(1);
  expect(mockPlayPlaylist.mock.calls[0][0]).toHaveLength(3);
  expect(mockPlayPlaylist.mock.calls[0][1]).toBe(0);
});

it('calls playPlaylist with all tracks at correct index when a track is pressed', async () => {
  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: albumId } },
      result: { data: successData },
    },
  ]);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText('Song Two')).toBeInTheDocument();
  });

  await user.click(screen.getByText('Song Two'));

  expect(mockPlayPlaylist).toHaveBeenCalledTimes(1);
  expect(mockPlayPlaylist.mock.calls[0][0]).toHaveLength(3);
  expect(mockPlayPlaylist.mock.calls[0][1]).toBe(1);
});

it('renders without release year when album has none', async () => {
  const noYearData = {
    album: {
      __typename: 'Album',
      id: 'album-2',
      title: 'No Year Album',
      releaseYear: null,
      coverUrl: null,
      artist: {
        __typename: 'Artist',
        id: 'artist-2',
        name: 'Another Artist',
        imageUrl: null,
      },
      tracks: [],
    },
  };

  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: 'album-2' } },
      result: { data: noYearData },
    },
  ], 'album-2');

  await waitFor(() => {
    expect(screen.getByText('No Year Album')).toBeInTheDocument();
  });

  expect(screen.queryByText('2020')).not.toBeInTheDocument();
});

it('renders empty track list for album with no tracks', async () => {
  const noTracksData = {
    album: {
      __typename: 'Album',
      id: 'album-3',
      title: 'Empty Album',
      releaseYear: 2021,
      coverUrl: null,
      artist: {
        __typename: 'Artist',
        id: 'artist-3',
        name: 'Quiet Artist',
        imageUrl: null,
      },
      tracks: [],
    },
  };

  renderAlbum([
    {
      request: { query: AlbumDocument, variables: { id: 'album-3' } },
      result: { data: noTracksData },
    },
  ], 'album-3');

  await waitFor(() => {
    expect(screen.getByText('Empty Album')).toBeInTheDocument();
  });

  // TRACKS header hidden when no tracks
  expect(screen.queryByText('TRACKS')).not.toBeInTheDocument();
  // Play All button still exists even with no tracks
  expect(screen.getByRole('button', { name: /play all/i })).toBeInTheDocument();
});
