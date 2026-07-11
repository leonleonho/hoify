// Mock for @rntp/player in Storybook/web environment.

const noop = () => {};

let _playing = false;
let _volume = 0.8;
let _position = 0;
let _duration = 200;
let _buffering = false;
let _loaded = false;
const listeners: Record<string, Function[]> = {};

function fire(event: string, data?: unknown) {
  (listeners[event] || []).forEach((cb) => cb(data));
}

const PlaybackState = {
  Idle: 'idle',
  Ready: 'ready',
  Buffering: 'buffering',
  Ended: 'ended',
  Error: 'error',
};

const Event = {
  PlaybackProgressUpdated: 'event.playback-progress-updated',
  IsPlayingChanged: 'event.is-playing-changed',
  PlaybackStateChanged: 'event.playback-state-changed',
  RemotePlay: 'event.remote-play',
  RemotePause: 'event.remote-pause',
  RemoteNext: 'event.remote-next',
  RemotePrevious: 'event.remote-previous',
  RemoteSeek: 'event.remote-seek',
};

const PlayerCommand = {
  Seek: 'seek',
  PlayPause: 'playPause',
  Next: 'next',
  Previous: 'previous',
  Stop: 'stop',
  SkipForward: 'skipForward',
  SkipBackward: 'skipBackward',
};

function emitStatus() {
  fire(Event.PlaybackProgressUpdated, {
    position: _position,
    duration: _duration,
  });
  fire(Event.IsPlayingChanged, { playing: _playing });
}

const TrackPlayer = {
  setupPlayer: noop,
  registerBackgroundEventHandler: noop,
  setCommands: noop,
  addEventListener: (event: string, cb: Function) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return { remove: () => { listeners[event] = listeners[event].filter((l) => l !== cb); } };
  },
  play: () => { _playing = true; _buffering = false; emitStatus(); },
  pause: () => { _playing = false; emitStatus(); },
  stop: noop,
  seekTo: (seconds: number) => { _position = seconds; emitStatus(); },
  setVolume: (v: number) => { _volume = v; },
  setMediaItems: () => { _loaded = true; _position = 0; emitStatus(); },
  setMediaItem: () => { _loaded = true; _position = 0; emitStatus(); },
  clear: () => { _loaded = false; _playing = false; _position = 0; },
  destroy: noop,
  getProgress: () => ({ position: _position, duration: _duration, buffered: _position, cached: 0 }),
  getPlaybackState: () => (_buffering ? PlaybackState.Buffering : _loaded ? PlaybackState.Ready : PlaybackState.Idle),
  isPlaying: () => _playing,
  getVolume: () => _volume,
  getActiveMediaItem: () => null,
  getActiveMediaItemIndex: () => (_loaded ? 0 : null),
  getQueue: () => [],
};

export { Event, PlaybackState, PlayerCommand };
export default TrackPlayer;
