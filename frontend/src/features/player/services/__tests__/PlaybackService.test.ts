import { describe, it, expect, vi } from 'vitest';
import { Event } from '@rntp/player';
import {
  handleBackgroundEvent,
  registerForegroundRemoteListeners,
} from '../PlaybackService';
import { setRemoteCallbacks } from '../registerRemoteCallbacks';
import { fireTrackPlayerEvent, TrackPlayerEvent } from '@/test/setup';

describe('PlaybackService', () => {
  it('handleBackgroundEvent forwards remote play/pause/next/previous/seek', async () => {
    const play = vi.fn();
    const pause = vi.fn();
    const next = vi.fn();
    const previous = vi.fn();
    const seek = vi.fn();
    setRemoteCallbacks({ play, pause, next, previous, seek });

    await handleBackgroundEvent({ type: Event.RemotePlay } as any);
    await handleBackgroundEvent({ type: Event.RemotePause } as any);
    await handleBackgroundEvent({ type: Event.RemoteNext } as any);
    await handleBackgroundEvent({ type: Event.RemotePrevious } as any);
    await handleBackgroundEvent({ type: Event.RemoteSeek, position: 90 } as any);

    expect(play).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(previous).toHaveBeenCalledOnce();
    expect(seek).toHaveBeenCalledWith(90000);
  });

  it('registerForegroundRemoteListeners wires JS remote handlers', () => {
    const seek = vi.fn();
    setRemoteCallbacks({ seek });
    registerForegroundRemoteListeners();

    fireTrackPlayerEvent(TrackPlayerEvent.RemoteSeek, { position: 12.5 });
    expect(seek).toHaveBeenCalledWith(12500);
  });
});
