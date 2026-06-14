/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { PaymentsPageUI } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';

export const PaymentsPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);

  return (
    <PaymentsPageUI
      currentUser={currentUser || null}
      users={users}
      addTokensSimulation={addTokensSimulation}
      navigate={navigate}
    />
  );
};
