/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from 'react-i18next';
import { UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedView= () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-grow flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <UserCheck className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">{t('error.restrictedAccess')}</h3>
          <p className="text-xs text-slate-500 mt-2">{t('error.loginRequired')}</p>
          <button
            id="exception-login-redirect-btn"
            onClick={() => navigate('login')}
            className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
          >
            {t('error.login')}
          </button>
        </div>
      </main>
    </div>
  );
};
