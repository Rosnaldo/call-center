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
  const { data: users } = useOnlineUsersQuery();
  const setUsers = useOnlineUsersStore((s) => s.setUsers);

  useEffect(() => {
    setUsers(users);
  }, [users]);

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
