import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { List } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import type { DiscogsResult } from '../discogs/types';

type DiscogsResultsProps = {
  results: DiscogsResult[];
  loading: boolean;
  error: string | null;
};

function getTypeBadge(type: DiscogsResult['type']): string {
  switch (type) {
    case 'artist': return 'Artist';
    case 'master': return 'Album';
    case 'release': return 'Release';
    case 'label': return 'Label';
  }
}

function DiscogsResultRow({ result }: { result: DiscogsResult }) {
  const subtitleParts: string[] = [];
  if (result.year) subtitleParts.push(String(result.year));
  if (result.format?.length) subtitleParts.push(result.format.join(', '));

  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.header}>
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>{getTypeBadge(result.type)}</Text>
        </View>
        <Text style={rowStyles.genre} numberOfLines={1}>
          {result.genre?.slice(0, 2).join(', ') ?? ''}
        </Text>
      </View>
      <Text style={rowStyles.title} numberOfLines={1}>{result.title}</Text>
      {subtitleParts.length > 0 && (
        <Text style={rowStyles.subtitle} numberOfLines={1}>{subtitleParts.join(' — ')}</Text>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  genre: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export function DiscogsResults({ results, loading, error }: DiscogsResultsProps) {
  const router = useRouter();

  const handleResultPress = (result: DiscogsResult) => {
    if (result.type === 'artist') {
      router.push(`/discogs/artist/${result.id}` as any);
    } else if (result.type === 'master' || result.type === 'release') {
      router.push(`/discogs/album/${result.id}?type=${result.type}` as any);
    }
  };
  if (loading) {
    return (
      <List header="DISCOGS">
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </List>
    );
  }

  if (error) {
    return (
      <List header="DISCOGS">
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </List>
    );
  }

  if (results.length === 0) {
    return (
      <List header="DISCOGS">
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No Discogs results found</Text>
        </View>
      </List>
    );
  }

  return (
    <List header="DISCOGS">
      {results.map((result, index) => (
        <Pressable key={result.id} onPress={() => handleResultPress(result)}>
          <DiscogsResultRow result={result} />
          {index < results.length - 1 && <View style={styles.divider} />}
        </Pressable>
      ))}
    </List>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
