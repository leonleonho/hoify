import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FullPlayer } from '../FullPlayer';
import { mockTrack1, makeMockContext } from './utils';
import { PlayerContext, type PlayerContextValue } from '../PlayerProvider';

function renderFullPlayer(contextValue: PlayerContextValue) {
  return render(
    <PlayerContext.Provider value={contextValue}>
      <FullPlayer />
    </PlayerContext.Provider>,
  );
}

describe('FullPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no track loaded', () => {
    const ctx = makeMockContext({ currentTrack: null });
    renderFullPlayer(ctx);
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });

  it('renders track info when track loaded', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1 });
    renderFullPlayer(ctx);
    expect(screen.getByText('Test Song One')).toBeInTheDocument();
  });

  it('renders transport controls', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1, isPlaying: true });
    renderFullPlayer(ctx);
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    expect(screen.getByLabelText('Next track')).toBeInTheDocument();
  });

  it('renders shuffle and repeat buttons', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1 });
    renderFullPlayer(ctx);
    expect(screen.getByLabelText('Shuffle off')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat off')).toBeInTheDocument();
  });

  it('shows active labels for shuffle and repeat', () => {
    const ctx = makeMockContext({
      currentTrack: mockTrack1,
      shuffle: true,
      repeatMode: 'one',
    });
    renderFullPlayer(ctx);
    expect(screen.getByLabelText('Shuffle on')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat one')).toBeInTheDocument();
  });

  it('renders volume control', () => {
    const ctx = makeMockContext({ currentTrack: mockTrack1 });
    renderFullPlayer(ctx);
    expect(screen.getByText('🔊')).toBeInTheDocument();
  });
});
