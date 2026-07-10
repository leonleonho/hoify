import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArtistsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { List, ListItem } from '@/components/list/List';

export default function ArtistsPage() {
  const router = useRouter();
  const { data, loading, error } = useQuery(ArtistsDocument);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load artists: {error.message}</Text>
      </View>
    );
  }

  const artists = data?.artists ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <List header="ALL ARTISTS">
        {artists.map((artist) => (
          <ListItem
            key={artist.id}
            title={artist.name}
            subtitle="Artist"
            onPress={() => router.push(`/artist/${artist.id}` as any)}
            divider
          />
        ))}
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
