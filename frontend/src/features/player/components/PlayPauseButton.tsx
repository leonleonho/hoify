import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

type PlayPauseButtonProps = {
  isPlaying: boolean;
  size?: 'sm' | 'lg';
  onPress: () => void;
};

/**
 * Play/pause toggle button rendered as a circled icon.
 * Used by both MiniPlayer (sm) and FullPlayer (lg).
 */
export function PlayPauseButton({
  isPlaying,
  size = 'sm',
  onPress,
}: PlayPauseButtonProps) {
  const isLarge = size === 'lg';
  const btnSize = isLarge ? 72 : 40;
  const iconSize = isLarge ? 28 : 16;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          width: btnSize,
          height: btnSize,
          borderRadius: btnSize / 2,
        },
        isLarge ? styles.btnLarge : styles.btnSmall,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
    >
      <View
        style={[
          styles.icon,
          {
            width: iconSize,
            height: iconSize,
          },
        ]}
      >
        {isPlaying ? (
          // Pause icon: two vertical bars
          <View style={styles.pauseIcon}>
            <View
              style={[
                styles.pauseBar,
                {
                  width: Math.round(iconSize * 0.3),
                  height: iconSize,
                },
              ]}
            />
            <View
              style={[
                styles.pauseBar,
                {
                  width: Math.round(iconSize * 0.3),
                  height: iconSize,
                },
              ]}
            />
          </View>
        ) : (
          // Play icon: right-pointing triangle
          <View
            style={[
              styles.playIcon,
              {
                borderLeftWidth: iconSize * 0.8,
                borderTopWidth: iconSize * 0.5,
                borderBottomWidth: iconSize * 0.5,
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    backgroundColor: colors.text,
  },
  btnLarge: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Play icon: right-pointing triangle via borders
  playIcon: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.background,
    marginLeft: 2,
  },
  // Pause icon: two vertical bars
  pauseIcon: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBar: {
    backgroundColor: colors.background,
    borderRadius: 1,
  },
});
