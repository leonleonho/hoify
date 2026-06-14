import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProgressBar, formatTime } from '../ProgressBar';

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
