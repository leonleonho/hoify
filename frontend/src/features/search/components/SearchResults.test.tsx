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
    onFindMusic?: () => void;
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

describe('SearchResults — find music CTA', () => {
  it('shows find music prompt when results exist', () => {
    renderSearchResults(populatedData, { onFindMusic: vi.fn() });

    expect(screen.getByText("Not what you're looking for?")).toBeInTheDocument();
    expect(screen.getByText('Find music')).toBeInTheDocument();
  });

  it('shows find music prompt when backend results are empty', () => {
    renderSearchResults(emptyData, { onFindMusic: vi.fn() });

    expect(screen.getByText("Not what you're looking for?")).toBeInTheDocument();
    expect(screen.getByText('Find music')).toBeInTheDocument();
  });

  it('hides CTA when onFindMusic is not provided', () => {
    renderSearchResults(populatedData);

    expect(screen.queryByText('Find music')).not.toBeInTheDocument();
  });

  it('calls onFindMusic when button pressed', async () => {
    const user = userEvent.setup();
    const onFindMusic = vi.fn();

    renderSearchResults(populatedData, { onFindMusic });

    await user.click(screen.getByText('Find music'));

    expect(onFindMusic).toHaveBeenCalledTimes(1);
  });
});
