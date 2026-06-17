import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { colors, spacing, typography } from '../../constants/theme';
import { Modal } from '../modal/Modal';
import {
  MyPlaylistsDocument,
  AddTracksToPlaylistDocument,
  CreatePlaylistDocument,
  type Playlist,
} from '../../hooks/generated';

type PlaylistPickerProps = {
  visible: boolean;
  onClose: () => void;
  trackId: string;
};

export function PlaylistPicker({ visible, onClose, trackId }: PlaylistPickerProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, loading } = useQuery(MyPlaylistsDocument, { skip: !visible });
  const [addTracks] = useMutation(AddTracksToPlaylistDocument, {
    refetchQueries: ['MyPlaylists'],
  });
  const [createPlaylist] = useMutation(CreatePlaylistDocument, {
    refetchQueries: ['MyPlaylists'],
  });

  const playlists = data?.myPlaylists ?? [];

  const handleSelect = async (playlistId: string) => {
    try {
      await addTracks({ variables: { input: { playlistId, trackIds: [trackId], position: 0 } } });
    } catch {
      // silent
    }
    onClose();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data: created } = await createPlaylist({
        variables: { input: { name, trackIds: [trackId] } },
      });
      if (created?.createPlaylist) {
        // track already added via createPlaylist input
      }
    } catch {
      // silent
    }
    setCreating(false);
    setNewName('');
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add to playlist">
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.playlistRow,
                pressed ? styles.playlistRowPressed : undefined,
              ]}
              onPress={() => handleSelect(item.id)}
            >
              <Text style={styles.playlistName}>{item.name}</Text>
              <Text style={styles.playlistCount}>{item.trackCount} tracks</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No playlists yet</Text>
          }
        />
      )}

      <View style={styles.createSection}>
        <TextInput
          style={styles.input}
          placeholder="New playlist name..."
          placeholderTextColor={colors.textMuted}
          value={newName}
          onChangeText={setNewName}
        />
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed ? styles.createButtonPressed : undefined,
            (!newName.trim() || creating) ? styles.createButtonDisabled : undefined,
          ]}
          onPress={handleCreate}
          disabled={!newName.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xl,
  },
  playlistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  playlistRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playlistName: {
    ...typography.body,
    color: colors.text,
  },
  playlistCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  createSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
