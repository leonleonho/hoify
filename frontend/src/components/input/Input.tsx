import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

type InputProps = {
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
} & Omit<RNTextInputProps, 'style' | 'placeholderTextColor'>;

export function Input({
  label,
  error,
  disabled = false,
  style,
  onBlur,
  onFocus,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: any) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    onBlur?.(e);
  };

  const containerStyles = [
    styles.container,
    focused && !error ? styles.containerFocused : undefined,
    error ? styles.containerError : undefined,
    disabled ? styles.containerDisabled : undefined,
  ] as ViewStyle[];

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={containerStyles}>
        <RNTextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    height: 48,
  },
  containerFocused: {
    borderColor: colors.primary,
  },
  containerError: {
    borderColor: colors.error,
  },
  containerDisabled: {
    opacity: 0.4,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    height: '100%',
    padding: 0,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  error: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
