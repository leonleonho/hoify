import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { artUrl } from '../../constants/api';
import type { Track } from '../../hooks/generated/types';

const ROW_HEIGHT = 60;
const ART_SIZE = 44;

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type ReorderableTrackListProps = {
  tracks: Track[];
  onOrderChange: (tracks: Track[]) => void;
  disabled?: boolean;
  onDraggingChange?: (dragging: boolean) => void;
};

type RowProps = {
  track: Track;
  index: number;
  isLast: boolean;
  disabled: boolean;
  isDragging: boolean;
  dimmed: boolean;
  translateY: Animated.Value;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
};

function ReorderableRow({
  track,
  index,
  isLast,
  disabled,
  isDragging,
  dimmed,
  translateY,
  onDragStart,
  onDragMove,
  onDragEnd,
}: RowProps) {
  const indexRef = useRef(index);
  indexRef.current = index;

  const callbacksRef = useRef({ onDragStart, onDragMove, onDragEnd, disabled });
  callbacksRef.current = { onDragStart, onDragMove, onDragEnd, disabled };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !callbacksRef.current.disabled,
      onMoveShouldSetPanResponder: () => !callbacksRef.current.disabled,
      onPanResponderGrant: () => {
        callbacksRef.current.onDragStart(indexRef.current);
      },
      onPanResponderMove: (
        _: GestureResponderEvent,
        gesture: PanResponderGestureState,
      ) => {
        callbacksRef.current.onDragMove(gesture.dy);
      },
      onPanResponderRelease: () => {
        callbacksRef.current.onDragEnd();
      },
      onPanResponderTerminate: () => {
        callbacksRef.current.onDragEnd();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.row,
        !isLast ? styles.rowDivider : undefined,
        isDragging
          ? {
              zIndex: 10,
              elevation: 4,
              backgroundColor: colors.surfaceLight,
              transform: [{ translateY }],
              opacity: 0.95,
            }
          : dimmed
            ? { opacity: 0.55 }
            : undefined,
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.grip}>
        <GripVertical size={20} color={colors.textMuted} />
      </View>

      {track.album.coverUrl ? (
        <Image
          source={{ uri: artUrl(track.album.coverUrl) }}
          style={styles.art}
        />
      ) : (
        <View style={styles.art} />
      )}

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.trackArtist ?? track.album.artist.name}
        </Text>
      </View>
    </Animated.View>
  );
}

export function ReorderableTrackList({
  tracks,
  onOrderChange,
  disabled = false,
  onDraggingChange,
}: ReorderableTrackListProps) {
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const startIndexRef = useRef(0);
  const currentIndexRef = useRef(0);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  // Keep a stable Animated.Value of 0 for non-dragging rows
  const zeroY = useRef(new Animated.Value(0)).current;
  const onDraggingChangeRef = useRef(onDraggingChange);
  onDraggingChangeRef.current = onDraggingChange;

  const handleDragStart = useCallback(
    (index: number) => {
      startIndexRef.current = index;
      currentIndexRef.current = index;
      translateY.setValue(0);
      setDraggingIndex(index);
      onDraggingChangeRef.current?.(true);
    },
    [translateY],
  );

  const handleDragMove = useCallback(
    (dy: number) => {
      const start = startIndexRef.current;
      const length = tracksRef.current.length;
      if (length === 0) return;

      const target = Math.max(
        0,
        Math.min(length - 1, start + Math.round(dy / ROW_HEIGHT)),
      );

      if (target !== currentIndexRef.current) {
        const reordered = moveItem(
          tracksRef.current,
          currentIndexRef.current,
          target,
        );
        tracksRef.current = reordered;
        onOrderChange(reordered);
        currentIndexRef.current = target;
        setDraggingIndex(target);
      }

      const visualOffset = dy - (currentIndexRef.current - start) * ROW_HEIGHT;
      translateY.setValue(visualOffset);
    },
    [onOrderChange, translateY],
  );

  const handleDragEnd = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setDraggingIndex(null);
    onDraggingChangeRef.current?.(false);
  }, [translateY]);

  // Sync tracksRef if parent resets order while not dragging
  useEffect(() => {
    if (draggingIndex == null) {
      tracksRef.current = tracks;
    }
  }, [tracks, draggingIndex]);

  return (
    <View style={styles.list}>
      {tracks.map((track, index) => (
        <ReorderableRow
          key={track.id}
          track={track}
          index={index}
          isLast={index === tracks.length - 1}
          disabled={disabled}
          isDragging={draggingIndex === index}
          dimmed={draggingIndex != null && draggingIndex !== index}
          translateY={draggingIndex === index ? translateY : zeroY}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_HEIGHT,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    backgroundColor: colors.surface,
    userSelect: 'none',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  grip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
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
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  artist: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
