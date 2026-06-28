import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchOnlineUsers } from '../../services/api/online-users';
import { OnlineUserState } from '../../states/online-users/state';

export const ONLINE_USERS_QUERY_KEY = ['online-users'] as const;

export function useOnlineUsersQuery() {
  return useSuspenseQuery<OnlineUserState[]>({
    queryKey: ONLINE_USERS_QUERY_KEY,
    queryFn: fetchOnlineUsers,
  });
}
