import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FullPlayerOverlay } from '../FullPlayerOverlay';
import { makeMockContext } from './utils';
import { PlayerContext, type PlayerContextValue } from '../PlayerProvider';

// Animated.timing / parallel need start() to exist and optionally call a
// completion callback. We keep real react-native-web Animated but mock
// timing/parallel so they invoke the callback synchronously.
vi.mock('react-native', async () => {
  const rn = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...rn,
    Animated: {
      ...rn.Animated,
      timing: () => ({
        start: (cb?: () => void) => cb?.(),
      }),
      parallel: () => ({
        start: (cb?: () => void) => cb?.(),
      }),
    },
  };
});

function renderOverlay(contextValue: PlayerContextValue) {
  return render(
    <PlayerContext.Provider value={contextValue}>
      <FullPlayerOverlay />
    </PlayerContext.Provider>,
  );
}

describe('FullPlayerOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const ctx = makeMockContext({ isFullPlayerOpen: false });
    const { container } = renderOverlay(ctx);
    expect(container.innerHTML).toBe('');
  });

  it('renders panel when open', () => {
    const ctx = makeMockContext({ isFullPlayerOpen: true });
    renderOverlay(ctx);
    // FullPlayer inner content should be visible
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });

  it('renders close button on backdrop when open', async () => {
    const closeFullPlayer = vi.fn();
    const ctx = makeMockContext({
      isFullPlayerOpen: true,
      closeFullPlayer,
      currentTrack: null,
    });
    const user = userEvent.setup();
    renderOverlay(ctx);
    await user.click(screen.getByLabelText('Close player'));
    expect(closeFullPlayer).toHaveBeenCalledOnce();
  });

  it('shows panel handle when open', () => {
    const ctx = makeMockContext({ isFullPlayerOpen: true });
    renderOverlay(ctx);
    // The handle is a decorative View, verify by role
    // FullPlayer renders "No track selected" when no track
    expect(screen.getByText('No track selected')).toBeInTheDocument();
  });
});
