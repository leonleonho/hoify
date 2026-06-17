import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export type ContextMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

type ContextMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  position: { x: number; y: number };
};

const MENU_MIN_WIDTH = 180;
const MENU_PADDING = 8;
const ITEM_HEIGHT = 44;

export function ContextMenu({ visible, onClose, items, position }: ContextMenuProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const menuRef = useRef<View>(null);
  const [menuLayout, setMenuLayout] = useState({ width: MENU_MIN_WIDTH, height: items.length * ITEM_HEIGHT + MENU_PADDING * 2 });

  const [adjustedPos, setAdjustedPos] = useState(position);

  useLayoutEffect(() => {
    let x = position.x;
    let y = position.y;
    const { width: mw, height: mh } = menuLayout;

    if (x + mw > screenW - 8) x = screenW - mw - 8;
    if (y + mh > screenH - 8) y = screenH - mh - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setAdjustedPos({ x, y });
  }, [position, menuLayout, screenW, screenH]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          ref={menuRef}
          onLayout={() => {
            menuRef.current?.measureInWindow((mx, my, mw, mh) => {
              if (mw > 0 && mh > 0) setMenuLayout({ width: mw, height: mh });
            });
          }}
          style={[
            styles.menu,
            { left: adjustedPos.x, top: adjustedPos.y, minWidth: MENU_MIN_WIDTH },
          ]}
        >
          {items.map((item, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.menuItemPressed : undefined,
              ]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              {item.icon && <View style={styles.menuItemIcon}>{item.icon}</View>}
              <Text
                style={[
                  styles.menuItemLabel,
                  item.destructive ? styles.menuItemDestructive : undefined,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingVertical: MENU_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuItemIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    ...typography.body,
    color: colors.text,
  },
  menuItemDestructive: {
    color: colors.error,
  },
});
