import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchOnlineUsers } from '../../services/api/online-users';
import { OnlineUserState } from '../../states/online-users/state';

export const ONLINE_USERS_QUERY_KEY = ['online-users'] as const;

// Only used as the initial seed for the onlineUsers store (see
// UserListsContainer.tsx) — update_online_users over SSE is the source of
// truth after that. staleTime: Infinity/refetchOnWindowFocus: false is a
// second line of defense on top of the seed-once effect, keeping this query
// from ever refetching in the background and racing a fresher SSE push.
export function useOnlineUsersQuery() {
  return useSuspenseQuery<OnlineUserState[]>({
    queryKey: ONLINE_USERS_QUERY_KEY,
    queryFn: fetchOnlineUsers,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
