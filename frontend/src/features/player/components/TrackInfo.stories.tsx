import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackInfo } from './TrackInfo';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { Track } from '@/hooks/generated/types';

const mockTrack: Track = {
  id: 't1',
  title: 'Bohemian Rhapsody',
  trackArtist: null,
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
  liked: false,
};

const meta = {
  title: 'Player/TrackInfo',
  component: TrackInfo,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['mini', 'full'],
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.wrapper}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof TrackInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: {
    track: mockTrack,
    variant: 'full',
  },
};

export const Mini: Story = {
  args: {
    track: mockTrack,
    variant: 'mini',
  },
};

export const LongTitle: Story = {
  args: {
    track: {
      ...mockTrack,
      title:
        'The Extremely Magnificently Ridiculously Long Song Title That Just Keeps Going',
      album: {
        ...mockTrack.album,
        title: 'An Album Name That Is Also Quite Lengthy In Nature',
      },
    },
    variant: 'mini',
  },
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    backgroundColor: colors.background,
  },
});
