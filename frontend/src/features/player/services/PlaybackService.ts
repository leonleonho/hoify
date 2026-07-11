import TrackPlayer, { Event, type BackgroundEvent } from '@rntp/player';
import { getRemoteCallbacks } from './registerRemoteCallbacks';

let _foregroundListenersRegistered = false;

function invoke(cb?: () => void | Promise<void>): void {
  cb?.();
}

/** Handles remote control events when the Android app is backgrounded. */
export async function handleBackgroundEvent(event: BackgroundEvent): Promise<void> {
  const cbs = getRemoteCallbacks();
  switch (event.type) {
    case Event.RemotePlay:
      invoke(cbs.play);
      break;
    case Event.RemotePause:
      invoke(cbs.pause);
      break;
    case Event.RemoteNext:
      invoke(cbs.next);
      break;
    case Event.RemotePrevious:
      invoke(cbs.previous);
      break;
    case Event.RemoteSeek:
      invoke(() => cbs.seek?.(event.position * 1000));
      break;
    default:
      break;
  }
}

/** Wire JS-handled remote events while the app UI is in the foreground. */
export function registerForegroundRemoteListeners(): void {
  if (_foregroundListenersRegistered) return;
  _foregroundListenersRegistered = true;

  const cbs = () => getRemoteCallbacks();

  TrackPlayer.addEventListener(Event.RemotePlay, () => invoke(cbs().play));
  TrackPlayer.addEventListener(Event.RemotePause, () => invoke(cbs().pause));
  TrackPlayer.addEventListener(Event.RemoteNext, () => invoke(cbs().next));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => invoke(cbs().previous));
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => {
    invoke(() => cbs().seek?.(e.position * 1000));
  });
}
