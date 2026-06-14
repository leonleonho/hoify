import { useQuery } from '@apollo/client/react';
import { ApolloProvider } from '@apollo/client/react';
import { Redirect, Slot, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { client } from '@/apollo/client';
import { MeDocument } from '@/hooks/generated';
import { colors } from '@/constants/theme';
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { FullPlayerOverlay } from '@/features/player/components/FullPlayerOverlay';
import { PlayerProvider } from '@/features/player/components/PlayerProvider';

/**
 * Root layout wrapper — provides Apollo client and auth gating.
 * Routes in the allow-list (login) skip the auth check.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();

  // Routes that don't need authentication
  const publicRoutes = ['login'];
  const isPublic = publicRoutes.includes(segments[0] ?? '');

  const { loading, error, data } = useQuery(MeDocument, {
    // Don't retry on auth failure — redirect to login immediately
    errorPolicy: 'all',
  });

  // Still loading auth check
  if (loading && !isPublic) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated → redirect to login
  if (error && !isPublic) {
    return <Redirect href="/login" />;
  }

  // Already authenticated on a public route (e.g. /login) → redirect to home
  if (isPublic && data) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <StatusBar style="auto" />
      <AuthGate>
        <PlayerProvider>
          <View style={styles.shell}>
            <View style={styles.content}>
              <Slot />
            </View>
            <MiniPlayer />
            <FullPlayerOverlay />
          </View>
        </PlayerProvider>
      </AuthGate>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
