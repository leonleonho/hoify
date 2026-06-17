import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useMutation } from '@apollo/client/react';
import { colors, spacing } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { TrackInfo } from './TrackInfo';
import { PlayPauseButton } from './PlayPauseButton';
import { LikeTrackDocument, UnlikeTrackDocument } from '../../../hooks/generated';

/**
 * Fixed bottom bar showing current track with play/pause + next controls.
 * Tapping the bar opens the full player overlay.
 * Hidden when no track is loaded.
 */
export function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, next, openFullPlayer } = useMusicPlayer();
  const [likeTrack] = useMutation(LikeTrackDocument);
  const [unlikeTrack] = useMutation(UnlikeTrackDocument);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (currentTrack) setLiked(currentTrack.liked ?? false);
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  const toggleLike = () => {
    const mutate = liked ? unlikeTrack : likeTrack;
    mutate({ variables: { trackId: currentTrack.id } });
    setLiked(!liked);
  };

  return (
    <Pressable
      style={styles.container}
      onPress={openFullPlayer}
      accessibilityLabel={`Now playing: ${currentTrack.title}. Tap to open full player.`}
    >
      <TrackInfo track={currentTrack} variant="mini" />
      <Pressable
        onPress={toggleLike}
        hitSlop={8}
        style={({ pressed }) => [styles.likeBtn, pressed && styles.likeBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Unlike' : 'Like'}
      >
        <Heart
          size={20}
          color={colors.primary}
          fill={liked ? colors.primary : 'transparent'}
        />
      </Pressable>
      <View style={styles.controls}>
        <PlayPauseButton
          isPlaying={isPlaying}
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
  likeBtn: {
    padding: spacing.sm,
    borderRadius: 999,
  },
  likeBtnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
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
