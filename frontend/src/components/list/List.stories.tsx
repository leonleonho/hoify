import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem } from './List';
import { SongListItem } from './SongListItem';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import type { Track } from '../../hooks/generated';

// ── mock track data ────────────────────────────────────────────────
const mockTrack = (overrides: Partial<Track>): Track => ({
  __typename: 'Track',
  id: '1',
  title: 'Midnight Waves',
  duration: 204,
  discNumber: 1,
  trackNumber: 1,
  filePath: '/music/midnight-waves.mp3',
  fileFormat: 'mp3',
  fileSize: 8_200_000,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  genres: [],
  album: {
    __typename: 'Album',
    id: 'a1',
    title: 'Neon Dreams',
    coverUrl: null,
    artist: {
      __typename: 'Artist',
      id: 'ar1',
      name: 'Synthwave Kid',
      albums: [],
      bio: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      imageUrl: null,
    },
    releaseYear: 2025,
    tracks: [],
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  ...overrides,
} as Track);

const tracks: Track[] = [
  mockTrack({
    id: '1',
    title: 'Midnight Waves',
    duration: 204,
    album: {
      ...mockTrack({}).album,
      artist: { ...mockTrack({}).album.artist, name: 'Synthwave Kid' },
    },
  }),
  mockTrack({
    id: '2',
    title: 'Crystal Rain',
    duration: 247,
    album: {
      ...mockTrack({}).album,
      title: 'Digital Horizon',
      artist: { ...mockTrack({}).album.artist, name: 'Neon Pulse' },
    },
  }),
  mockTrack({
    id: '3',
    title: 'Starlight Drive',
    duration: 183,
    album: {
      ...mockTrack({}).album,
      title: 'Neon Dreams',
      artist: { ...mockTrack({}).album.artist, name: 'Synthwave Kid' },
    },
  }),
  mockTrack({
    id: '4',
    title: 'Urban Echoes',
    duration: 312,
    album: {
      ...mockTrack({}).album,
      title: 'Concrete Jungle',
      artist: { ...mockTrack({}).album.artist, name: 'DJ Spector' },
    },
  }),
];

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

// ── existing stories ───────────────────────────────────────────────

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

// ── song list stories ──────────────────────────────────────────────

export const SongList: Story = {
  args: {},
  render: () => (
    <List header="Now Playing">
      {tracks.map((track, i) => (
        <SongListItem
          key={track.id}
          track={track}
          interactionMode="swipe"
          divider={i < tracks.length - 1}
          onPress={() => Alert.alert('Play', track.title)}
          swipeRightAction={{
            icon: <Text style={styles.actionIcon}>❤️</Text>,
            onAction: () => Alert.alert('Liked', track.title),
            color: colors.primary,
          }}
          swipeLeftAction={{
            icon: <Text style={styles.actionIcon}>🗑️</Text>,
            onAction: () => Alert.alert('Remove', track.title),
            color: colors.error,
          }}
        />
      ))}
    </List>
  ),
};

export const SongListNoSwipe: Story = {
  args: {},
  render: () => (
    <List header="Queue">
      {tracks.slice(0, 3).map((track, i) => (
        <SongListItem
          key={track.id}
          track={track}
          interactionMode="swipe"
          divider={i < 2}
          onPress={() => Alert.alert('Play', track.title)}
        />
      ))}
    </List>
  ),
};

export const SongListSwipeRight: Story = {
  args: {},
  render: () => (
    <List header="Suggestions">
      {tracks.slice(0, 3).map((track, i) => (
        <SongListItem
          key={track.id}
          track={track}
          interactionMode="swipe"
          divider={i < 2}
          swipeRightAction={{
            icon: <Text style={styles.actionIcon}>➕</Text>,
            onAction: () => Alert.alert('Added to queue', track.title),
            color: colors.primary,
          }}
        />
      ))}
    </List>
  ),
};

export const SongListClickMode: Story = {
  args: {},
  render: () => (
    <List header="Suggestions">
      {tracks.slice(0, 3).map((track, i) => (
        <SongListItem
          key={track.id}
          track={track}
          interactionMode="click"
          divider={i < 2}
          swipeRightAction={{
            icon: <Text style={styles.actionIcon}>➕</Text>,
            onAction: () => Alert.alert('Added to queue', track.title),
            color: colors.primary,
          }}
        />
      ))}
    </List>
  ),
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
  actionIcon: {
    fontSize: 22,
  },
});
