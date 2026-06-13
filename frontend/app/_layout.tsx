import { ApolloProvider } from '@apollo/client/react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { client } from '@/apollo/client';

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <StatusBar style="auto" />
      <Slot />
    </ApolloProvider>
  );
}
