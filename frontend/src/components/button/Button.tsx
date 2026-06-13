import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  onPress,
}: ButtonProps) {
  const spinnerColor =
    variant === 'primary' ? colors.text : colors.primary;

  return (
    <Pressable
      style={({ pressed }) =>
        [
          styles.base,
          styles[`variant_${variant}` as keyof typeof styles],
          styles[`size_${size}` as keyof typeof styles],
          disabled ? styles.disabled : undefined,
          fullWidth ? styles.fullWidth : undefined,
          style,
          pressed && !disabled
            ? styles[`pressed_${variant}` as keyof typeof styles]
            : undefined,
        ] as ViewStyle[]
      }
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[styles.textBase, styles[`text_${variant}` as keyof typeof styles], styles[`textSize_${size}` as keyof typeof styles], disabled ? styles.textDisabled : undefined] as TextStyle[]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ----- base shape -------------------------------------------------
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999, // fully rounded / pill shape
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },

  // ----- variants ---------------------------------------------------
  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_secondary: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },

  // ----- pressed states ---------------------------------------------
  pressed_primary: {
    backgroundColor: colors.primaryDark,
  },
  pressed_secondary: {
    backgroundColor: colors.surface,
  },
  pressed_ghost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // ----- sizes ------------------------------------------------------
  size_sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  size_md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },

  // ----- disabled ---------------------------------------------------
  disabled: {
    opacity: 0.4,
  },

  // ----- text base --------------------------------------------------
  textBase: {
    fontWeight: '600',
  },
  text_primary: {
    color: colors.text,
  },
  text_secondary: {
    color: colors.text,
  },
  text_ghost: {
    color: colors.primary,
  },
  textSize_sm: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  textSize_md: {
    ...typography.body,
    fontWeight: '600',
  },
  textSize_lg: {
    ...typography.h3,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
