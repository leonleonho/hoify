import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { StyleSheet, Text, View } from 'react-native';
import { HelloDocument } from '@/hooks/generated';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import type { Track } from '@/hooks/generated';

/** Minimal mock track for testing — plays NEIJ.mp3 from the stream endpoint. */
function demoTrack(): Track {
  const now = new Date().toISOString();
  return {
    __typename: 'Track',
    id: 'demo-neij',
    title: 'NEIJ Demo',
    filePath: 'NEIJ.mp3',
    duration: null,
    fileFormat: 'mp3',
    fileSize: null,
    discNumber: null,
    trackNumber: null,
    createdAt: now,
    updatedAt: now,
    genres: [],
    album: {
      __typename: 'Album',
      id: 'demo-album',
      title: 'Demo',
      coverUrl: null,
      releaseYear: null,
      createdAt: now,
      updatedAt: now,
      tracks: [],
      artist: {
        __typename: 'Artist',
        id: 'demo-artist',
        name: 'Demo Artist',
        bio: null,
        imageUrl: null,
        createdAt: now,
        updatedAt: now,
        albums: [],
      },
    },
  };
}

export default function IndexScreen() {
  const { loading, error, data } = useQuery(HelloDocument);
  const { load } = useMusicPlayer();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load(demoTrack());
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoify</Text>
      <Text style={styles.subtitle}>Music Player</Text>

      {loading && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>Connecting to server…</Text>
        </View>
      )}

      {error && (
        <View style={[styles.statusBox, styles.errorBox]}>
          <Text style={styles.errorText}>
            Connection failed: {error.message}
          </Text>
        </View>
      )}

      {data && (
        <View style={[styles.statusBox, styles.successBox]}>
          <Text style={styles.successText}>
            Connected! {data.artists?.length ?? 0} artists found.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B3B3B3',
    marginBottom: 32,
  },
  statusBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  errorBox: {
    backgroundColor: '#2D1515',
  },
  successBox: {
    backgroundColor: '#152D1E',
  },
  statusText: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  successText: {
    color: '#6BFF8A',
    fontSize: 14,
  },
});
