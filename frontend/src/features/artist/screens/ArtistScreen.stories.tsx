import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View, StyleSheet } from 'react-native';
import { ArtistDocument } from '@/hooks/generated';
import { colors } from '@/constants/theme';
import { withPlayerContext } from '@/features/player/components/storyUtils';
import { ArtistScreen } from './ArtistScreen';

const meta = {
  title: 'Features/ArtistScreen',
  component: ArtistScreen,
  parameters: {
    layout: 'fullscreen',
    apolloMocks: [
      {
        request: {
          query: ArtistDocument,
          variables: { id: 'artist-1' },
        },
        result: {
          data: {
            artist: {
              __typename: 'Artist',
              id: 'artist-1',
              name: 'Test Artist',
              imageUrl: 'https://picsum.photos/seed/artist/400/400',
              bio: 'An amazing test artist with a rich discography spanning multiple genres.',
              albums: [
                {
                  __typename: 'Album',
                  id: 'album-1',
                  title: 'First Album',
                  releaseYear: 2020,
                  coverUrl: null,
                  artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
                  tracks: [
                    {
                      __typename: 'Track',
                      id: 'track-1',
                      title: 'Song One',
                      trackNumber: 1,
                      duration: 200000,
                      filePath: 'music/song1.mp3',
                      genres: [{ __typename: 'Genre', id: 'g1', name: 'Rock' }],
                    },
                    {
                      __typename: 'Track',
                      id: 'track-2',
                      title: 'Song Two',
                      trackNumber: 2,
                      duration: 180000,
                      filePath: 'music/song2.mp3',
                      genres: [],
                    },
                  ],
                },
                {
                  __typename: 'Album',
                  id: 'album-2',
                  title: 'Second Album',
                  releaseYear: 2022,
                  coverUrl: null,
                  artist: { __typename: 'Artist', id: 'artist-1', name: 'Test Artist' },
                  tracks: [
                    {
                      __typename: 'Track',
                      id: 'track-3',
                      title: 'Song Three',
                      trackNumber: 1,
                      duration: 240000,
                      filePath: 'music/song3.mp3',
                      genres: [],
                    },
                  ],
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
} satisfies Meta<typeof ArtistScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { artistId: 'artist-1' },
};

export const Loading: Story = {
  args: { artistId: 'loading-id' },
  parameters: {
    apolloMocks: [
      {
        request: { query: ArtistDocument, variables: { id: 'loading-id' } },
        result: { data: { artist: null } },
        delay: 500_000,
      },
    ],
  },
};

export const ErrorState: Story = {
  args: { artistId: 'error-id' },
  parameters: {
    apolloMocks: [
      {
        request: { query: ArtistDocument, variables: { id: 'error-id' } },
        error: new Error('Failed to load artist'),
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
