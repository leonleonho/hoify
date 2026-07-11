import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useMutation, useFragment } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { colors, spacing, typography } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { TrackInfo } from './TrackInfo';
import { PlayPauseButton } from './PlayPauseButton';
import { LikeTrackDocument, UnlikeTrackDocument } from '../../../hooks/generated';

const QUALITY_LABELS: Record<string, string> = {
  original: 'Orig',
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

/** Fragment so like state stays reactive with Apollo cache. */
const TRACK_LIKED_FRAGMENT = gql`
  fragment MiniPlayerTrack_liked on Track {
    liked
  }
`;

/**
 * Fixed bottom bar showing current track with play/pause + next controls.
 * Tapping the bar opens the full player overlay.
 * Hidden when no track is loaded.
 */
export function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, next, openFullPlayer, quality } = useMusicPlayer();
  const [likeTrack] = useMutation(LikeTrackDocument);
  const [unlikeTrack] = useMutation(UnlikeTrackDocument);

  const { data: fragmentData } = useFragment<{ liked: boolean }>({
    fragment: TRACK_LIKED_FRAGMENT,
    from: { __typename: 'Track', id: currentTrack?.id ?? '' },
  });

  if (!currentTrack) return null;

  const liked = fragmentData?.liked ?? currentTrack.liked ?? false;

  const toggleLike = () => {
    const mutate = liked ? unlikeTrack : likeTrack;
    mutate({ variables: { trackId: currentTrack.id } });
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={openFullPlayer}
        style={styles.trackPressable}
        accessibilityLabel={`Now playing: ${currentTrack.title}. Tap to open full player.`}
        accessibilityRole="button"
      >
        <View pointerEvents="none" style={styles.trackPressableInner}>
          <TrackInfo track={currentTrack} variant="mini" />
          {quality !== 'original' && (
            <Text style={styles.qualityBadge}>{QUALITY_LABELS[quality]}</Text>
          )}
        </View>
      </Pressable>
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
    </View>
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
  trackPressable: {
    flex: 1,
  },
  trackPressableInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qualityBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
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
