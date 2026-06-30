import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import { fetchDiscogsRelease } from '../discogs/client';
import type { DiscogsReleaseDetail, DiscogsDetailType } from '../discogs/detail-types';

type Props = { albumId: string; type: DiscogsDetailType };

export function DiscogsAlbumScreen({ albumId, type }: Props) {
  const [release, setRelease] = useState<DiscogsReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDiscogsRelease(Number(albumId), type)
      .then((data) => {
        if (!cancelled) setRelease(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load album');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [albumId, type]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !release) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Album not found'}</Text>
      </View>
    );
  }

  const coverImage = release.images?.[0];
  const artistNames = release.artists.map((a) => a.name).join(', ');
  const formatParts = release.formats?.map((f) => {
    const desc = f.descriptions?.join(', ');
    return desc ? `${f.name} (${desc})` : f.name;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        {coverImage && (
          <Image source={{ uri: coverImage.uri }} style={styles.coverImage} />
        )}
        <Text style={styles.title}>{release.title}</Text>
        <Text style={styles.artistName}>{artistNames}</Text>
        {release.year && <Text style={styles.year}>{release.year}</Text>}
      </View>

      {/* Genre/Style badges */}
      {release.genres && release.genres.length > 0 && (
        <View style={styles.tagRow}>
          {release.genres.map((g) => (
            <View key={g} style={styles.tag}>
              <Text style={styles.tagText}>{g}</Text>
            </View>
          ))}
          {release.styles?.map((s) => (
            <View key={s} style={styles.styleTag}>
              <Text style={styles.styleTagText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tracklist */}
      {release.tracklist.length > 0 && (
        <List header="TRACKLIST">
          {release.tracklist.map((track, i) => (
            <ListItem
              key={`${track.position}-${i}`}
              title={`${track.position}. ${track.title}`}
              subtitle={track.duration}
              divider={i < release.tracklist.length - 1}
            />
          ))}
        </List>
      )}

      {/* Format info */}
      {formatParts && formatParts.length > 0 && (
        <List header="FORMAT">
          {formatParts.map((fmt, i) => (
            <ListItem
              key={i}
              title={fmt}
              divider={i < formatParts.length - 1}
            />
          ))}
        </List>
      )}

      {/* Label */}
      {release.labels && release.labels.length > 0 && (
        <List header="LABEL">
          {release.labels.map((label, i) => (
            <ListItem
              key={i}
              title={label.name}
              subtitle={label.catno}
              divider={i < (release.labels?.length ?? 0) - 1}
            />
          ))}
        </List>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coverImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  artistName: {
    ...typography.h2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  year: {
    ...typography.body,
    color: colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  styleTag: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleTagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
