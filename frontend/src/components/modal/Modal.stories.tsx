import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './Modal';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { Button } from '../button/Button';
import { Input } from '../input/Input';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    visible: { control: 'boolean' },
    title: { control: 'text' },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.wrapper}>
        <Button title="Open Modal" onPress={() => setOpen(true)} />
        <Modal {...args} visible={open} onClose={() => setOpen(false)}>
          <Text style={styles.bodyText}>
            This is the modal body content. You can put any React Native
            components here.
          </Text>
        </Modal>
      </View>
    );
  },
  args: {
    visible: false,
    title: 'Hello from Modal',
  },
};

export const WithForm: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.wrapper}>
        <Button title="Edit Profile" onPress={() => setOpen(true)} />
        <Modal {...args} visible={open} onClose={() => setOpen(false)}>
          <Input label="Display Name" placeholder="Your name" />
          <View style={styles.spacer} />
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.spacerLarge} />
          <Button title="Save Changes" variant="primary" fullWidth />
        </Modal>
      </View>
    );
  },
  args: {
    visible: false,
    title: 'Edit Profile',
  },
};

export const LongContent: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.wrapper}>
        <Button title="View Details" onPress={() => setOpen(true)} />
        <Modal {...args} visible={open} onClose={() => setOpen(false)}>
          {Array.from({ length: 10 }, (_, i) => (
            <Text key={i} style={styles.listItem}>
              • Feature update {i + 1} — improvements and bug fixes.
            </Text>
          ))}
        </Modal>
      </View>
    );
  },
  args: {
    visible: false,
    title: 'Release Notes',
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
    width: 320,
    alignItems: 'center',
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  listItem: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  spacer: {
    height: spacing.sm,
  },
  spacerLarge: {
    height: spacing.lg,
  },
});
