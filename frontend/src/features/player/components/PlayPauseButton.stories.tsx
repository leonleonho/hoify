import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayPauseButton } from './PlayPauseButton';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const meta = {
  title: 'Player/PlayPauseButton',
  component: PlayPauseButton,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isPlaying: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof PlayPauseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlayingSmall: Story = {
  args: {
    isPlaying: true,
    size: 'sm',
    onPress: () => {},
  },
};

export const PausedSmall: Story = {
  args: {
    isPlaying: false,
    size: 'sm',
    onPress: () => {},
  },
};

export const PlayingLarge: Story = {
  args: {
    isPlaying: true,
    size: 'lg',
    onPress: () => {},
  },
};

export const PausedLarge: Story = {
  args: {
    isPlaying: false,
    size: 'lg',
    onPress: () => {},
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
  },
});
