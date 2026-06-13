import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';

import { LoginDocument } from '@/hooks/generated';
import type { LoginMutation, LoginMutationVariables } from '@/hooks/generated';

export function useLogin() {
  const [mutate, { loading, error, data }] = useMutation<
    LoginMutation,
    LoginMutationVariables
  >(LoginDocument);

  const login = useCallback(
    async (email: string, password: string) => {
      return await mutate({ variables: { email, password } });
    },
    [mutate],
  );

  return {
    login,
    loading,
    error,
    data: data?.login ?? null,
  };
}

/** Retrieve persisted token, or null if none stored. */
export async function getStoredToken(): Promise<string | null> {
  return null; // Auth uses httpOnly cookie — no client-side token storage needed
}

/** Remove persisted token (logout). */
export async function clearStoredToken(): Promise<void> {
  // Auth uses httpOnly cookie — cleared server-side or on logout
}
