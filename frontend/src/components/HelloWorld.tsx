import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type HelloWorldProps = {
  name?: string;
};

export function HelloWorld({ name = 'World' }: HelloWorldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>👋</Text>
      <Text style={styles.greeting}>Hello, {name}!</Text>
      <Text style={styles.subtitle}>Welcome to Hoify Storybook</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#121212',
    borderRadius: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
  },
});
