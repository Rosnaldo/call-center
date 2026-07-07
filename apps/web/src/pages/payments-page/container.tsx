/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore, useCurrentUserStore } from '../../states/stores.ts';
import { PaymentsPageUI } from './ui.tsx';

export const PaymentsPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const addTokens = useOnlineUsersStore((state) => state.addTokens);

  return (
    <PaymentsPageUI
      currentUser={currentUser || null}
      addTokens={addTokens}
      navigate={navigate}
    />
  );
};
