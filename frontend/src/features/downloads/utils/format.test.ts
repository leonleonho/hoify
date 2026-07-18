import { describe, it, expect } from 'vitest';
import {
  fileBasename,
  formatBitRate,
  formatBytes,
  formatSpeed,
} from './format';

describe('fileBasename', () => {
  it('returns basename from unix path', () => {
    expect(fileBasename('/music/Artist/Album/track.flac')).toBe('track.flac');
  });

  it('returns basename from windows path', () => {
    expect(fileBasename('@@abc\\Artist\\Album\\track.mp3')).toBe('track.mp3');
  });

  it('returns original string when no separator', () => {
    expect(fileBasename('track.flac')).toBe('track.flac');
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('formatSpeed', () => {
  it('returns empty for null/zero', () => {
    expect(formatSpeed(null)).toBe('');
    expect(formatSpeed(0)).toBe('');
  });

  it('formats positive speed', () => {
    expect(formatSpeed(1024)).toBe('1.0 KB/s');
  });
});

describe('formatBitRate', () => {
  it('returns empty for null/zero', () => {
    expect(formatBitRate(null)).toBe('');
    expect(formatBitRate(0)).toBe('');
  });

  it('formats bitrate', () => {
    expect(formatBitRate(320)).toBe('320 kbps');
  });
});
