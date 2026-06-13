import { useQuery } from '@apollo/client/react';
import { StyleSheet, Text, View } from 'react-native';
import { HelloDocument } from '@/hooks/generated';

export default function IndexScreen() {
  const { loading, error, data } = useQuery(HelloDocument);

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
