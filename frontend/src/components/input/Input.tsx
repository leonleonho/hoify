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
  multiline,
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
    multiline ? styles.containerMultiline : undefined,
    focused && !error ? styles.containerFocused : undefined,
    error ? styles.containerError : undefined,
    disabled ? styles.containerDisabled : undefined,
  ] as ViewStyle[];

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={containerStyles}>
        <RNTextInput
          style={[styles.input, multiline ? styles.inputMultiline : undefined]}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
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
  containerMultiline: {
    height: undefined,
    minHeight: 120,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
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
  inputMultiline: {
    height: undefined,
    minHeight: 104,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
