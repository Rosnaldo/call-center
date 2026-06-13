/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { PaymentsPageUI } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';

interface PaymentsPageContainerProps {
  handleLogout: () => void;
  navigate: (path: string) => void;
}

export const PaymentsPageContainer: React.FC<PaymentsPageContainerProps> = ({
  handleLogout,
  navigate,
}) => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);

  return (
    <PaymentsPageUI
      currentUser={currentUser || null}
      users={users}
      addTokensSimulation={addTokensSimulation}
      handleLogout={handleLogout}
      navigate={navigate}
    />
  );
};
