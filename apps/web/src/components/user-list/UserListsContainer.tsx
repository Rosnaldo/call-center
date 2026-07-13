import React from 'react';
import { UserLists } from './UserLists';
import { useOnlineUsersStore } from '../../states/stores';
import { CallState } from '../../states/call/state';
import { IUser } from '@repo/shared-types';

interface Props {
  currentUser: IUser | null;
  call: CallState | null;
  onCompleteCall: (attendantId: string) => void;
}

// onlineUsers has no REST seed anymore — the SSE stream (see
// init-realtime-events.ts) sends a full snapshot the moment it connects, and
// every update_online_users push after that keeps the store current. No
// fetch here means no Suspense/ErrorBoundary needed either.
export const UserListsContainer: React.FC<Props> = ({ currentUser, call, onCompleteCall }) => {
  const users = useOnlineUsersStore((s) => s.users);

  return (
    <UserLists
      users={users}
      currentUser={currentUser}
      call={call}
      onCompleteCall={onCompleteCall}
    />
  );
};
