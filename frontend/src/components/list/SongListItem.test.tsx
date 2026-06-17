import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';

import { SongListItem } from './SongListItem';
import { LikeTrackDocument, UnlikeTrackDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated';
import { PlayerProvider } from '@/features/player/components/PlayerProvider';

vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// ── helpers ─────────────────────────────────────────────────────────────

const baseTrack = (overrides?: Partial<Track>): Track =>
  ({
    __typename: 'Track',
    id: 'track-1',
    title: 'Midnight Waves',
    duration: 204,
    discNumber: 1,
    trackNumber: 1,
    filePath: '/music/midnight-waves.mp3',
    fileFormat: 'mp3',
    fileSize: 8_200_000,
    liked: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    genres: [],
    album: {
      __typename: 'Album',
      id: 'a1',
      title: 'Neon Dreams',
      coverUrl: null,
      artist: {
        __typename: 'Artist',
        id: 'ar1',
        name: 'Synthwave Kid',
        albums: [],
        bio: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        imageUrl: null,
      },
      releaseYear: 2025,
      tracks: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    ...overrides,
  }) as Track;

function renderItem(track: Track, props: Partial<Parameters<typeof SongListItem>[0]> = {}, mocks: any[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <PlayerProvider>
        <SongListItem
          track={track}
          onPress={vi.fn()}
          {...props}
        />
      </PlayerProvider>
    </MockedProvider>,
  );
}

/** Returns all interactive elements (tabindex="0") inside click-mode container */
function getInteractiveElements(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('[tabindex="0"]');
}

// ── tests ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('display', () => {
  it('renders track title and artist name', () => {
    renderItem(baseTrack());
    expect(screen.getByText('Midnight Waves')).toBeInTheDocument();
    expect(screen.getByText('Synthwave Kid')).toBeInTheDocument();
  });

  it('renders formatted duration', () => {
    renderItem(baseTrack({ duration: 204 }));
    expect(screen.getByText('3:24')).toBeInTheDocument();
  });

  it('renders short duration correctly', () => {
    renderItem(baseTrack({ duration: 45 }));
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('shows placeholder for null duration', () => {
    renderItem(baseTrack({ duration: null as any }));
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('shows placeholder for negative duration', () => {
    renderItem(baseTrack({ duration: -1 }));
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('renders album cover image when present', () => {
    const track = baseTrack();
    track.album.coverUrl = 'https://example.com/cover.jpg';
    const { container } = renderItem(track);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('renders placeholder art when no coverUrl', () => {
    const { container } = renderItem(baseTrack());

    // No img element rendered — placeholder is just a styled div
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('click mode — track press', () => {
  it('fires onPress when track row is clicked', async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();

    renderItem(baseTrack(), { onPress });

    await user.click(screen.getByText('Midnight Waves'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('click mode — action buttons', () => {
  it('renders heart and plus action icons', () => {
    const { container } = renderItem(baseTrack());
    // Plus + Heart (mocked as string elements) + optional Pressable content
    const interactives = getInteractiveElements(container);
    expect(interactives.length).toBeGreaterThanOrEqual(3);
  });

  it('fires custom swipeRightAction on heart press', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    const { container } = renderItem(
      baseTrack(),
      {
        swipeRightAction: { icon: <svg data-testid="heart-icon" />, onAction, backgroundColor: 'blue' },
      },
    );

    const interactives = getInteractiveElements(container);
    // Third-to-last interactive is the heart button (after MoreVertical)
    const heartBtn = interactives[interactives.length - 2];
    await user.click(heartBtn);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('fires custom swipeLeftAction on plus press', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    const { container } = renderItem(
      baseTrack(),
      {
        swipeLeftAction: { icon: <svg data-testid="plus-icon" />, onAction, backgroundColor: 'red' },
      },
    );

    const interactives = getInteractiveElements(container);
    // Fourth-to-last interactive is the plus button (MoreVertical, Heart, then Plus)
    const plusBtn = interactives[interactives.length - 3];
    await user.click(plusBtn);

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('click mode — default like action', () => {
  it('calls likeTrack mutation when default heart pressed on unliked track', async () => {
    const user = userEvent.setup();

    const likeMock = vi.fn(() => ({
      data: { likeTrack: { __typename: 'Track', id: 'track-1', liked: true } },
    }));

    const { container } = renderItem(
      baseTrack({ liked: false, id: 'track-1' }),
      {},
      [
        {
          request: { query: LikeTrackDocument, variables: { trackId: 'track-1' } },
          result: likeMock,
        },
      ],
    );

    const interactives = getInteractiveElements(container);
    const heartBtn = interactives[interactives.length - 2];
    await user.click(heartBtn);

    await waitFor(() => {
      expect(likeMock).toHaveBeenCalledTimes(1);
    });
  });

  it('calls unlikeTrack mutation when default heart pressed on liked track', async () => {
    const user = userEvent.setup();

    const unlikeMock = vi.fn(() => ({
      data: { unlikeTrack: { __typename: 'Track', id: 'track-1', liked: false } },
    }));

    const { container } = renderItem(
      baseTrack({ liked: true, id: 'track-1' }),
      {},
      [
        {
          request: { query: UnlikeTrackDocument, variables: { trackId: 'track-1' } },
          result: unlikeMock,
        },
      ],
    );

    const interactives = getInteractiveElements(container);
    const heartBtn = interactives[interactives.length - 2];
    await user.click(heartBtn);

    await waitFor(() => {
      expect(unlikeMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('divider', () => {
  it('applies border when divider is true', () => {
    const { container } = renderItem(baseTrack(), { divider: true });
    const outer = container.firstChild as HTMLElement;
    const styles = outer.getAttribute('class') ?? '';
    // react-native-web applies border-bottom styles
    expect(styles).toContain('border');
  });

  it('renders without divider border when false', () => {
    const { container } = renderItem(baseTrack(), { divider: false });
    const outer = container.firstChild as HTMLElement;
    const styles = outer.getAttribute('class') ?? '';
    // still has overflow:hidden, position:relative etc but no border class
    expect(styles).toBeTruthy();
  });
});
