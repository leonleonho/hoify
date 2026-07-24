import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import React from 'react';

import { MeDocument } from '@/hooks/generated';
import { UserRole } from '@/hooks/generated/types';
import { useCanModerate } from './useCanModerate';

function wrapper(mocks: any[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  };
}

describe('useCanModerate', () => {
  it('returns true for admin', async () => {
    const { result } = renderHook(() => useCanModerate(), {
      wrapper: wrapper([
        {
          request: { query: MeDocument },
          result: {
            data: {
              me: {
                __typename: 'User',
                id: '1',
                email: 'a@b.com',
                firstName: 'A',
                lastName: 'B',
                role: UserRole.Admin,
              },
            },
          },
        },
      ]),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.canModerate).toBe(true);
    });
  });

  it('returns true for moderator', async () => {
    const { result } = renderHook(() => useCanModerate(), {
      wrapper: wrapper([
        {
          request: { query: MeDocument },
          result: {
            data: {
              me: {
                __typename: 'User',
                id: '1',
                email: 'a@b.com',
                firstName: 'A',
                lastName: 'B',
                role: UserRole.Moderator,
              },
            },
          },
        },
      ]),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.canModerate).toBe(true);
    });
  });

  it('returns false for regular user', async () => {
    const { result } = renderHook(() => useCanModerate(), {
      wrapper: wrapper([
        {
          request: { query: MeDocument },
          result: {
            data: {
              me: {
                __typename: 'User',
                id: '1',
                email: 'a@b.com',
                firstName: 'A',
                lastName: 'B',
                role: UserRole.User,
              },
            },
          },
        },
      ]),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.canModerate).toBe(false);
    });
  });
});
