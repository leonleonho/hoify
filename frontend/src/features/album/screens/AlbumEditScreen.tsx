import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { Redirect, useRouter } from 'expo-router';
import {
  AlbumDocument,
  UpdateAlbumDocument,
  UpdateAlbumArtDocument,
} from '@/hooks/generated';
import { useCanModerate } from '@/features/auth/hooks/useCanModerate';
import { pickAlbumArtImage } from '@/features/music/utils/pickAlbumArtImage';
import { EntitySuggest } from '@/components/suggest/EntitySuggest';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { artUrl } from '@/constants/api';

type Props = {
  albumId: string;
};

export function AlbumEditScreen({ albumId }: Props) {
  const router = useRouter();
  const { canModerate, loading: roleLoading } = useCanModerate();

  const { data, loading, error, refetch } = useQuery(AlbumDocument, {
    variables: { id: albumId },
  });
  const [updateAlbum, { loading: saving }] = useMutation(UpdateAlbumDocument, {
    refetchQueries: ['Album', 'Albums', 'Artist', 'SearchMusic'],
  });
  const [updateAlbumArt, { loading: uploadingArt }] = useMutation(
    UpdateAlbumArtDocument,
    { refetchQueries: ['Album', 'Albums'] },
  );

  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artistLabel, setArtistLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data?.album && !initialized) {
      setTitle(data.album.title);
      setReleaseYear(
        data.album.releaseYear != null ? String(data.album.releaseYear) : '',
      );
      setArtistId(data.album.artist.id);
      setArtistLabel(data.album.artist.name);
      setInitialized(true);
    }
  }, [data, initialized]);

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!canModerate) {
    return <Redirect href={`/album/${albumId}` as any} />;
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.album) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load album: ${error.message}` : 'Album not found'}
        </Text>
      </View>
    );
  }

  const coverUri = artUrl(data.album.coverUrl);

  const handleReplaceArt = async () => {
    setFormError('');
    try {
      const picked = await pickAlbumArtImage();
      if (!picked) return;
      await updateAlbumArt({
        variables: {
          albumId,
          input: {
            imageBase64: picked.imageBase64,
            mimeType: picked.mimeType,
          },
        },
      });
      await refetch();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'Failed to update album art.',
      );
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }
    if (!artistId) {
      setFormError('Select an existing artist from the suggestions.');
      return;
    }

    let year: number | null = null;
    if (releaseYear.trim()) {
      const parsed = Number.parseInt(releaseYear.trim(), 10);
      if (Number.isNaN(parsed)) {
        setFormError('Release year must be a number.');
        return;
      }
      year = parsed;
    }

    setFormError('');
    try {
      await updateAlbum({
        variables: {
          id: albumId,
          input: {
            title: trimmedTitle,
            artistId,
            releaseYear: year,
          },
        },
      });
      router.back();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save album.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Edit album</Text>

        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>No art</Text>
          </View>
        )}

        <Button
          title="Replace album art"
          variant="secondary"
          onPress={handleReplaceArt}
          loading={uploadingArt}
          fullWidth
        />

        <Input label="Title" value={title} onChangeText={setTitle} />

        <EntitySuggest
          label="Artist"
          mode="artists"
          selectedId={artistId}
          selectedLabel={artistLabel}
          onSelect={(item) => {
            setArtistId(item.id);
            setArtistLabel(item.label);
          }}
          error={
            !artistId && formError.includes('artist')
              ? 'Select an existing artist'
              : undefined
          }
        />

        <Input
          label="Release year"
          value={releaseYear}
          onChangeText={setReleaseYear}
          keyboardType="number-pad"
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Button
          title="Save"
          onPress={handleSave}
          loading={saving}
          fullWidth
          style={styles.saveButton}
        />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 12,
    alignSelf: 'center',
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.sm,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
