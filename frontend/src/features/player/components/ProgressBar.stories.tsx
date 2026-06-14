import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const meta = {
  title: 'Player/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'number',
      description: 'Current position in milliseconds',
    },
    duration: {
      control: 'number',
      description: 'Total duration in milliseconds',
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Start: Story = {
  args: {
    position: 0,
    duration: 214_000, // 3:34
    onSeek: () => {},
  },
};

export const MidTrack: Story = {
  args: {
    position: 103_000, // 1:43
    duration: 214_000,
    onSeek: () => {},
  },
};

export const NearEnd: Story = {
  args: {
    position: 200_000,
    duration: 214_000,
    onSeek: () => {},
  },
};

export const UnknownDuration: Story = {
  args: {
    position: 50_000,
    duration: 0,
    onSeek: () => {},
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
    width: 400,
    maxWidth: '100%',
  },
});
