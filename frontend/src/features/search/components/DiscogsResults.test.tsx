import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DiscogsResults } from './DiscogsResults';
import type { DiscogsResult } from '../discogs/types';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const artistResult: DiscogsResult = {
  id: 1, type: 'artist', title: 'Test Artist', year: 1990, thumb: '',
  genre: ['Rock'], style: [], format: [], uri: '',
};

const masterResult: DiscogsResult = {
  id: 2, type: 'master', title: 'Test Album', year: 2000, thumb: '',
  coverImage: 'https://img.jpg', genre: ['Electronic'], style: ['House'],
  format: ['Vinyl', 'LP'], uri: '',
};

const releaseResult: DiscogsResult = {
  id: 3, type: 'release', title: 'Test Single', year: 2005, thumb: 'thumb.jpg',
  genre: ['Pop'], style: [], format: ['CD'], uri: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DiscogsResults loading', () => {
  it('shows spinner when loading', () => {
    render(<DiscogsResults results={[]} loading={true} error={null} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('DiscogsResults error', () => {
  it('renders error message', () => {
    render(<DiscogsResults results={[]} loading={false} error="API limit reached" />);
    expect(screen.getByText('API limit reached')).toBeInTheDocument();
  });
});

describe('DiscogsResults empty', () => {
  it('shows empty text when no results', () => {
    render(<DiscogsResults results={[]} loading={false} error={null} />);
    expect(screen.getByText('No Discogs results found')).toBeInTheDocument();
  });
});

describe('DiscogsResults display', () => {
  it('renders each result with type badge and title', () => {
    render(<DiscogsResults results={[artistResult, masterResult]} loading={false} error={null} />);

    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
    expect(screen.getByText('Album')).toBeInTheDocument();
  });

  it('shows year and format in subtitle when present', () => {
    render(<DiscogsResults results={[masterResult]} loading={false} error={null} />);

    expect(screen.getByText('2000 — Vinyl, LP')).toBeInTheDocument();
  });

  it('shows genre in row header', () => {
    render(<DiscogsResults results={[masterResult]} loading={false} error={null} />);

    expect(screen.getByText('Electronic')).toBeInTheDocument();
  });

  it('shows first 2 genres only', () => {
    const multiGenre: DiscogsResult = {
      ...releaseResult, genre: ['Pop', 'Rock', 'Jazz'],
    };
    render(<DiscogsResults results={[multiGenre]} loading={false} error={null} />);

    expect(screen.getByText('Pop, Rock')).toBeInTheDocument();
    expect(screen.queryByText('Jazz')).not.toBeInTheDocument();
  });
});

describe('DiscogsResults navigation', () => {
  it('navigates to artist page when artist row pressed', async () => {
    const user = userEvent.setup();
    render(<DiscogsResults results={[artistResult]} loading={false} error={null} />);

    await user.click(screen.getByText('Test Artist'));

    expect(mockPush).toHaveBeenCalledWith('/discogs/artist/1');
  });

  it('navigates to album page when master row pressed', async () => {
    const user = userEvent.setup();
    render(<DiscogsResults results={[masterResult]} loading={false} error={null} />);

    await user.click(screen.getByText('Test Album'));

    expect(mockPush).toHaveBeenCalledWith('/discogs/album/2?type=master');
  });

  it('navigates to album page when release row pressed', async () => {
    const user = userEvent.setup();
    render(<DiscogsResults results={[releaseResult]} loading={false} error={null} />);

    await user.click(screen.getByText('Test Single'));

    expect(mockPush).toHaveBeenCalledWith('/discogs/album/3?type=release');
  });
});
