/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AttendantList } from './AttendantList.tsx';
import { CustomerList } from './CustomerList.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';

interface UserListsProps {
  users: OnlineUserState[];
  currentUser: OnlineUserState | null;
  call: CallState | null;
  onCompleteCall: (attendantId: string) => void;
}

export const UserLists: React.FC<UserListsProps> = ({
  users,
  currentUser,
  call,
  onCompleteCall,
}) => {
  return (
    <div id="users-columns-grid" className={`grid grid-cols-1 ${!currentUser ? 'lg:grid-cols-2' : ''} gap-6`}>
      {/* COLUMN 1: ATTENDANTS DESK */}
      {currentUser?.role !== 'attendant' && (
        <AttendantList
          users={users}
          currentUser={currentUser}
          call={call}
          onCompleteCall={onCompleteCall}
        />
      )}

      {/* COLUMN 2: CUSTOMERS LIST */}
      {currentUser?.role !== 'customer' && (
        <CustomerList
          users={users}
          currentUser={currentUser}
          call={call}
        />
      )}
    </div>
  );
};
