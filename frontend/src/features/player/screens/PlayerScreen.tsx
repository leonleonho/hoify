import React from 'react';
import { FullPlayer } from '../components/FullPlayer';

/**
 * Full player screen — rendered at /player route.
 * Just wraps FullPlayer so the route layer stays thin.
 */
export function PlayerScreen() {
  return <FullPlayer />;
}
