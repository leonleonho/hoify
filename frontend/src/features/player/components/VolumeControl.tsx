import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { colors, spacing } from '@/constants/theme';

type VolumeControlProps = {
  volume: number; // 0–1
  onVolumeChange: (value: number) => void;
};

/**
 * Horizontal volume slider with speaker icons.
 * Uses PanResponder for drag interaction.
 */
export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const barWidth = useRef(0);
  const onVolumeChangeRef = useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleSeek(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleSeek(evt.nativeEvent.locationX);
      },
    }),
  ).current;

  const handleSeek = useCallback((pageX: number) => {
    if (barWidth.current <= 0) return;
    const x = Math.max(0, Math.min(pageX, barWidth.current));
    onVolumeChangeRef.current(Math.round((x / barWidth.current) * 100) / 100);
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  }, []);

  const icon = volume === 0 ? '🔈' : volume < 0.5 ? '🔉' : '🔊';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <View
        style={styles.track}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.progress, { width: `${volume * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            {
              left: `${volume * 100}%`,
              marginLeft: -6,
            },
          ]}
        />
      </View>
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
    maxWidth: 300,
    alignSelf: 'center',
  },
  icon: {
    fontSize: 18,
  },
  track: {
    flex: 1,
    height: THUMB_SIZE + 8,
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
    backgroundColor: colors.textSecondary,
  },
  thumb: {
    position: 'absolute',
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.textSecondary,
  },
});
