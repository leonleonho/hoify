import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TrackInfo } from '../TrackInfo';
import { mockTrack1 } from './utils';

describe('TrackInfo', () => {
  it('renders track title and artist', () => {
    render(<TrackInfo track={mockTrack1} />);
    expect(screen.getByText('Test Song One')).toBeInTheDocument();
    expect(screen.getByText(/Test Artist/)).toBeInTheDocument();
  });

  it('renders album name in full variant', () => {
    render(<TrackInfo track={mockTrack1} variant="full" />);
    expect(screen.getByText(/Test Album/)).toBeInTheDocument();
  });

  it('does not show album name in mini variant', () => {
    render(<TrackInfo track={mockTrack1} variant="mini" />);
    expect(screen.queryByText(/Test Album/)).not.toBeInTheDocument();
  });

  it('renders album art accessibility label', () => {
    render(<TrackInfo track={mockTrack1} />);
    expect(
      screen.getByLabelText('Album art for Test Album'),
    ).toBeInTheDocument();
  });
});
