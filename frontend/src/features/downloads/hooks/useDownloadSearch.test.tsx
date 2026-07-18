import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';
import {
  DownloadSearchDocument,
  StartDownloadSearchDocument,
} from '@/hooks/generated';
import { useDownloadSearch } from './useDownloadSearch';

const emptyPeers = {
  id: 'search-1',
  query: 'radiohead',
  isComplete: false,
  fileCount: 0,
  responseCount: 0,
  peers: [],
};

const completeResult = {
  ...emptyPeers,
  isComplete: true,
  fileCount: 2,
  responseCount: 1,
  peers: [
    {
      peer: 'user1',
      hasFreeUploadSlot: true,
      uploadSpeed: 102400,
      queueLength: 0,
      folders: [
        {
          name: 'Radiohead',
          files: [
            {
              filename: '@@abc\\Radiohead\\OK Computer\\01.flac',
              size: 30_000_000,
              extension: 'flac',
              bitRate: null,
              bitDepth: 16,
              sampleRate: 44100,
              isLocked: false,
            },
          ],
        },
      ],
    },
  ],
};

function wrapper(mocks: any[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDownloadSearch', () => {
  it('starts idle with no results', () => {
    const { result } = renderHook(() => useDownloadSearch(), {
      wrapper: wrapper([]),
    });

    expect(result.current.searchResult).toBeNull();
    expect(result.current.searching).toBe(false);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts a search and polls until complete', async () => {
    const mocks = [
      {
        request: {
          query: StartDownloadSearchDocument,
          variables: { query: 'radiohead' },
        },
        result: {
          data: { startDownloadSearch: emptyPeers },
        },
      },
      {
        request: {
          query: DownloadSearchDocument,
          variables: { id: 'search-1' },
        },
        result: {
          data: { downloadSearch: completeResult },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ];

    const { result } = renderHook(() => useDownloadSearch(), {
      wrapper: wrapper(mocks),
    });

    await act(async () => {
      await result.current.search('radiohead');
    });

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.searchResult?.fileCount).toBe(2);
    expect(result.current.searchResult?.peers).toHaveLength(1);
    expect(result.current.searching).toBe(false);
  });

  it('ignores blank queries', async () => {
    const { result } = renderHook(() => useDownloadSearch(), {
      wrapper: wrapper([]),
    });

    await act(async () => {
      await result.current.search('   ');
    });

    expect(result.current.searchId).toBeNull();
    expect(result.current.searching).toBe(false);
  });

  it('clears prior results when starting a new search', async () => {
    const mocks = [
      {
        request: {
          query: StartDownloadSearchDocument,
          variables: { query: 'radiohead' },
        },
        result: {
          data: { startDownloadSearch: emptyPeers },
        },
      },
      {
        request: {
          query: DownloadSearchDocument,
          variables: { id: 'search-1' },
        },
        result: {
          data: { downloadSearch: completeResult },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: {
          query: StartDownloadSearchDocument,
          variables: { query: 'bjork' },
        },
        delay: 50,
        result: {
          data: {
            startDownloadSearch: {
              ...emptyPeers,
              id: 'search-2',
              query: 'bjork',
            },
          },
        },
      },
      {
        request: {
          query: DownloadSearchDocument,
          variables: { id: 'search-2' },
        },
        result: {
          data: {
            downloadSearch: {
              ...emptyPeers,
              id: 'search-2',
              query: 'bjork',
              isComplete: false,
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ];

    const { result } = renderHook(() => useDownloadSearch(), {
      wrapper: wrapper(mocks),
    });

    await act(async () => {
      await result.current.search('radiohead');
    });

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });
    expect(result.current.searchResult?.peers).toHaveLength(1);

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.search('bjork');
    });

    await waitFor(() => {
      expect(result.current.searchResult).toBeNull();
    });

    await act(async () => {
      await searchPromise!;
    });
  });
});
