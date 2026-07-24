import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
import { Heart, Plus, MoreVertical } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { colors, spacing, typography } from '../../constants/theme';
import { artUrl } from '../../constants/api';
import type { Track } from '../../hooks/generated/types';
import { LikeTrackDocument, UnlikeTrackDocument } from '../../hooks/generated';
import { useMusicPlayer } from '../../features/player/components/PlayerProvider';
import { useCanModerate } from '../../features/auth/hooks/useCanModerate';
import { ContextMenu } from '../ui/ContextMenu';
import { PlaylistPicker } from '../ui/PlaylistPicker';

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
  /** Background colour revealed on swipe (default: primary for right, secondary for left) */
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
  backgroundColor: colors.secondary,
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
export const SongListItem = React.memo(function SongListItem({
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
  const { playNext } = useMusicPlayer();
  const router = useRouter();
  const { canModerate } = useCanModerate();

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const moreButtonRef = useRef<View>(null);

  const handleContextMenu = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault?.();
    setContextMenuPosition({ x: e.nativeEvent?.pageX ?? e.pageX, y: e.nativeEvent?.pageY ?? e.pageY });
    setContextMenuVisible(true);
  }, []);

  const handleMorePress = useCallback(() => {
    moreButtonRef.current?.measureInWindow((x, y, w, h) => {
      setContextMenuPosition({ x, y: y + h + 4 });
      setContextMenuVisible(true);
    });
  }, []);

  const handleAddToQueue = useCallback(() => {
    playNext(track);
  }, [playNext, track]);

  const handleGoToArtist = useCallback(() => {
    router.push(`/artist/${track.album.artist.id}` as any);
  }, [router, track]);

  const handleGoToAlbum = useCallback(() => {
    router.push(`/album/${track.album.id}` as any);
  }, [router, track]);

  const handleAddToPlaylist = useCallback(() => {
    setPlaylistPickerVisible(true);
  }, []);

  const handleEditTrack = useCallback(() => {
    router.push(`/track/${track.id}/edit` as any);
  }, [router, track.id]);

  const contextMenuItems = useMemo(() => {
    const items = [
      { label: 'Add to queue', icon: undefined, onPress: handleAddToQueue },
      { label: 'Add to playlist', icon: undefined, onPress: handleAddToPlaylist },
      { label: 'Go to artist', icon: undefined, onPress: handleGoToArtist },
      { label: 'Go to album', icon: undefined, onPress: handleGoToAlbum },
    ];
    if (canModerate) {
      items.push({ label: 'Edit', icon: undefined, onPress: handleEditTrack });
    }
    return items;
  }, [
    canModerate,
    handleAddToQueue,
    handleAddToPlaylist,
    handleGoToArtist,
    handleGoToAlbum,
    handleEditTrack,
  ]);

  const resolvedSwipeRight = useMemo(() => swipeRightAction ?? {
    icon: <Heart size={22} color="#fff" fill={track.liked ? '#fff' : 'transparent'} />,
    onAction: () => {
      const isLiked = track.liked ?? false;
      const mutate = isLiked ? unlikeTrack : likeTrack;
      mutate({ variables: { trackId: track.id } });
    },
    backgroundColor: colors.primary,
  }, [swipeRightAction, track.id, track.liked, likeTrack, unlikeTrack]);

  const resolvedSwipeLeft = useMemo(() => swipeLeftAction ?? {
    icon: <Plus size={22} color="#fff" />,
    onAction: () => playNext(track),
    backgroundColor: colors.secondary,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipeLeftAction, playNext, track?.id]);

  const translateX = useRef(new Animated.Value(0)).current;
  const callbacksRef = useRef({ onPress, swipeLeftAction: resolvedSwipeLeft, swipeRightAction: resolvedSwipeRight });
  const gestureStartX = useRef(0);
  const gestureDx = useRef(0);

  useEffect(() => {
    callbacksRef.current = { onPress, swipeLeftAction: resolvedSwipeLeft, swipeRightAction: resolvedSwipeRight };
  });

  // ── click mode ───────────────────────────────────────────────────
  if (!useSwipe) {
    const bgFlash = useRef(new Animated.Value(0)).current;
    const bgColor = bgFlash.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.surface, colors.primaryDark],
    });

    const animateFlashIn = () => {
      Animated.timing(bgFlash, { toValue: 1, duration: 80, useNativeDriver: false }).start();
    };

    const animateFlashOut = () => {
      Animated.timing(bgFlash, { toValue: 0, duration: 250, useNativeDriver: false }).start();
    };

    const content = (
      <View style={styles.clickContent}>
        {track.album.coverUrl ? (
          <Image source={{ uri: artUrl(track.album.coverUrl) }} style={styles.art} />
        ) : (
          <View style={styles.art} />
        )}
        <View style={styles.meta}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.trackArtist ?? track.album.artist.name}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
      </View>
    );

    return (
      <>
        <Animated.View
          style={[
            divider ? styles.wrapperWithDivider : styles.wrapper,
            styles.clickContainer,
            onPress ? styles.clickable : undefined,
            { backgroundColor: onPress ? bgColor : colors.surface },
          ]}
          {...(Platform.OS === 'web' ? { onContextMenu: handleContextMenu } : {})}
        >
          {onPress ? (
            <Pressable
              onPress={onPress}
              onPressIn={animateFlashIn}
              onPressOut={animateFlashOut}
              style={styles.clickFullWidth}
            >
              {content}
            </Pressable>
          ) : (
            <View style={styles.clickFullWidth}>{content}</View>
          )}

          {resolvedSwipeLeft && (
            <Pressable
              onPress={resolvedSwipeLeft.onAction}
              style={({ pressed }) =>
                [
                  styles.clickActionIcon,
                  pressed ? styles.actionIconPressed : undefined,
                ] as any
              }
            >
              {resolvedSwipeLeft.icon}
            </Pressable>
          )}
          {resolvedSwipeRight && (
            <Pressable
              onPress={resolvedSwipeRight.onAction}
              style={({ pressed }) =>
                [
                  styles.clickActionIcon,
                  pressed ? styles.actionIconPressed : undefined,
                ] as any
              }
            >
              {resolvedSwipeRight.icon}
            </Pressable>
          )}

          <View ref={moreButtonRef}>
            <Pressable
              onPress={handleMorePress}
              style={({ pressed }) =>
                [
                  styles.clickActionIcon,
                  pressed ? styles.actionIconPressed : undefined,
                ] as any
              }
            >
              <MoreVertical size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>

        <ContextMenu
          visible={contextMenuVisible}
          onClose={() => setContextMenuVisible(false)}
          position={contextMenuPosition}
          items={contextMenuItems}
        />
        <PlaylistPicker
          visible={playlistPickerVisible}
          onClose={() => setPlaylistPickerVisible(false)}
          trackId={track.id}
        />
      </>
    );
  }

  // ── swipe mode ────────────────────────────────────────────────────
  // swipe-right bg opacity (left side of container, fades in as content slides right)
  const rightReveal = useMemo(() => translateX.interpolate({
    inputRange: [0, SWIPE_MAX * 0.3, SWIPE_MAX],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  }), [translateX]);

  // swipe-left bg opacity (right side of container, fades in as content slides left)
  const leftReveal = useMemo(() => translateX.interpolate({
    inputRange: [-SWIPE_MAX, -SWIPE_MAX * 0.3, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  }), [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 5,
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
    <View
      style={divider ? styles.wrapperWithDivider : styles.wrapper}
      {...(Platform.OS === 'web' ? { onContextMenu: handleContextMenu } : {})}
    >
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
              backgroundColor: resolvedSwipeLeft.backgroundColor ?? colors.secondary,
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
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            userSelect: 'none',
            backgroundColor: pressed ? colors.primaryDark : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {track.album.coverUrl ? (
            <Image
              source={{ uri: artUrl(track.album.coverUrl) }}
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
              {track.trackArtist ?? track.album.artist.name}
            </Text>
          </View>

          <Text style={styles.duration}>
            {formatDuration(track.duration)}
          </Text>
        </Pressable>

        <View ref={moreButtonRef}>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); handleMorePress(); }}
            hitSlop={8}
            style={({ pressed }) =>
              [
                styles.clickActionIcon,
                pressed ? styles.actionIconPressed : undefined,
              ] as any
            }
          >
            <MoreVertical size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      <ContextMenu
        visible={contextMenuVisible}
        onClose={() => setContextMenuVisible(false)}
        position={contextMenuPosition}
        items={contextMenuItems}
      />
      <PlaylistPicker
        visible={playlistPickerVisible}
        onClose={() => setPlaylistPickerVisible(false)}
        trackId={track.id}
      />
    </View>
  );
});

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
    paddingRight: spacing.sm,
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
    marginRight: spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    userSelect: 'none',
  },

  clickFullWidth: {
    flex: 1,
  },

  clickActionIcon: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionIconPressed: {
    transform: [{ scale: 0.85 }],
    opacity: 0.7,
  },

  clickable: {
    cursor: 'pointer',
  },

  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
