import { describe, it, expect } from 'vitest';
import {
  WINDOW_AFTER,
  WINDOW_BEFORE,
  getWindowRange,
  shouldExtendQueueForward,
} from '../queueWindow';

describe('getWindowRange', () => {
  it('returns empty range for zero-length playlist', () => {
    expect(getWindowRange(0, 0)).toEqual({ start: 0, end: -1, queueIndex: 0 });
  });

  it('keeps one track before and four after the active index', () => {
    const len = 10;
    const center = 5;
    const { start, end, queueIndex } = getWindowRange(len, center);
    expect(start).toBe(center - WINDOW_BEFORE);
    expect(end).toBe(center + WINDOW_AFTER);
    expect(end - start + 1).toBe(WINDOW_BEFORE + WINDOW_AFTER + 1);
    expect(queueIndex).toBe(WINDOW_BEFORE);
  });

  it('clamps window at playlist start', () => {
    const { start, end, queueIndex } = getWindowRange(10, 0);
    expect(start).toBe(0);
    expect(end).toBe(WINDOW_AFTER);
    expect(queueIndex).toBe(0);
  });

  it('clamps window at playlist end', () => {
    const { start, end, queueIndex } = getWindowRange(10, 9);
    expect(start).toBe(9 - WINDOW_BEFORE);
    expect(end).toBe(9);
    expect(queueIndex).toBe(9 - start);
  });

  it('clamps out-of-range center index', () => {
    expect(getWindowRange(3, -5).start).toBe(0);
    expect(getWindowRange(3, 99).end).toBe(2);
  });
});

describe('shouldExtendQueueForward', () => {
  it('returns true near queue end when more playlist tracks exist', () => {
    expect(shouldExtendQueueForward(3, 5, 2, 10)).toBe(true);
  });

  it('returns false at last playlist track', () => {
    expect(shouldExtendQueueForward(3, 5, 9, 10)).toBe(false);
  });

  it('returns false when not near queue end', () => {
    expect(shouldExtendQueueForward(1, 5, 2, 10)).toBe(false);
  });

  it('returns false for empty queue', () => {
    expect(shouldExtendQueueForward(0, 0, 0, 10)).toBe(false);
  });
});
