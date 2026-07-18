import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Users, Disc3, Search, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';

type Category = 'artists' | 'albums' | 'find';

const CATEGORY_MAP: Record<Category, { label: string; Icon: typeof Users }> = {
  artists: { label: 'Artists', Icon: Users },
  albums: { label: 'Albums', Icon: Disc3 },
  find: { label: 'Find music', Icon: Search },
};

type Props = {
  category: Category;
  onPress?: () => void;
};

export function CategoryTile({ category, onPress }: Props) {
  const { label, Icon } = CATEGORY_MAP[category];

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Icon size={28} color={colors.primary} />
      <View style={styles.textRow}>
        <Text style={styles.label}>{label}</Text>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  textRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.h3,
    color: colors.text,
  },
});
