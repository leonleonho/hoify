import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem } from './List';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

const meta = {
  title: 'Components/List',
  component: List,
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
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playlist: Story = {
  args: {},
  render: () => (
    <List header="Recently Played">
      <ListItem
        title="Midnight Waves"
        subtitle="Electronic · 42 min"
        leading={<Text style={styles.emoji}>🌊</Text>}
        trailing={<Text style={styles.duration}>3:24</Text>}
      />
      <ListItem
        title="Chill Beats"
        subtitle="Lo-fi · 1h 12min"
        leading={<Text style={styles.emoji}>🎧</Text>}
        trailing={<Text style={styles.duration}>4:07</Text>}
      />
      <ListItem
        title="Road Trip 2025"
        subtitle="Rock · 2h 30min"
        leading={<Text style={styles.emoji}>🎸</Text>}
        trailing={<Text style={styles.duration}>3:55</Text>}
      />
      <ListItem
        title="Jazz & Rain"
        subtitle="Jazz · 58 min"
        leading={<Text style={styles.emoji}>🎷</Text>}
        divider={false}
        trailing={<Text style={styles.duration}>5:12</Text>}
      />
    </List>
  ),
};

export const Settings: Story = {
  args: {},
  render: () => (
    <List header="Settings">
      <ListItem
        title="Account"
        subtitle="Manage your profile and security"
        leading={<Text style={styles.emoji}>👤</Text>}
        trailing={<Text style={styles.chevron}>›</Text>}
      />
      <ListItem
        title="Audio Quality"
        subtitle="Streaming and downloads"
        leading={<Text style={styles.emoji}>🔊</Text>}
        trailing={<Text style={styles.chevron}>›</Text>}
      />
      <ListItem
        title="Notifications"
        subtitle="Push and email preferences"
        leading={<Text style={styles.emoji}>🔔</Text>}
        trailing={<Text style={styles.chevron}>›</Text>}
      />
      <ListItem
        title="About"
        leading={<Text style={styles.emoji}>ℹ️</Text>}
        divider={false}
        trailing={<Text style={styles.chevron}>›</Text>}
      />
    </List>
  ),
};

export const Minimal: Story = {
  args: {},
  render: () => (
    <List header="Genres">
      <ListItem title="Electronic" divider={false} />
      <ListItem title="Hip-Hop" />
      <ListItem title="Jazz" />
      <ListItem title="Rock" />
      <ListItem title="Classical" />
      <ListItem title="R&B" divider={false} />
    </List>
  ),
};

export const Interactable: Story = {
  args: {},
  render: () => {
    const [tapped, setTapped] = React.useState<string | null>(null);
    const items = ['Song One', 'Song Two', 'Song Three'];
    return (
      <View style={styles.interactableWrapper}>
        <List header="Tap a song">
          {items.map((title, i) => (
            <ListItem
              key={title}
              title={
                tapped === title
                  ? `${title} ✓`
                  : title
              }
              subtitle={`Track ${i + 1}`}
              onPress={() => setTapped(title)}
              divider={i < items.length - 1}
              trailing={
                tapped === title ? (
                  <Text style={styles.checked}>✓</Text>
                ) : undefined
              }
            />
          ))}
        </List>
        {tapped && (
          <Text style={styles.feedback}>
            Tapped: {tapped.replace(' ✓', '')}
          </Text>
        )}
      </View>
    );
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
    width: 360,
  },
  emoji: {
    fontSize: 20,
  },
  duration: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '300',
  },
  checked: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  interactableWrapper: {
    width: 360,
    gap: spacing.md,
  },
  feedback: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
