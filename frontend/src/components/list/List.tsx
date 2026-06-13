import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

// ── types ───────────────────────────────────────────────────────────
export type ListItemProps = {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
};

type ListProps = {
  header?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

// ── sub-components ──────────────────────────────────────────────────
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  divider = true,
}: ListItemProps) {
  const content = (
    <View style={divider ? styles.itemWithDivider : styles.item}>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) =>
          [
            pressed ? styles.pressed : undefined,
          ] as ViewStyle[]
        }
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export function List({ header, children, style }: ListProps) {
  return (
    <View style={[styles.listWrapper, style]}>
      {header && <Text style={styles.header}>{header}</Text>}
      <View style={styles.listCard}>{children}</View>
    </View>
  );
}

// ── styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listWrapper: {
    gap: spacing.sm,
  },
  header: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  itemWithDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  // slots
  leading: {
    marginRight: spacing.md,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    marginLeft: spacing.md,
  },

  // text
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // interaction
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
