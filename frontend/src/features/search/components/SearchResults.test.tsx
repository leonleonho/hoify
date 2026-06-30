import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import { SearchResults } from './SearchResults';
import { PlayerProvider } from '@/features/player/components/PlayerProvider';
import type { SearchMusicQuery } from '@/hooks/generated';
import type { DiscogsResult } from '../discogs/types';

// ── mocks ───────────────────────────────────────────────────────────────

vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/features/player/hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({ playPlaylist: vi.fn() }),
}));

vi.mock('@/features/player/components/PlayerProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/player/components/PlayerProvider')
  >('@/features/player/components/PlayerProvider');
  return {
    ...actual,
    useMusicPlayer: () => ({ playPlaylist: vi.fn() }),
  };
});

type SearchData = SearchMusicQuery['searchMusic'];

const emptyData: SearchData = {
  artists: [], albums: [], tracks: [], playlists: [],
};

const populatedData: SearchData = {
  artists: [{
    id: 'a1', name: 'Artist One', imageUrl: null,
  }],
  albums: [],
  tracks: [],
  playlists: [],
};

const discogsResult: DiscogsResult = {
  id: 100, type: 'master', title: 'Discogs Find', year: 2020, thumb: '',
  format: [], genre: [], style: [], uri: '',
};

// ── helpers ─────────────────────────────────────────────────────────────

function renderSearchResults(
  data: SearchData,
  props: {
    onExtendedSearch?: () => void;
    discogsResults?: DiscogsResult[];
    discogsLoading?: boolean;
    discogsError?: string | null;
    discogsSearched?: boolean;
  } = {},
) {
  return render(
    <MockedProvider mocks={[]}>
      <PlayerProvider>
        <SearchResults
          data={data}
          loading={false}
          error={null}
          {...props}
        />
      </PlayerProvider>
    </MockedProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SearchResults — discogs prompt', () => {
  it('shows extended search prompt when discogs not searched and results exist', () => {
    renderSearchResults(populatedData);

    expect(screen.getByText('Not what you\'re looking for?')).toBeInTheDocument();
    expect(screen.getByText('Search on Discogs')).toBeInTheDocument();
  });

  it('shows extended search prompt when backend results are empty', () => {
    renderSearchResults(emptyData);

    expect(screen.getByText('Not what you\'re looking for?')).toBeInTheDocument();
    expect(screen.getByText('Search on Discogs')).toBeInTheDocument();
  });

  it('hides prompt and shows discogs results when searched', () => {
    renderSearchResults(populatedData, {
      discogsSearched: true,
      discogsResults: [discogsResult],
    });

    expect(screen.queryByText('Not what you\'re looking for?')).not.toBeInTheDocument();
    expect(screen.queryByText('Search on Discogs')).not.toBeInTheDocument();
    expect(screen.getByText('Discogs Find')).toBeInTheDocument();
  });

  it('shows discogs empty state when searched but no results', () => {
    renderSearchResults(populatedData, {
      discogsSearched: true,
      discogsResults: [],
    });

    expect(screen.getByText('No Discogs results found')).toBeInTheDocument();
  });

  it('shows discogs loading spinner', () => {
    renderSearchResults(populatedData, {
      discogsSearched: true,
      discogsLoading: true,
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows discogs error', () => {
    renderSearchResults(populatedData, {
      discogsSearched: true,
      discogsError: 'Discogs API error: 429',
    });

    expect(screen.getByText('Discogs API error: 429')).toBeInTheDocument();
  });
});

describe('SearchResults — extended search button', () => {
  it('calls onExtendedSearch when button pressed', async () => {
    const user = userEvent.setup();
    const onExtended = vi.fn();

    renderSearchResults(populatedData, { onExtendedSearch: onExtended });

    await user.click(screen.getByText('Search on Discogs'));

    expect(onExtended).toHaveBeenCalledTimes(1);
  });
});
