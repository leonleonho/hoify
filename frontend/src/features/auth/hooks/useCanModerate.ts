import { useQuery } from '@apollo/client/react';
import { MeDocument } from '@/hooks/generated';
import { UserRole } from '@/hooks/generated/types';

/** True when the current user is an admin or moderator. */
export function useCanModerate(): { canModerate: boolean; loading: boolean } {
  const { data, loading } = useQuery(MeDocument, {
    fetchPolicy: 'cache-first',
  });
  const role = data?.me?.role;
  const canModerate =
    role === UserRole.Admin || role === UserRole.Moderator;
  return { canModerate, loading };
}
