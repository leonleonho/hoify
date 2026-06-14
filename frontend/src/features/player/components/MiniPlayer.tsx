import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import { colors, spacing } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { TrackInfo } from './TrackInfo';
import { PlayPauseButton } from './PlayPauseButton';

/**
 * Fixed bottom bar showing current track with play/pause + next controls.
 * Tapping the bar opens the full player screen.
 * Hidden when no track is loaded.
 */
export function MiniPlayer() {
  const { state, togglePlayPause, next } = useMusicPlayer();
  const router = useRouter();

  if (!state.currentTrack) return null;

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push('/player' as RelativePathString)}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${state.currentTrack.title}. Tap to open full player.`}
    >
      <TrackInfo track={state.currentTrack} variant="mini" />
      <View style={styles.controls}>
        <PlayPauseButton
          isPlaying={state.isPlaying}
          size="sm"
          onPress={togglePlayPause}
        />
        <NextButton onPress={next} />
      </View>
    </Pressable>
  );
}

/** Simple next-track button */
function NextButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nextBtn,
        pressed && styles.nextBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Next track"
      hitSlop={8}
    >
      <View style={styles.nextIcon}>
        <View style={styles.nextArrow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextBtn: {
    padding: spacing.sm,
    borderRadius: 999,
  },
  nextBtnPressed: {
    opacity: 0.6,
  },
  nextIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.text,
    marginLeft: 4,
  },
});
