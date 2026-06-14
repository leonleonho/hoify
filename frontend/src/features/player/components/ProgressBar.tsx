import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

type ProgressBarProps = {
  position: number; // ms
  duration: number; // ms
  onSeek: (positionMs: number) => void;
};

import { formatTime } from '../utils/formatTime';

/**
 * Seekable progress bar with elapsed/total time labels.
 * Uses PanResponder for smooth drag-to-seek.
 */
export function ProgressBar({ position, duration, onSeek }: ProgressBarProps) {
  const barWidth = useRef(0);

  const fraction =
    duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;

  const seekTo = useCallback(
    (pageX: number) => {
      if (duration <= 0 || barWidth.current <= 0) return;
      const x = Math.max(0, Math.min(pageX, barWidth.current));
      const ratio = x / barWidth.current;
      onSeek(Math.round(ratio * duration));
    },
    [duration, onSeek],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        seekTo(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        seekTo(evt.nativeEvent.locationX);
      },
    }),
  ).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{formatTime(position)}</Text>
      <View
        style={styles.track}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.progress, { width: `${fraction * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            {
              left: `${fraction * 100}%`,
              marginLeft: -6,
            },
          ]}
        />
      </View>
      <Text style={styles.time}>{formatTime(duration)}</Text>
    </View>
  );
}

const THUMB_SIZE = 12;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 36,
  },
  track: {
    flex: 1,
    height: THUMB_SIZE + 8, // tall enough to tap comfortably
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
  },
});
