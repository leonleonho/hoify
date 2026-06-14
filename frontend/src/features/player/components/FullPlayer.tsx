import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { TrackInfo } from './TrackInfo';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { PlayPauseButton } from './PlayPauseButton';

/**
 * Expanded player view with full controls:
 * album art, track metadata, seekable progress bar,
 * previous/play-pause/next, and volume slider.
 */
export function FullPlayer() {
  const {
    state,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
  } = useMusicPlayer();

  if (!state.currentTrack) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No track selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Album art + metadata */}
      <TrackInfo track={state.currentTrack} variant="full" />

      {/* Progress bar */}
      <ProgressBar
        position={state.position}
        duration={state.duration}
        onSeek={seek}
      />

      {/* Transport controls */}
      <View style={styles.transport}>
        <PreviousButton onPress={previous} />
        <PlayPauseButton
          isPlaying={state.isPlaying}
          size="lg"
          onPress={togglePlayPause}
        />
        <NextTrackButton onPress={next} />
      </View>

      {/* Volume */}
      <VolumeControl volume={state.volume} onVolumeChange={setVolume} />
    </View>
  );
}

/** Previous track button */
function PreviousButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Previous track"
      hitSlop={8}
    >
      <View style={styles.skipIcon}>
        <View style={[styles.skipArrow, styles.skipArrowLeft]} />
        <View style={styles.skipBar} />
      </View>
    </Pressable>
  );
}

/** Next track button for expanded player */
function NextTrackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Next track"
      hitSlop={8}
    >
      <View style={styles.skipIcon}>
        <View style={styles.skipBar} />
        <View style={styles.skipArrow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Transport row
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },

  skipBtn: {
    padding: spacing.sm,
    borderRadius: 999,
  },
  skipBtnPressed: {
    opacity: 0.6,
  },
  skipIcon: {
    width: 28,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.text,
    marginLeft: 4,
  },
  skipArrowLeft: {
    transform: [{ rotate: '180deg' }],
    marginLeft: 0,
    marginRight: 4,
  },
  skipBar: {
    width: 3,
    height: 20,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
});
