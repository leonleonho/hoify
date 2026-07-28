import { Pressable, StyleSheet, View, Text } from 'react-native';
import { ListMusic, Heart, Download } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  id: string;
  name: string;
  trackCount: number;
  isLiked?: boolean;
  /** Show a small download badge when the playlist is available offline. */
  offlineReady?: boolean;
  onPress?: () => void;
};

export function PlaylistTile({ name, trackCount, isLiked, offlineReady, onPress }: Props) {

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
        {offlineReady ? (
          <View style={styles.offlineBadge}>
            <Download size={12} color={colors.text} />
          </View>
        ) : null}
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
  offlineBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
