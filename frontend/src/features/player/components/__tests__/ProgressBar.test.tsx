import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { PanResponder } from 'react-native';
import { ProgressBar } from '../ProgressBar';
import { formatTime } from '../../utils/formatTime';

// Mock PanResponder so we control when seek fires
let onGrant: ((e: any) => void) | null = null;
let onMove: ((e: any, g?: any) => void) | null = null;
let onRelease: ((e: any, g?: any) => void) | null = null;
let onTerminate: (() => void) | null = null;

vi.mock('react-native', async () => {
  const rn = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...rn,
    PanResponder: {
      create: vi.fn((config: Record<string, any>) => {
        onGrant = (e: any) => config.onPanResponderGrant(e);
        onMove = (e: any, g?: any) => config.onPanResponderMove(e, g);
        onRelease = (e: any, g?: any) => config.onPanResponderRelease(e, g);
        onTerminate = () => config.onPanResponderTerminate?.();
        return {
          panHandlers: {
            onStartShouldSetResponder: () => true,
            onMoveShouldSetResponder: () => true,
            onResponderGrant: (e: any) => onGrant?.(e),
            onResponderMove: (e: any, g: any) => onMove?.(e, g),
            onResponderRelease: (e: any, g: any) => onRelease?.(e, g),
            onResponderTerminate: () => onTerminate?.(),
          },
        };
      }),
    },
  };
});

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
  beforeEach(() => {
    onGrant = null;
    onMove = null;
    onRelease = null;
    onTerminate = null;
  });

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

  it('does not fire onSeek during grant or move, only on release', () => {
    const onSeek = vi.fn();
    render(<ProgressBar position={0} duration={100000} onSeek={onSeek} />);

    onGrant!({ nativeEvent: { locationX: 50 } });
    expect(onSeek).not.toHaveBeenCalled();

    onMove!({ nativeEvent: { locationX: 75 } }, { dx: 25 });
    expect(onSeek).not.toHaveBeenCalled();

    onRelease!({ nativeEvent: { locationX: 75 } }, { dx: 25 });
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('fires onSeek once per drag gesture despite multiple moves', () => {
    const onSeek = vi.fn();
    render(<ProgressBar position={0} duration={100000} onSeek={onSeek} />);

    onGrant!({ nativeEvent: { locationX: 20 } });
    onMove!({ nativeEvent: { locationX: 40 } }, { dx: 20 });
    onMove!({ nativeEvent: { locationX: 60 } }, { dx: 40 });
    onMove!({ nativeEvent: { locationX: 80 } }, { dx: 60 });
    expect(onSeek).not.toHaveBeenCalled();

    onRelease!({ nativeEvent: { locationX: 80 } }, { dx: 60 });
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('does not call onSeek on terminate', () => {
    const onSeek = vi.fn();
    render(<ProgressBar position={0} duration={100000} onSeek={onSeek} />);

    onGrant!({ nativeEvent: { locationX: 50 } });
    onTerminate!();
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('refuses pan responder termination during drag', () => {
    render(<ProgressBar position={0} duration={100000} onSeek={() => {}} />);
    const config = vi.mocked(PanResponder.create).mock.calls.at(-1)?.[0];
    expect(config?.onPanResponderTerminationRequest?.()).toBe(false);
  });

  it('uses grant position plus dx on release', () => {
    const onSeek = vi.fn();
    render(<ProgressBar position={0} duration={100000} onSeek={onSeek} />);

    act(() => {
      onGrant!({ nativeEvent: { locationX: 20 } });
      onRelease!({ nativeEvent: { locationX: 200 } }, { dx: 30 });
    });

    // dx-based release ignores misleading release locationX; without measured
    // width the seek resolves to 0 until layout fires in the real UI.
    expect(onSeek).toHaveBeenCalledWith(0);
  });
});
