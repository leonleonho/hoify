import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import type { Track } from '@/hooks/generated';

type TrackInfoProps = {
  track: Track;
  /** Optional: larger artwork for full player, smaller for mini */
  variant?: 'mini' | 'full';
};

/** Displays album art placeholder + track title, artist, album name */
export function TrackInfo({ track, variant = 'full' }: TrackInfoProps) {
  const isMini = variant === 'mini';

  return (
    <View style={[styles.row, isMini ? styles.rowMini : styles.rowFull]}>
      {/* Album art placeholder */}
      <View
        style={[
          styles.art,
          isMini ? styles.artMini : styles.artFull,
        ]}
        accessibilityLabel={`Album art for ${track.album.title}`}
      />
      {/* Metadata */}
      <View style={isMini ? styles.metaMini : styles.metaFull}>
        <Text
          style={[typography.h3, styles.title]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text
          style={[typography.bodySmall, styles.subtitle]}
          numberOfLines={1}
        >
          {track.album.artist.name}
          {!isMini && ` — ${track.album.title}`}
        </Text>
      </View>
    </View>
  );
}

const ART_MINI = 48;
const ART_FULL = 300;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMini: {
    flex: 1,
    gap: spacing.sm,
  },
  rowFull: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  art: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
  },
  artMini: {
    width: ART_MINI,
    height: ART_MINI,
    borderRadius: 4,
  },
  artFull: {
    width: ART_FULL,
    height: ART_FULL,
    borderRadius: 8,
  },
  metaMini: {
    flex: 1,
  },
  metaFull: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});
