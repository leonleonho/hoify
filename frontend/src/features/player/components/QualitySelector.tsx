import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import type { PlayerQuality } from '../types/player';

const OPTIONS: { value: PlayerQuality; label: string }[] = [
  { value: 'original', label: 'Orig' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Med' },
  { value: 'low', label: 'Low' },
];

type QualitySelectorProps = {
  quality: PlayerQuality;
  onQualityChange: (q: PlayerQuality) => void;
};

export function QualitySelector({ quality, onQualityChange }: QualitySelectorProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = quality === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onQualityChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`${opt.label} quality`}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.text,
  },
});
