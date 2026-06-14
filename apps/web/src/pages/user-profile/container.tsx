/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { UserProfilePage } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';

export const UserProfileContainer: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const updateUser = useOnlineUsersStore((state) => state.updateUser);

  const handleUpdateProfile = useCallback(async (userId: string, name: string, avatarUrl: string) => {
    try {
      updateUser(userId, { name, avatarUrl });
      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, name, avatarUrl });
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  }, [updateUser, setCurrentUser, currentUser]);

  return (
    <UserProfilePage
      users={users}
      currentUser={currentUser || null}
      navigate={navigate}
      onUpdateProfile={handleUpdateProfile}
    />
  );
};
