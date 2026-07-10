import { Pressable, StyleSheet, View, Text } from 'react-native';
import { ListMusic, Heart } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  id: string;
  name: string;
  trackCount: number;
  isLiked?: boolean;
  onPress?: () => void;
};

export function PlaylistTile({ name, trackCount, isLiked, onPress }: Props) {

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconBg, isLiked && styles.likedBg]}>
        {isLiked ? (
          <Heart size={28} color={colors.primary} fill={colors.primary} />
        ) : (
          <ListMusic size={28} color={colors.textSecondary} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.count}>
        {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 150,
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  iconBg: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  likedBg: {
    backgroundColor: colors.surfaceLight,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
