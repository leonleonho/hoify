import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { Redirect, useRouter } from 'expo-router';
import {
  TrackDocument,
  UpdateTrackDocument,
  DeleteTrackDocument,
} from '@/hooks/generated';
import { useCanModerate } from '@/features/auth/hooks/useCanModerate';
import { EntitySuggest } from '@/components/suggest/EntitySuggest';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  trackId: string;
};

export function TrackEditScreen({ trackId }: Props) {
  const router = useRouter();
  const { canModerate, loading: roleLoading } = useCanModerate();

  const { data, loading, error } = useQuery(TrackDocument, {
    variables: { id: trackId },
  });
  const [updateTrack, { loading: saving }] = useMutation(UpdateTrackDocument, {
    refetchQueries: ['Track', 'Album', 'Artist', 'SearchMusic', 'Playlist'],
  });
  const [deleteTrack, { loading: deleting }] = useMutation(DeleteTrackDocument, {
    refetchQueries: ['Track', 'Album', 'Artist', 'SearchMusic', 'Playlist'],
  });

  const [title, setTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [albumLabel, setAlbumLabel] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [discNumber, setDiscNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data?.track && !initialized) {
      const track = data.track;
      setTitle(track.title);
      setTrackArtist(track.trackArtist ?? '');
      setAlbumId(track.album.id);
      setAlbumLabel(
        track.album.artist?.name
          ? `${track.album.title} — ${track.album.artist.name}`
          : track.album.title,
      );
      setTrackNumber(
        track.trackNumber != null ? String(track.trackNumber) : '',
      );
      setDiscNumber(track.discNumber != null ? String(track.discNumber) : '');
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
    return <Redirect href="/" />;
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.track) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load track: ${error.message}` : 'Track not found'}
        </Text>
      </View>
    );
  }

  const parseOptionalInt = (value: string): number | null | undefined => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }
    if (!albumId) {
      setFormError('Select an existing album from the suggestions.');
      return;
    }

    const parsedTrackNumber = parseOptionalInt(trackNumber);
    if (parsedTrackNumber === undefined) {
      setFormError('Track number must be a number.');
      return;
    }
    const parsedDiscNumber = parseOptionalInt(discNumber);
    if (parsedDiscNumber === undefined) {
      setFormError('Disc number must be a number.');
      return;
    }

    setFormError('');
    try {
      await updateTrack({
        variables: {
          id: trackId,
          input: {
            title: trimmedTitle,
            trackArtist: trackArtist.trim() || null,
            albumId,
            trackNumber: parsedTrackNumber,
            discNumber: parsedDiscNumber,
          },
        },
      });
      router.back();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save track.');
    }
  };

  const performDelete = async () => {
    setFormError('');
    try {
      await deleteTrack({ variables: { id: trackId } });
      router.back();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'Failed to delete track.',
      );
    }
  };

  const handleDelete = () => {
    // Alert.alert is a no-op on web; use window.confirm there.
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Delete this track? This cannot be undone.')
      ) {
        void performDelete();
      }
      return;
    }

    Alert.alert(
      'Delete track',
      'Delete this track? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDelete();
          },
        },
      ],
    );
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
        <Text style={styles.heading}>Edit track</Text>

        <Input label="Title" value={title} onChangeText={setTitle} />
        <Input
          label="Track artist"
          value={trackArtist}
          onChangeText={setTrackArtist}
        />

        <EntitySuggest
          label="Album"
          mode="albums"
          selectedId={albumId}
          selectedLabel={albumLabel}
          onSelect={(item) => {
            setAlbumId(item.id);
            setAlbumLabel(
              item.subtitle ? `${item.label} — ${item.subtitle}` : item.label,
            );
          }}
        />

        <Input
          label="Track number"
          value={trackNumber}
          onChangeText={setTrackNumber}
          keyboardType="number-pad"
        />
        <Input
          label="Disc number"
          value={discNumber}
          onChangeText={setDiscNumber}
          keyboardType="number-pad"
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Button
          title="Save"
          onPress={handleSave}
          loading={saving}
          disabled={deleting}
          fullWidth
          style={styles.saveButton}
        />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          disabled={saving || deleting}
          fullWidth
        />
        <Button
          title="Delete"
          variant="ghost"
          destructive
          onPress={handleDelete}
          loading={deleting}
          disabled={saving}
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
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
