import type { Meta, StoryObj } from '@storybook/react-vite';
import { QualitySelector } from './QualitySelector';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../constants/theme';

const meta = {
  title: 'Player/QualitySelector',
  component: QualitySelector,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof QualitySelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Original: Story = {
  args: { quality: 'original', onQualityChange: () => {} },
};

export const High: Story = {
  args: { quality: 'high', onQualityChange: () => {} },
};

export const Medium: Story = {
  args: { quality: 'medium', onQualityChange: () => {} },
};

export const Low: Story = {
  args: { quality: 'low', onQualityChange: () => {} },
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    padding: 24,
    width: 360,
  },
});
