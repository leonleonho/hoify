import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlbumsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { List, ListItem } from '@/components/list/List';

export default function AlbumsPage() {
  const router = useRouter();
  const { data, loading, error } = useQuery(AlbumsDocument);

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
        <Text style={styles.errorText}>Failed to load albums: {error.message}</Text>
      </View>
    );
  }

  const albums = data?.albums ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <List header="ALL ALBUMS">
        {albums.map((album) => (
          <ListItem
            key={album.id}
            title={album.title}
            subtitle={album.artist.name}
            onPress={() => router.push(`/album/${album.id}` as any)}
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
