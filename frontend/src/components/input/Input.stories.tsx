import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    secureTextEntry: { control: 'boolean' },
    multiline: { control: 'boolean' },
    keyboardType: {
      control: 'select',
      options: ['default', 'email-address', 'numeric', 'phone-pad'],
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search artists, albums…',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Display Name',
    value: 'Hoify User',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    secureTextEntry: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    value: 'bad-email',
    error: 'Please enter a valid email address',
    keyboardType: 'email-address',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Username',
    value: 'taken_username',
    disabled: true,
  },
};

export const RowOfInputs: Story = {
  decorators: [
    (Story) => (
      <View style={styles.showcase}>
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View style={styles.row}>
      <Input placeholder="Default" style={{ flex: 1 }} />
      <Input placeholder="Focused" style={{ flex: 1 }} />
    </View>
  ),
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
    width: 320,
  },
  showcase: {
    padding: 16,
    backgroundColor: colors.background,
    width: 320,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
