import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { FullPlayer } from './FullPlayer';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.92;

export function FullPlayerOverlay() {
  const { isFullPlayerOpen, closeFullPlayer } = useMusicPlayer();
  const [render, setRender] = useState(false);

  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFullPlayerOpen) {
      setRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: PANEL_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setRender(false));
    }
  }, [isFullPlayerOpen, slideAnim, backdropAnim]);

  if (!render) return null;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeFullPlayer}
          accessibilityLabel="Close player"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>
        <FullPlayer />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
});
