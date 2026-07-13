import React, { Suspense, useEffect } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { UserLists } from './UserLists';
import { useOnlineUsersQuery } from '../../queries/online-users/query';
import { useOnlineUsersStore } from '../../states/stores';
import { OnlineUserState } from '../../states/online-users/state';
import { CallState } from '../../states/call/state';

interface Props {
  currentUser: OnlineUserState | null;
  call: CallState | null;
  onCompleteCall: (attendantId: string) => void;
}

function UserListsFetcher({ currentUser, call, onCompleteCall }: Props) {
  const { data: initialUsers } = useOnlineUsersQuery();
  const setUsers = useOnlineUsersStore((s) => s.setUsers);
  const users = useOnlineUsersStore((s) => s.users);

  // Seeds the store once from the initial REST snapshot — after that, the
  // update_online_users SSE push (see init-realtime-events.ts) is the only
  // writer. Re-running this on every background refetch (React Query's
  // default staleTime is 0, so window focus alone triggers one) could
  // clobber a fresher SSE update with a stale REST response.
  useEffect(() => {
    setUsers(initialUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserLists
      users={users}
      currentUser={currentUser}
      call={call}
      onCompleteCall={onCompleteCall}
    />
  );
}

function UserListsSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 h-48" />
      <div className="bg-white border border-slate-200 rounded-3xl p-6 h-48" />
    </div>
  );
}

export const UserListsContainer: React.FC<Props> = (props) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<UserListsSkeleton />}>
        <UserListsFetcher {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};
