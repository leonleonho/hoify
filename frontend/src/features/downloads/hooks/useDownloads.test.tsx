import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import { DownloadsDocument } from '@/hooks/generated';
import { isTerminalStatus, useDownloads } from './useDownloads';

function wrapper(mocks: any[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isTerminalStatus', () => {
  it('marks completed/failed/cancelled as terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('marks queued/downloading as active', () => {
    expect(isTerminalStatus('queued')).toBe(false);
    expect(isTerminalStatus('downloading')).toBe(false);
  });
});

describe('useDownloads', () => {
  it('loads downloads and reports active when non-terminal exist', async () => {
    const mocks = [
      {
        request: { query: DownloadsDocument },
        result: {
          data: {
            downloads: [
              {
                id: 'd1',
                peer: 'user1',
                filename: 'track.flac',
                size: 1000,
                status: 'downloading',
                percentComplete: 40,
                bytesTransferred: 400,
                averageSpeed: 1024,
                createdAt: '2026-01-01T00:00:00Z',
              },
              {
                id: 'd2',
                peer: 'user2',
                filename: 'done.flac',
                size: 2000,
                status: 'completed',
                percentComplete: 100,
                bytesTransferred: 2000,
                averageSpeed: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ];

    const { result } = renderHook(() => useDownloads(), {
      wrapper: wrapper(mocks),
    });

    await waitFor(() => {
      expect(result.current.downloads).toHaveLength(2);
    });

    expect(result.current.hasActive).toBe(true);
  });

  it('reports hasActive false when all downloads are terminal', async () => {
    const mocks = [
      {
        request: { query: DownloadsDocument },
        result: {
          data: {
            downloads: [
              {
                id: 'd1',
                peer: 'user1',
                filename: 'track.flac',
                size: 1000,
                status: 'completed',
                percentComplete: 100,
                bytesTransferred: 1000,
                averageSpeed: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ];

    const { result } = renderHook(() => useDownloads(), {
      wrapper: wrapper(mocks),
    });

    await waitFor(() => {
      expect(result.current.downloads).toHaveLength(1);
    });

    expect(result.current.hasActive).toBe(false);
  });
});
