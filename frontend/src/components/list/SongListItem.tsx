import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Heart, Plus } from 'lucide-react-native';
import { useMutation } from '@apollo/client/react';
import { colors, spacing, typography } from '../../constants/theme';
import type { Track } from '../../hooks/generated';
import { LikeTrackDocument, UnlikeTrackDocument } from '../../hooks/generated';

// ── duration formatter ──────────────────────────────────────────────
function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── swipe capability detection ──────────────────────────────────────
function useSwipeCapable(): boolean {
  const [capable] = useState(() => {
    if (Platform.OS !== 'web') return true;
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
  });
  return capable;
}

// ── types ───────────────────────────────────────────────────────────
export type SwipeAction = {
  icon: React.ReactNode;
  onAction: () => void;
  /** Background colour revealed on swipe (default: primary for right, error for left) */
  backgroundColor?: string;
};

/** Default "like" action — swipe right. Pass `liked` true for filled heart. Override `onAction` in production. */
export function defaultLikeAction(liked: boolean): SwipeAction {
  return {
    icon: <Heart size={22} color="#fff" fill={liked ? '#fff' : 'transparent'} />,
    onAction: () => console.warn('defaultLikeAction — no onAction set'),
    backgroundColor: colors.primary,
  };
}

/** Default "add to playlist" action — swipe left. Override `onAction` in production. */
export const defaultAddToPlaylistAction: SwipeAction = {
  icon: <Plus size={22} color="#fff" />,
  onAction: () => console.warn('defaultAddToPlaylistAction — no onAction set'),
  backgroundColor: colors.error,
};

export type SongListItemProps = {
  track: Track;
  onPress?: () => void;
  divider?: boolean;
  /** Swipe item LEFT → triggered. icon sits on the right side.  */
  swipeLeftAction?: SwipeAction;
  /** Swipe item RIGHT → triggered. icon sits on the left side. */
  swipeRightAction?: SwipeAction;
  /**
   * Interaction mode override.
   * - `'auto'` (default): swipe on touch devices, click otherwise
   * - `'swipe'`: always use swipe gestures
   * - `'click'`: always show action buttons
   */
  interactionMode?: 'auto' | 'swipe' | 'click';
};

// ── constants ───────────────────────────────────────────────────────
const ART_SIZE = 44;
const SWIPE_THRESHOLD = 80;
const SWIPE_MAX = 120;

