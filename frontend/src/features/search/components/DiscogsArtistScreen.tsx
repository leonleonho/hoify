import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import { fetchDiscogsArtist, fetchDiscogsArtistReleases } from '../discogs/client';
import type { DiscogsArtistDetail, DiscogsArtistRelease } from '../discogs/detail-types';

type Props = { artistId: string };

export function DiscogsArtistScreen({ artistId }: Props) {
  const router = useRouter();
  const [artist, setArtist] = useState<DiscogsArtistDetail | null>(null);
  const [releases, setReleases] = useState<DiscogsArtistRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchDiscogsArtist(Number(artistId)),
      fetchDiscogsArtistReleases(Number(artistId)),
    ])
      .then(([artistData, releasesData]) => {
        if (!cancelled) {
          setArtist(artistData);
          setReleases(releasesData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load artist');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [artistId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Artist not found'}</Text>
      </View>
    );
  }

  const primaryImage = artist.images?.find((i) => i.type === 'primary') ?? artist.images?.[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        {primaryImage && (
          <Image source={{ uri: primaryImage.uri }} style={styles.artistImage} />
        )}
        <Text style={styles.artistName}>{artist.name}</Text>
        {artist.profile && (
          <Text style={styles.profile}>{artist.profile}</Text>
        )}
      </View>

      {/* Releases / Albums */}
      {releases.length > 0 && (
        <List header="RELEASES">
          {releases.map((release, i) => (
            <ListItem
              key={`${release.id}-${i}`}
              title={release.title}
              subtitle={release.year?.toString() ?? release.role}
              onPress={() => router.push(`/discogs/album/${release.id}?type=${release.type}` as any)}
              divider={i < releases.length - 1}
            />
          ))}
        </List>
      )}

      {/* Members */}
      {artist.members && artist.members.length > 0 && (
        <List header="MEMBERS">
          {artist.members.map((member) => (
            <ListItem
              key={member.id}
              title={member.name}
              subtitle={member.active ? 'Active' : 'Inactive'}
              divider
            />
          ))}
        </List>
      )}

      {/* External links */}
      {artist.urls && artist.urls.length > 0 && (
        <List header="LINKS">
          {artist.urls.map((url, i) => (
            <ListItem
              key={i}
              title={url.replace(/^https?:\/\//, '')}
              onPress={() => Linking.openURL(url)}
              divider={i < (artist.urls?.length ?? 0) - 1}
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
  artistImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surfaceLight,
  },
  artistName: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  profile: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
