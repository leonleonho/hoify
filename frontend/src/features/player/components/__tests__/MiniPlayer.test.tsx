import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MiniPlayer } from '../MiniPlayer';
import { mockTrack1, makeMockContext } from './utils';
import { PlayerContext, type PlayerContextValue } from '../PlayerProvider';

function renderMiniPlayer(contextValue: PlayerContextValue) {
  return render(
    <PlayerContext.Provider value={contextValue}>
      <MiniPlayer />
    </PlayerContext.Provider>,
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
});
