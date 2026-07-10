import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Shuffle, Repeat, Repeat1 } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { TrackInfo } from './TrackInfo';
import { ProgressBar } from './ProgressBar';
// import { VolumeControl } from './VolumeControl';
import { PlayPauseButton } from './PlayPauseButton';
import { QualitySelector } from './QualitySelector';
import type { RepeatMode } from '../types/player';

/**
 * Expanded player view with full controls:
 * album art, track metadata, seekable progress bar,
 * previous/play-pause/next, and volume slider.
 */
export function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    quality,
    shuffle,
    repeatMode,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    setQuality,
    toggleRepeat,
    toggleShuffle,
  } = useMusicPlayer();
  if (!currentTrack) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No track selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Album art + metadata */}
      <TrackInfo track={currentTrack} variant="full" />

      {/* Progress bar */}
      <ProgressBar
        position={position}
        duration={duration}
        onSeek={seek}
      />

      {/* Transport controls */}
      <View style={styles.transport}>
        <ShuffleButton active={shuffle} onPress={toggleShuffle} />
        <PreviousButton onPress={previous} />
        <PlayPauseButton
          isPlaying={isPlaying}
          size="lg"
          onPress={togglePlayPause}
        />
        <NextTrackButton onPress={next} />
        <RepeatButton mode={repeatMode} onPress={toggleRepeat} />
      </View>

      {/* Stream quality */}
      <QualitySelector quality={quality} onQualityChange={setQuality} />

      {/* Volume */}
      {/* <VolumeControl volume={volume} onVolumeChange={setVolume} /> */}
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

/** Shuffle toggle button */
function ShuffleButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.modeBtn, pressed && styles.skipBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Shuffle on' : 'Shuffle off'}
      hitSlop={8}
    >
      <Shuffle size={20} color={active ? colors.primary : colors.textMuted} />
    </Pressable>
  );
}

/** Repeat mode toggle button — cycles off → all → one → off */
function RepeatButton({ mode, onPress }: { mode: RepeatMode; onPress: () => void }) {
  const isActive = mode !== 'off';
  const color = isActive ? colors.primary : colors.textMuted;
  const Icon = mode === 'one' ? Repeat1 : Repeat;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.modeBtn, pressed && styles.skipBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={
        mode === 'off' ? 'Repeat off' : mode === 'one' ? 'Repeat one' : 'Repeat all'
      }
      hitSlop={8}
    >
      <Icon size={20} color={color} />
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
  modeBtn: {
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
