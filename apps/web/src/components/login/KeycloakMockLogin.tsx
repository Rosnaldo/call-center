/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { KeyRound } from 'lucide-react';

export const KeycloakMockLogin: React.FC = () => {
  return (
    <div id="keycloak-mock-login" className="max-w-2xl mx-auto bg-white border border-slate-200/70 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden text-center">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="p-3 bg-red-50 text-red-600 rounded-full">
          <KeyRound className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Keycloak Mock Authentication
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            This module represents simulated Single Sign-On (SSO) authentication in production environments. Please use the simulator or configure interactive credentials in your deployment.
          </p>
        </div>
      </div>
    </div>
  );
};