// ── component ───────────────────────────────────────────────────────
export function SongListItem({
  track,
  onPress,
  divider = true,
  swipeLeftAction,
  swipeRightAction,
  interactionMode = 'auto',
}: SongListItemProps) {
  const swipeCapable = useSwipeCapable();
  const useSwipe =
    interactionMode === 'swipe' || (interactionMode === 'auto' && swipeCapable);

  const [likeTrack] = useMutation(LikeTrackDocument);
  const [unlikeTrack] = useMutation(UnlikeTrackDocument);

  const resolvedSwipeRight = swipeRightAction ?? {
    icon: <Heart size={22} color="#fff" fill={track.liked ? '#fff' : 'transparent'} />,
    onAction: () => {
      const isLiked = track.liked ?? false;
      const mutate = isLiked ? unlikeTrack : likeTrack;
      mutate({ variables: { trackId: track.id } });
    },
    backgroundColor: colors.primary,
  };

  const resolvedSwipeLeft = swipeLeftAction ?? {
    icon: <Plus size={22} color="#fff" />,
    onAction: () => console.warn('addToPlaylist not yet wired'),
    backgroundColor: colors.error,
  };

  const translateX = useRef(new Animated.Value(0)).current;
  const callbacksRef = useRef({ onPress, swipeLeftAction: resolvedSwipeLeft, swipeRightAction: resolvedSwipeRight });
  const gestureStartX = useRef(0);
  const gestureDx = useRef(0);

  useEffect(() => {
    callbacksRef.current = { onPress, swipeLeftAction: resolvedSwipeLeft, swipeRightAction: resolvedSwipeRight };
  });

  // ── click mode ───────────────────────────────────────────────────
  if (!useSwipe) {
    const content = (
      <>
        {track.album.coverUrl ? (
          <Image source={{ uri: track.album.coverUrl }} style={styles.art} />
        ) : (
          <View style={styles.art} />
        )}
        <View style={styles.meta}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.album.artist.name}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
      </>
    );

    return (
      <View
        style={[
          divider ? styles.wrapperWithDivider : styles.wrapper,
          styles.clickContainer,
          onPress ? styles.clickable : undefined,
        ]}
      >
        {onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed, hovered }) =>
              [
                styles.clickContent,
                pressed || hovered ? styles.pressed : undefined,
              ] as any
            }
          >
            {content}
          </Pressable>
        ) : (
          <View style={styles.clickContent}>{content}</View>
        )}

        {resolvedSwipeLeft && (
          <Pressable
            onPress={resolvedSwipeLeft.onAction}
            style={styles.clickActionIcon}
          >
            {resolvedSwipeLeft.icon}
          </Pressable>
        )}
        {resolvedSwipeRight && (
          <Pressable
            onPress={resolvedSwipeRight.onAction}
            style={styles.clickActionIcon}
          >
            {resolvedSwipeRight.icon}
          </Pressable>
        )}
      </View>
    );
  }

  // ── swipe mode ────────────────────────────────────────────────────
  // swipe-right bg opacity (left side of container, fades in as content slides right)
  const rightReveal = translateX.interpolate({
    inputRange: [0, SWIPE_MAX * 0.3, SWIPE_MAX],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  // swipe-left bg opacity (right side of container, fades in as content slides left)
  const leftReveal = translateX.interpolate({
    inputRange: [-SWIPE_MAX, -SWIPE_MAX * 0.3, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        translateX.stopAnimation();
        translateX.setValue(0);
        gestureStartX.current = evt.nativeEvent.pageX;
        gestureDx.current = 0;
      },
      onPanResponderMove: (evt) => {
        const dx = evt.nativeEvent.pageX - gestureStartX.current;
        gestureDx.current = dx;
        const clamped = Math.min(Math.max(dx, -SWIPE_MAX), SWIPE_MAX);
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_evt, _gs) => {
        const {
          onPress: cbOnPress,
          swipeLeftAction: cbLeft,
          swipeRightAction: cbRight,
        } = callbacksRef.current;
        const dx = gestureDx.current;

        if (Math.abs(dx) < 5) {
          cbOnPress?.();
        } else if (dx > SWIPE_THRESHOLD && cbRight) {
          cbRight.onAction();
        } else if (dx < -SWIPE_THRESHOLD && cbLeft) {
          cbLeft.onAction();
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={divider ? styles.wrapperWithDivider : styles.wrapper}>
      {/* Left-side action background — visible when swiping RIGHT */}
      {resolvedSwipeRight && (
        <Animated.View
          style={[
            styles.actionBg,
            {
              left: 0,
              backgroundColor: resolvedSwipeRight.backgroundColor ?? colors.primary,
              opacity: rightReveal,
            },
          ]}
          pointerEvents="none"
        >
          {resolvedSwipeRight.icon}
        </Animated.View>
      )}

      {/* Right-side action background — visible when swiping LEFT */}
      {resolvedSwipeLeft && (
        <Animated.View
          style={[
            styles.actionBg,
            {
              right: 0,
              backgroundColor: resolvedSwipeLeft.backgroundColor ?? colors.error,
              opacity: leftReveal,
            },
          ]}
          pointerEvents="none"
        >
          {resolvedSwipeLeft.icon}
        </Animated.View>
      )}

      {/* Draggable content row */}
      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateX }] },
          onPress ? styles.clickable : undefined,
        ]}
        {...panResponder.panHandlers}
      >
        {track.album.coverUrl ? (
          <Image
            source={{ uri: track.album.coverUrl }}
            style={styles.art}
          />
        ) : (
          <View style={styles.art} />
        )}

        <View style={styles.meta}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.album.artist.name}
          </Text>
        </View>

        <Text style={styles.duration}>
          {formatDuration(track.duration)}
        </Text>
      </Animated.View>
    </View>
  );
}

// ── styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  wrapperWithDivider: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  actionBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SWIPE_MAX,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    backgroundColor: colors.surface,
    userSelect: 'none',
  },

  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.md,
  },

  meta: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },

  songTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },

  artist: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  duration: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },

  clickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    backgroundColor: colors.surface,
  },

  clickContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    userSelect: 'none',
  },

  clickActionIcon: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  clickable: {
    cursor: 'pointer',
  },

  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
