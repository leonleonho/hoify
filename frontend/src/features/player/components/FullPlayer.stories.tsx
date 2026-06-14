import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FullPlayer } from './FullPlayer';
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
  title: 'Player/FullPlayer',
  component: FullPlayer,
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
} satisfies Meta<typeof FullPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlayingMidTrack: Story = {
  decorators: [
    withPlayer({
      currentTrack: mockTrack,
      isPlaying: true,
      position: 103_000,
      duration: 354_000,
      volume: 0.7,
    }),
  ],
};

export const PausedAtStart: Story = {
  decorators: [
    withPlayer({
      currentTrack: mockTrack,
      isPlaying: false,
      position: 0,
      duration: 354_000,
      volume: 0.8,
    }),
  ],
};

export const NoTrackSelected: Story = {
  decorators: [
    withPlayer({
      currentTrack: null,
    }),
  ],
};

export const FullVolume: Story = {
  decorators: [
    withPlayer({
      currentTrack: mockTrack,
      isPlaying: true,
      position: 200_000,
      duration: 354_000,
      volume: 1,
    }),
  ],
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 600,
  },
});
