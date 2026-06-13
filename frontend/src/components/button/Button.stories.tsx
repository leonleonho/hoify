import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    title: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    title: 'Play',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    title: 'Shuffle',
    variant: 'secondary',
    size: 'md',
  },
};

export const Ghost: Story = {
  args: {
    title: 'Cancel',
    variant: 'ghost',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    title: 'Add',
    variant: 'primary',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    title: 'Save to Library',
    variant: 'primary',
    size: 'lg',
  },
};

export const Disabled: Story = {
  args: {
    title: 'Not Available',
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading…',
    variant: 'primary',
    size: 'md',
    loading: true,
  },
};

/** Row of all three variants to compare side-by-side */
export const VariantShowcase: Story = {
  args: {
    title: '',
  },
  decorators: [
    (Story) => (
      <View style={styles.showcase}>
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View style={styles.row}>
      <Button title="Primary" variant="primary" />
      <Button title="Secondary" variant="secondary" />
      <Button title="Ghost" variant="ghost" />
    </View>
  ),
};

export const SizesShowcase: Story = {
  args: {
    title: '',
  },
  decorators: [
    (Story) => (
      <View style={styles.showcase}>
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View style={styles.column}>
      <Button title="Small" size="sm" />
      <Button title="Medium" size="md" />
      <Button title="Large" size="lg" />
    </View>
  ),
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
  },
  showcase: {
    padding: 16,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  column: {
    gap: 16,
    alignSelf: 'stretch',
  },
});
