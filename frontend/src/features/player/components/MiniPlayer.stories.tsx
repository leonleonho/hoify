import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { MiniPlayer } from './MiniPlayer';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { musicPlayer } from '../services/MusicPlayerService';
import type { PlayerState } from '../types/player';
import type { Track } from '@/hooks/generated';

const mockTrack: Track = {
  id: 't1',
  title: 'Bohemian Rhapsody',
  filePath: 'Queen/A Night at the Opera/01 - Bohemian Rhapsody.mp3',
  duration: 354,
  fileFormat: 'mp3',
  fileSize: 5678901,
  discNumber: 1,
  trackNumber: 1,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  album: {
    id: 'a1',
    title: 'A Night at the Opera',
    coverUrl: null,
    releaseYear: 1975,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    tracks: [],
    artist: {
      id: 'ar1',
      name: 'Queen',
      bio: null,
      imageUrl: null,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      albums: [],
    },
  },
  genres: [],
};

/** Seed the service singleton state for a story */
function seedState(patch: Partial<PlayerState>) {
  const mp = musicPlayer as unknown as { _state: PlayerState };
  mp._state = { ...mp._state, ...patch };
}

function withPlayer(patch: Partial<PlayerState>) {
  return (Story: React.ComponentType) => {
    seedState(patch);
    return <Story />;
  };
}

const meta = {
  title: 'Player/MiniPlayer',
  component: MiniPlayer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={styles.shell}>
        <View style={styles.content} />
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof MiniPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {
  decorators: [
    withPlayer({
      currentTrack: mockTrack,
      isPlaying: true,
      position: 63_000,
      duration: 354_000,
    }),
  ],
};

export const Paused: Story = {
  decorators: [
    withPlayer({
      currentTrack: mockTrack,
      isPlaying: false,
      position: 120_000,
      duration: 354_000,
    }),
  ],
};

// MiniPlayer returns null when no track is loaded — not shown.
// Included to document this behavior.
export const NoTrackSelected: Story = {
  decorators: [
    withPlayer({
      currentTrack: null,
    }),
  ],
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'flex-end',
    minHeight: 120,
  },
  content: {
    flex: 1,
  },
});
