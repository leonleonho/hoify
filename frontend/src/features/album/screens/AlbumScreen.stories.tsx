import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View, StyleSheet } from 'react-native';
import { AlbumDocument } from '@/hooks/generated';
import { colors } from '@/constants/theme';
import { withPlayerContext } from '@/features/player/components/storyUtils';
import { AlbumScreen } from './AlbumScreen';

const meta = {
  title: 'Features/AlbumScreen',
  component: AlbumScreen,
  parameters: {
    layout: 'fullscreen',
    apolloMocks: [
      {
        request: {
          query: AlbumDocument,
          variables: { id: 'album-1' },
        },
        result: {
          data: {
            album: {
              __typename: 'Album',
              id: 'album-1',
              title: 'Test Album',
              releaseYear: 2020,
              coverUrl: 'https://picsum.photos/seed/album/400/400',
              artist: {
                __typename: 'Artist',
                id: 'artist-1',
                name: 'Test Artist',
                imageUrl: null,
              },
              tracks: [
                {
                  __typename: 'Track',
                  id: 'track-1',
                  title: 'Song One',
                  trackNumber: 1,
                  duration: 200000,
                  liked: false,
                  filePath: 'music/song1.mp3',
                  genres: [{ __typename: 'Genre', id: 'g1', name: 'Rock' }],
                },
                {
                  __typename: 'Track',
                  id: 'track-2',
                  title: 'Song Two',
                  trackNumber: 2,
                  duration: 180000,
                  liked: false,
                  filePath: 'music/song2.mp3',
                  genres: [],
                },
                {
                  __typename: 'Track',
                  id: 'track-3',
                  title: 'Song Three',
                  trackNumber: 3,
                  duration: 240000,
                  liked: false,
                  filePath: 'music/song3.mp3',
                  genres: [],
                },
              ],
            },
          },
        },
      },
    ],
  },
  decorators: [
    withPlayerContext({
      currentTrack: null,
      playlist: [],
      isPlaying: false,
      isLoading: false,
      position: 0,
      duration: 0,
      volume: 0.8,
    }),
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof AlbumScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { albumId: 'album-1' },
};

export const Loading: Story = {
  args: { albumId: 'loading-id' },
  parameters: {
    apolloMocks: [
      {
        request: { query: AlbumDocument, variables: { id: 'loading-id' } },
        result: { data: { album: null } },
        delay: 500_000,
      },
    ],
  },
};

export const ErrorState: Story = {
  args: { albumId: 'error-id' },
  parameters: {
    apolloMocks: [
      {
        request: { query: AlbumDocument, variables: { id: 'error-id' } },
        error: new Error('Failed to load album'),
      },
    ],
  },
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 800,
  },
});
