import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { ContextMenu } from './ContextMenu';
import { colors, typography, spacing } from '../../constants/theme';

const meta = {
  title: 'UI/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    visible: true,
    position: { x: 50, y: 60 },
    items: [
      { label: 'Add to queue', onPress: () => {} },
      { label: 'Add to playlist', onPress: () => {} },
      { label: 'Go to artist', onPress: () => {} },
      { label: 'Go to album', onPress: () => {} },
    ],
    onClose: () => {},
  },
};

export const Interactive: Story = {
  render: () => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    return (
      <View style={styles.interactiveWrapper}>
        <Pressable
          style={styles.trigger}
          onPress={(e: any) => {
            setPos({ x: e.nativeEvent.pageX ?? 100, y: e.nativeEvent.pageY ?? 100 });
            setVisible(true);
          }}
        >
          <Text style={styles.triggerText}>Open menu</Text>
        </Pressable>
        <ContextMenu
          visible={visible}
          onClose={() => setVisible(false)}
          position={pos}
          items={[
            { label: 'Add to queue', onPress: () => {} },
            { label: 'Add to playlist', onPress: () => {} },
            { label: 'Go to artist', onPress: () => {} },
            { label: 'Go to album', onPress: () => {} },
          ]}
        />
      </View>
    );
  },
} as any;

export const WithDestructiveItem: Story = {
  render: () => (
    <View style={styles.interactiveWrapper}>
      <ContextMenu
        visible
        position={{ x: 50, y: 60 }}
        onClose={() => {}}
        items={[
          { label: 'Play', onPress: () => {} },
          { label: 'Add to queue', onPress: () => {} },
          { label: 'Remove', destructive: true, onPress: () => {} },
        ]}
      />
    </View>
  ),
} as any;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: 300,
    height: 400,
  },
  interactiveWrapper: {
    backgroundColor: colors.background,
    width: 300,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trigger: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  triggerText: {
    ...typography.body,
    color: colors.text,
  },
});
