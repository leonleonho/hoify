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
  ArtistDocument,
  UpdateArtistDocument,
} from '@/hooks/generated';
import { useCanModerate } from '@/features/auth/hooks/useCanModerate';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  artistId: string;
};

export function ArtistEditScreen({ artistId }: Props) {
  const router = useRouter();
  const { canModerate, loading: roleLoading } = useCanModerate();

  const { data, loading, error } = useQuery(ArtistDocument, {
    variables: { id: artistId },
  });
  const [updateArtist, { loading: saving }] = useMutation(UpdateArtistDocument, {
    refetchQueries: ['Artist', 'Artists', 'SearchMusic'],
  });

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data?.artist && !initialized) {
      setName(data.artist.name);
      setBio(data.artist.bio ?? '');
      setImageUrl(data.artist.imageUrl ?? '');
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
    return <Redirect href={`/artist/${artistId}` as any} />;
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.artist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load artist: ${error.message}` : 'Artist not found'}
        </Text>
      </View>
    );
  }

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Name is required.');
      return;
    }
    setFormError('');
    try {
      await updateArtist({
        variables: {
          id: artistId,
          input: {
            name: trimmed,
            bio: bio.trim() || null,
            imageUrl: imageUrl.trim() || null,
          },
        },
      });
      router.back();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save artist.');
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
        <Text style={styles.heading}>Edit artist</Text>

        {imageUrl.trim() ? (
          <Image source={{ uri: imageUrl.trim() }} style={styles.preview} />
        ) : null}

        <Input label="Name" value={name} onChangeText={setName} />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={6}
        />
        <Input
          label="Image URL"
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          autoCorrect={false}
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
  preview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: 'center',
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
