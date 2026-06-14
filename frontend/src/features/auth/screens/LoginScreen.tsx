import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button } from '../../../components/button/Button';
import { Input } from '../../../components/input/Input';
import { useLogin } from '../hooks/useLogin';

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, loading, error } = useLogin();

  const displayError = error?.message ?? localError;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter your email and password.');
      return;
    }
    setLocalError('');

    try {
      const result = await login(email.trim(), password);
      // Only navigate on success — errors throw or return error data
      if (result.data?.login) {
        router.replace('/');
      }
    } catch {
      setLocalError('An unexpected error occurred. Please try again.');
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
        <View style={styles.header}>
          <Text style={styles.brand}>Hoify</Text>
          <Text style={styles.tagline}>Your music, your vibe</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={loading}
          />

          <View style={styles.spacer} />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            disabled={loading}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {displayError ? (
            <Text style={styles.errorText}>{displayError}</Text>
          ) : undefined}

          <View style={styles.spacerLarge} />

          <Button
            title="Log In"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}
          />

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              styles.forgotLink,
              pressed ? styles.forgotPressed : undefined,
            ]}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => {}}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },

  // ── header ──
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  brand: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── form ──
  form: {
    gap: 0,
  },
  spacer: {
    height: spacing.md,
  },
  spacerLarge: {
    height: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  forgotLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotPressed: {
    opacity: 0.7,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // ── footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  signUpText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
