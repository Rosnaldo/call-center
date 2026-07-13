/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserStore } from '../../states/stores.ts';
import { UserProfilePage } from './ui.tsx';
import { mytoast } from '@/src/components/toast.tsx';
import { fetchUserUpload } from '@/src/services/api/user.ts';

export const UserProfileContainer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatar?.url || null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      mytoast.error(t('profile.selectImage'))
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      mytoast.error(t('profile.imageTooLarge'))
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setFileError(null);

    try {
      const url = await fetchUserUpload(formData);
      setAvatarUrl(url);
      setCurrentUser({
        ...currentUser!,
        avatar: { ...(currentUser!.avatar ?? { _id: '', s3Path: '', s3Host: '' }), url },
      });
    } catch (error) {
      setFileError(t('profile.imageReadError'));
      throw error;
    }
  };

  return (
    <UserProfilePage
      currentUser={currentUser || null}
      navigate={navigate}
      processFile={processFile}
      avatarUrl={avatarUrl}
      fileError={fileError}
    />
  );
};
