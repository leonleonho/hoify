import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { FullPlayer } from './FullPlayer';

const DISMISS_THRESHOLD_RATIO = 0.25;

const FALLBACK_HEIGHT = 800;

export function FullPlayerOverlay() {
  const { isFullPlayerOpen, closeFullPlayer } = useMusicPlayer();
  const insets = useSafeAreaInsets();
  const [render, setRender] = useState(false);
  const [containerHeight, setContainerHeight] = useState(
    () => Dimensions.get('window').height || FALLBACK_HEIGHT,
  );

  const panelHeight = Math.max(containerHeight, FALLBACK_HEIGHT) * 0.92;
  const dismissThreshold = panelHeight * DISMISS_THRESHOLD_RATIO;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== containerHeight) {
      setContainerHeight(h);
    }
  };

  useEffect(() => {
    if (containerHeight <= 0) return;

    animRef.current?.stop();
    if (isFullPlayerOpen) {
      setRender(true);
      slideAnim.setValue(panelHeight);
      backdropAnim.setValue(0);
      panY.setValue(0);
      animRef.current = Animated.parallel([
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
      ]);
      animRef.current.start();
    } else {
      animRef.current = Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: panelHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start((result) => {
        if (result?.finished !== false) setRender(false);
      });
    }
  }, [isFullPlayerOpen, containerHeight, panelHeight, slideAnim, backdropAnim, panY]);

  // Safety net: never leave an invisible full-screen touch blocker mounted
  useEffect(() => {
    if (isFullPlayerOpen) return;
    const t = setTimeout(() => setRender(false), 400);
    return () => clearTimeout(t);
  }, [isFullPlayerOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > dismissThreshold || gs.vy > 0.5) {
          slideAnim.setValue(gs.dy);
          panY.setValue(0);
          closeFullPlayer();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const visible = isFullPlayerOpen || render;
  if (!visible) return null;

  const interceptTouches = isFullPlayerOpen && panelHeight > 0;

  return (
    <View
      style={styles.root}
      onLayout={onLayout}
      pointerEvents={interceptTouches ? 'auto' : 'box-none'}
    >
      <Animated.View
        pointerEvents={interceptTouches ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeFullPlayer}
          accessibilityLabel="Close player"
          accessibilityRole="button"
        />
      </Animated.View>

      {panelHeight > 0 ? (
        <Animated.View
          pointerEvents={interceptTouches ? 'auto' : 'none'}
          style={[
            styles.panel,
            { height: panelHeight, paddingBottom: insets.bottom },
            { transform: [{ translateY: Animated.add(slideAnim, panY) }] },
          ]}
        >
          <View
            style={styles.handleZone}
            testID="full-player-drag-handle"
            accessibilityLabel="Drag down to close"
            accessibilityRole="adjustable"
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
          </View>
          <View style={styles.content} pointerEvents="box-none">
            <FullPlayer />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    ...(Platform.OS === 'android' ? { elevation: 100 } : null),
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleZone: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
});
