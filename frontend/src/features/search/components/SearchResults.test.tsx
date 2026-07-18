import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import { SearchResults } from './SearchResults';
import { PlayerProvider } from '@/features/player/components/PlayerProvider';
import type { SearchMusicQuery } from '@/hooks/generated';

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

function renderSearchResults(
  data: SearchData,
  props: {
    onFindDownload?: () => void;
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

describe('SearchResults — find & download CTA', () => {
  it('shows find & download prompt when results exist', () => {
    renderSearchResults(populatedData, { onFindDownload: vi.fn() });

    expect(screen.getByText("Not what you're looking for?")).toBeInTheDocument();
    expect(screen.getByText('Find & download')).toBeInTheDocument();
  });

  it('shows find & download prompt when backend results are empty', () => {
    renderSearchResults(emptyData, { onFindDownload: vi.fn() });

    expect(screen.getByText("Not what you're looking for?")).toBeInTheDocument();
    expect(screen.getByText('Find & download')).toBeInTheDocument();
  });

  it('hides CTA when onFindDownload is not provided', () => {
    renderSearchResults(populatedData);

    expect(screen.queryByText('Find & download')).not.toBeInTheDocument();
  });

  it('calls onFindDownload when button pressed', async () => {
    const user = userEvent.setup();
    const onFindDownload = vi.fn();

    renderSearchResults(populatedData, { onFindDownload });

    await user.click(screen.getByText('Find & download'));

    expect(onFindDownload).toHaveBeenCalledTimes(1);
  });
});
