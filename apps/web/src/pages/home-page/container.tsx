/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthentication } from '../../hooks/auth/useAuthentication.ts';
import { HomePageUI } from './ui.tsx';

export const HomePageContainer: React.FC = () => {
  const { isAuthenticated } = useAuthentication();

  // Home is the public landing page; logged-in users go to their dashboard.
  if (isAuthenticated) {
    return <Navigate to="/painel" replace />;
  }

  return <HomePageUI />;
};
