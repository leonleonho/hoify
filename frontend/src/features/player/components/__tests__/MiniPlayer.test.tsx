import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import { MiniPlayer } from '../MiniPlayer';
import { mockTrack1, makeMockContext } from './utils';
import { PlayerContext, type PlayerContextValue } from '../PlayerProvider';
import { LikeTrackDocument, UnlikeTrackDocument } from '@/hooks/generated';

function renderMiniPlayer(contextValue: PlayerContextValue, mocks: any[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <PlayerContext.Provider value={contextValue}>
        <MiniPlayer />
      </PlayerContext.Provider>
    </MockedProvider>,
  );
}

describe('MiniPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no track loaded', () => {
    const ctx = makeMockContext({ currentTrack: null });
    const { container } = renderMiniPlayer(ctx);
    expect(container.innerHTML).toBe('');
  });

  it('renders track info when track loaded', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1 });
    renderMiniPlayer(ctx);
    expect(screen.getByText('Test Song One')).toBeInTheDocument();
  });

  it('shows accessibility label with track info', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1 });
    renderMiniPlayer(ctx);
    expect(
      screen.getByLabelText('Now playing: Test Song One. Tap to open full player.'),
    ).toBeInTheDocument();
  });

  it('calls openFullPlayer when tapped', async () => {
    const openFullPlayer = vi.fn();
    const ctx = makeMockContext({
      currentTrack: mockTrack1,
      openFullPlayer,
    });
    const user = userEvent.setup();
    renderMiniPlayer(ctx);
    await user.click(screen.getByLabelText(/Tap to open full player/));
    expect(openFullPlayer).toHaveBeenCalledOnce();
  });

  describe('like button', () => {
    it('calls likeTrack mutation on unliked track', async () => {
      const user = userEvent.setup();
      const likeMock = vi.fn(() => ({
        data: { likeTrack: { __typename: 'Track', id: 'track-1', liked: true } },
      }));
      const ctx = makeMockContext({
        currentTrack: { ...mockTrack1, liked: false },
      });

      const { container } = renderMiniPlayer(ctx, [
        {
          request: { query: LikeTrackDocument, variables: { trackId: 'track-1' } },
          result: likeMock,
        },
      ]);

      const interactives = container.querySelectorAll<HTMLElement>('[tabindex="0"]');
      const likeBtn = interactives[1];
      await user.click(likeBtn);

      await waitFor(() => {
        expect(likeMock).toHaveBeenCalledTimes(1);
      });
    });

    it('calls unlikeTrack mutation on liked track', async () => {
      const user = userEvent.setup();
      const unlikeMock = vi.fn(() => ({
        data: { unlikeTrack: { __typename: 'Track', id: 'track-1', liked: false } },
      }));
      const ctx = makeMockContext({
        currentTrack: { ...mockTrack1, liked: true },
      });

      const { container } = renderMiniPlayer(ctx, [
        {
          request: { query: UnlikeTrackDocument, variables: { trackId: 'track-1' } },
          result: unlikeMock,
        },
      ]);

      const interactives = container.querySelectorAll<HTMLElement>('[tabindex="0"]');
      const likeBtn = interactives[1];
      await user.click(likeBtn);

      await waitFor(() => {
        expect(unlikeMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
