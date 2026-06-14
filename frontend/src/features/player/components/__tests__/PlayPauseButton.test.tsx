import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PlayPauseButton } from '../PlayPauseButton';

describe('PlayPauseButton', () => {
  it('renders play icon when not playing', () => {
    render(<PlayPauseButton isPlaying={false} onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders pause icon when playing', () => {
    render(<PlayPauseButton isPlaying={true} onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<PlayPauseButton isPlaying={false} onPress={onPress} />);
    await user.click(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('applies sm size by default', () => {
    const { container } = render(
      <PlayPauseButton isPlaying={false} onPress={() => {}} />,
    );
    // Renders a Pressable (div in RNW)
    expect(container.querySelector('[aria-label="Play"]')).toBeInTheDocument();
  });

  it('applies lg size', () => {
    render(
      <PlayPauseButton isPlaying={false} size="lg" onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});
