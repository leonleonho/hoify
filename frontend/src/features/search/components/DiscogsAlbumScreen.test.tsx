import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import { DiscogsAlbumScreen } from './DiscogsAlbumScreen';
import { RequestMusicDownloadDocument } from '@/hooks/generated';

// ── mocks ───────────────────────────────────────────────────────────────

vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockFetchDiscogsRelease = vi.fn();

vi.mock('@/features/search/discogs/client', () => ({
  fetchDiscogsRelease: (...args: any[]) => mockFetchDiscogsRelease(...args),
}));

const releaseData = {
  id: 100,
  title: 'Test Release',
  year: 1995,
  artists: [{ id: 1, name: 'Test Artist' }],
  tracklist: [
    { position: 'A1', title: 'Track One', duration: '3:30' },
    { position: 'A2', title: 'Track Two', duration: '4:00' },
  ],
  styles: ['House'],
  genres: ['Electronic'],
  images: [{ uri: 'https://img.jpg', height: 300, width: 300, type: 'primary' }],
  formats: [{ name: 'Vinyl', qty: '1', descriptions: ['LP'] }],
  labels: [{ name: 'Test Label', catno: 'TLP-001' }],
  uri: 'https://discogs.com/release/100',
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAlbum(mocks: any[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <DiscogsAlbumScreen albumId="100" type="master" />
    </MockedProvider>,
  );
}

describe('DiscogsAlbumScreen — loading & error', () => {
  it('shows spinner while loading', () => {
    mockFetchDiscogsRelease.mockReturnValue(new Promise(() => {}));
    renderAlbum();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    mockFetchDiscogsRelease.mockRejectedValue(new Error('Discogs API error: 404 Not Found'));
    renderAlbum();

    const el = await screen.findByText('Discogs API error: 404 Not Found');
    expect(el).toBeInTheDocument();
  });
});

describe('DiscogsAlbumScreen — display', () => {
  it('renders title, artist, year, cover image', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    const { container } = renderAlbum();

    expect(await screen.findByText('Test Release')).toBeInTheDocument();
    expect(await screen.findByText('Test Artist')).toBeInTheDocument();
    expect(await screen.findByText('1995')).toBeInTheDocument();

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img.jpg');
  });

  it('renders genre/style tags', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    renderAlbum();

    expect(await screen.findByText('Electronic')).toBeInTheDocument();
    expect(await screen.findByText('House')).toBeInTheDocument();
  });

  it('renders tracklist with positions and durations', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    renderAlbum();

    expect(await screen.findByText('A1. Track One')).toBeInTheDocument();
    expect(await screen.findByText('A2. Track Two')).toBeInTheDocument();
    expect(await screen.findByText('3:30')).toBeInTheDocument();
    expect(await screen.findByText('4:00')).toBeInTheDocument();
  });

  it('renders format and label info', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    renderAlbum();

    expect(await screen.findByText('Vinyl (LP)')).toBeInTheDocument();
    expect(await screen.findByText('Test Label')).toBeInTheDocument();
    expect(await screen.findByText('TLP-001')).toBeInTheDocument();
  });
});

describe('DiscogsAlbumScreen — request buttons', () => {
  it('shows Request Album button', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    renderAlbum();

    expect(await screen.findByRole('button', { name: /request album/i })).toBeInTheDocument();
  });

  it('shows Request tracks for each track', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);
    renderAlbum();

    await screen.findByText('A1. Track One');
    const trackButtons = screen.getAllByRole('button', { name: /request/i });
    expect(trackButtons.length).toBe(3);
  });

  it('calls requestMusic mutation when Request Album pressed', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);

    const requestMock = vi.fn(() => ({
      data: { requestMusicDownload: { id: 'req-1', status: 'pending' } },
    }));

    const user = userEvent.setup();
    renderAlbum([
      {
        request: {
          query: RequestMusicDownloadDocument,
          variables: { artistName: 'Test Artist', albumName: 'Test Release' },
        },
        result: requestMock,
      },
    ]);

    await screen.findByRole('button', { name: /request album/i });
    await user.click(screen.getByRole('button', { name: /request album/i }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
    });
  });

  it('calls requestMusic mutation when track Request pressed', async () => {
    mockFetchDiscogsRelease.mockResolvedValue(releaseData);

    const requestMock = vi.fn(() => ({
      data: { requestMusicDownload: { id: 'req-2', status: 'pending' } },
    }));

    const user = userEvent.setup();
    renderAlbum([
      {
        request: {
          query: RequestMusicDownloadDocument,
          variables: { artistName: 'Test Artist', albumName: 'Test Release', songName: 'Track One' },
        },
        result: requestMock,
      },
    ]);

    await screen.findByText('A1. Track One');
    await user.click(screen.getAllByRole('button', { name: /request/i })[1]);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
    });
  });
});
