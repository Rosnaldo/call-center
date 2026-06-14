/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { UserProfilePage } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { mytoast } from '@/src/components/toast.tsx';
import { fetchUserUpload } from '@/src/services/user.ts';

export const UserProfileContainer: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      mytoast.error("Por favor, selecione uma imagem.")
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      mytoast.error("A imagem deve ter no maximo 2MB.")
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setFileError(null);

    const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';
    if (isSimulation) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newUrl = reader.result;
          setAvatarUrl(newUrl);
          currentUser!.avatarUrl = newUrl;
          setCurrentUser(currentUser);
        }
      };
      reader.onerror = () => setFileError('Erro ao ler a imagem. Tente novamente.');
      reader.readAsDataURL(file);
      return;
    }

    try {
      const url = await fetchUserUpload(formData);
      setAvatarUrl(url);
      currentUser!.avatarUrl = url;
      setCurrentUser(currentUser);
    } catch (error) {
      setFileError('Erro ao ler a imagem. Tente novamente.');
      throw error;
    }
  };

  return (
    <UserProfilePage
      users={users}
      currentUser={currentUser || null}
      navigate={navigate}
      processFile={processFile}
      avatarUrl={avatarUrl}
      fileError={fileError}
    />
  );
};
