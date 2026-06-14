import type { Meta, StoryObj } from '@storybook/react-vite';
import { VolumeControl } from './VolumeControl';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const meta = {
  title: 'Player/VolumeControl',
  component: VolumeControl,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    volume: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof VolumeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Muted: Story = {
  args: {
    volume: 0,
    onVolumeChange: () => {},
  },
};

export const Low: Story = {
  args: {
    volume: 0.25,
    onVolumeChange: () => {},
  },
};

export const Half: Story = {
  args: {
    volume: 0.5,
    onVolumeChange: () => {},
  },
};

export const Full: Story = {
  args: {
    volume: 1,
    onVolumeChange: () => {},
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
    width: 300,
    maxWidth: '100%',
  },
});
