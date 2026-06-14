import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { VolumeControl } from '../VolumeControl';

describe('VolumeControl', () => {
  it('renders low-volume icon when volume is 0', () => {
    render(<VolumeControl volume={0} onVolumeChange={() => {}} />);
    // 🔈 = speaker with no sound
    expect(screen.getByText('🔈')).toBeInTheDocument();
  });

  it('renders medium-volume icon when volume is between 0 and 0.5', () => {
    render(<VolumeControl volume={0.3} onVolumeChange={() => {}} />);
    expect(screen.getByText('🔉')).toBeInTheDocument();
  });

  it('renders high-volume icon when volume >= 0.5', () => {
    render(<VolumeControl volume={0.8} onVolumeChange={() => {}} />);
    expect(screen.getByText('🔊')).toBeInTheDocument();
  });
});
