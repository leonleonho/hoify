import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProgressBar } from '../ProgressBar';
import { formatTime } from '../../utils/formatTime';

describe('formatTime', () => {
  it('formats zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatTime(45000)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125000)).toBe('2:05');
  });

  it('formats hours', () => {
    expect(formatTime(3661000)).toBe('61:01');
  });

  it('returns 0:00 for negative values', () => {
    expect(formatTime(-1)).toBe('0:00');
  });

  it('returns 0:00 for NaN', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('returns 0:00 for Infinity', () => {
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('formatTime with seconds * 1000 (backend returns seconds)', () => {
  it('formats 180 seconds as 3:00', () => {
    expect(formatTime(180 * 1000)).toBe('3:00');
  });

  it('formats 45 seconds as 0:45', () => {
    expect(formatTime(45 * 1000)).toBe('0:45');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatTime(3661 * 1000)).toBe('61:01');
  });

  it('formats 1 second as 0:01', () => {
    expect(formatTime(1 * 1000)).toBe('0:01');
  });

  it('does not show 0:00 for songs under 60 seconds', () => {
    expect(formatTime(59 * 1000)).toBe('0:59');
  });

  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0 * 1000)).toBe('0:00');
  });
});

describe('ProgressBar', () => {
  it('displays elapsed and total time', () => {
    render(<ProgressBar position={65000} duration={200000} onSeek={() => {}} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('3:20')).toBeInTheDocument();
  });

  it('displays 0:00 when duration is zero', () => {
    render(<ProgressBar position={0} duration={0} onSeek={() => {}} />);
    const times = screen.getAllByText('0:00');
    expect(times).toHaveLength(2);
  });
});
