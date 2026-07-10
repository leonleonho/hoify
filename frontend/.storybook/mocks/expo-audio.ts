// Mock for expo-audio in Storybook/web environment.
// Prevents native audio modules from being pulled into the Storybook bundle.

const noop = () => {};

type Listener = (event: any) => void;

function makeMockPlayer() {
  let listeners: Record<string, Listener[]> = {};
  let _volume = 0.8;
  let _currentTime = 0;
  let _duration = 200;
  let _playing = false;
  let _paused = false;
  let _isLoaded = true;
  let _isBuffering = false;
  let _loop = false;
  let _didJustFinish = false;

  const fire = (event: string, data?: any) => {
    (listeners[event] || []).forEach((cb) => cb(data));
  };

  const player: Record<string, any> = {
    id: 'mock-player',
    get playing() { return _playing; },
    set playing(v: boolean) { _playing = v; fire('playbackStatusUpdate', buildStatus()); },
    get muted() { return false; },
    get loop() { return _loop; },
    set loop(v: boolean) { _loop = v; },
    get paused() { return _paused; },
    set paused(v: boolean) { _paused = v; fire('playbackStatusUpdate', buildStatus()); },
    get isLoaded() { return _isLoaded; },
    get isBuffering() { return _isBuffering; },
    set isBuffering(v: boolean) { _isBuffering = v; },
    get currentTime() { return _currentTime; },
    set currentTime(v: number) { _currentTime = v; },
    get duration() { return _duration; },
    set duration(v: number) { _duration = v; },
    get volume() { return _volume; },
    set volume(v: number) { _volume = v; },
    playbackRate: 1,
    shouldCorrectPitch: false,
    isAudioSamplingSupported: false,

    play() { _playing = true; _paused = false; fire('playbackStatusUpdate', buildStatus()); },
    pause() { _playing = false; _paused = true; fire('playbackStatusUpdate', buildStatus()); },
    replace(_source: any) { _currentTime = 0; _isLoaded = true; _didJustFinish = false; fire('playbackStatusUpdate', buildStatus()); },
    seekTo(seconds: number) { _currentTime = seconds; fire('playbackStatusUpdate', buildStatus()); return Promise.resolve(); },
    remove() {},
    addListener(event: string, cb: Listener) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return { remove: () => { listeners[event] = listeners[event].filter((l) => l !== cb); } };
    },
    removeListener(event: string, cb: Listener) {
      if (listeners[event]) listeners[event] = listeners[event].filter((l) => l !== cb);
    },
    setAudioSamplingEnabled(_enabled: boolean) {},
    setActiveForLockScreen(_active: boolean, _metadata?: any, _options?: any) {},
    updateLockScreenMetadata(_metadata: any) {},
    clearLockScreenControls() {},
    setPlaybackRate(_rate: number) {},
  };

  function buildStatus() {
    return {
      id: player.id,
      currentTime: _currentTime,
      duration: _duration,
      playing: _playing,
      paused: _paused,
      isLoaded: _isLoaded,
      isBuffering: _isBuffering,
      loop: _loop,
      didJustFinish: _didJustFinish,
      mute: false,
      playbackState: _playing ? 'playing' : 'paused',
      timeControlStatus: _playing ? 'playing' : 'paused',
      reasonForWaitingToPlay: '',
      playbackRate: 1,
      shouldCorrectPitch: false,
    };
  }

  // Expose internals for story seeding
  player._fireEvent = fire;
  player._getStatus = buildStatus;
  player._setStatus = (patch: Record<string, any>) => {
    if (patch.playing !== undefined) _playing = patch.playing;
    if (patch.currentTime !== undefined) _currentTime = patch.currentTime;
    if (patch.duration !== undefined) _duration = patch.duration;
    if (patch.isBuffering !== undefined) _isBuffering = patch.isBuffering;
    if (patch.isLoaded !== undefined) _isLoaded = patch.isLoaded;
    if (patch.loop !== undefined) _loop = patch.loop;
    if (patch.didJustFinish !== undefined) _didJustFinish = patch.didJustFinish;
    if (patch.volume !== undefined) _volume = patch.volume;
    fire('playbackStatusUpdate', buildStatus());
  };

  return player;
}

let mockInstance = makeMockPlayer();

export function createAudioPlayer(_source?: any, _options?: any) {
  mockInstance = makeMockPlayer();
  return mockInstance;
}

export const setAudioModeAsync = () => Promise.resolve();

export const Audio = {};
