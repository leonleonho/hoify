import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginScreen } from './LoginScreen';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../constants/theme';

const meta = {
  title: 'Features/LoginScreen',
  component: LoginScreen,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 700,
  },
});
