import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchCallByUser } from '../../services/api/calls';
import { CallState } from '../../states/call/state';

export const CALL_QUERY_KEY = (userId: string) => ['call', userId] as const;

// Only used as the initial seed for the call store (see CallQuerySync.tsx) —
// the call-events SSE stream (update_call/call_synced) is the source of
// truth after that. staleTime: Infinity/refetchOnWindowFocus: false keeps
// this query from ever refetching in the background and racing a fresher
// SSE push, same reasoning as useOnlineUsersQuery.
export function useCallQuery(userId: string) {
  return useSuspenseQuery<CallState | null>({
    queryKey: CALL_QUERY_KEY(userId),
    queryFn: () => fetchCallByUser(userId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
