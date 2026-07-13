import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchCallByUser } from '../../services/api/calls';
import { CallState } from '../../states/call/state';

export const CALL_QUERY_KEY = (userId: string) => ['call', userId] as const;

export function useCallQuery(userId: string) {
  return useSuspenseQuery<CallState | null>({
    queryKey: CALL_QUERY_KEY(userId),
    queryFn: () => fetchCallByUser(userId),
  });
}
