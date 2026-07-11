/** Tracks before the active item kept in the RNTP queue. */
export const WINDOW_BEFORE = 1;

/** Tracks after the active item kept in the RNTP queue. */
export const WINDOW_AFTER = 4;

export function getWindowRange(
  playlistLength: number,
  centerIndex: number,
): { start: number; end: number; queueIndex: number } {
  if (playlistLength <= 0) {
    return { start: 0, end: -1, queueIndex: 0 };
  }
  const clamped = Math.max(0, Math.min(centerIndex, playlistLength - 1));
  const start = Math.max(0, clamped - WINDOW_BEFORE);
  const end = Math.min(playlistLength - 1, clamped + WINDOW_AFTER);
  return { start, end, queueIndex: clamped - start };
}

/** True when the active queue index is near the end and more playlist tracks exist. */
export function shouldExtendQueueForward(
  activeQueueIndex: number,
  queueLength: number,
  playlistIndex: number,
  playlistLength: number,
): boolean {
  return (
    queueLength > 0 &&
    activeQueueIndex >= queueLength - 2 &&
    playlistIndex < playlistLength - 1
  );
}
