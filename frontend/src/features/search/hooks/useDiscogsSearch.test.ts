import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDiscogsSearch } from './useDiscogsSearch';

const mockSearchDiscogs = vi.fn();

vi.mock('@/features/search/discogs/client', () => ({
  searchDiscogs: (...args: any[]) => mockSearchDiscogs(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDiscogsSearch', () => {
  it('initial state is empty, not loading, not searched', () => {
    const { result } = renderHook(() => useDiscogsSearch('test'));

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searched).toBe(false);
  });

  it('resets state when query changes', () => {
    const { result, rerender } = renderHook(
      (q: string) => useDiscogsSearch(q),
      { initialProps: 'first' },
    );

    act(() => {
      result.current.search();
    });

    expect(result.current.searched).toBe(true);

    rerender('second');

    expect(result.current.searched).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('search fetches and sets results', async () => {
    const results = [{ id: 1, type: 'master', title: 'Found' }];
    mockSearchDiscogs.mockResolvedValue(results);

    const { result } = renderHook(() => useDiscogsSearch('test'));
    act(() => { result.current.search(); });

    expect(result.current.loading).toBe(true);
    expect(result.current.searched).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual(results);
    expect(result.current.error).toBeNull();
  });

  it('search handles error gracefully', async () => {
    mockSearchDiscogs.mockRejectedValue(new Error('Rate limited'));

    const { result } = renderHook(() => useDiscogsSearch('test'));
    act(() => { result.current.search(); });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe('Rate limited');
  });

  it('does not search when query is less than 2 chars', () => {
    const { result } = renderHook(() => useDiscogsSearch('a'));
    act(() => { result.current.search(); });

    expect(mockSearchDiscogs).not.toHaveBeenCalled();
  });
});
