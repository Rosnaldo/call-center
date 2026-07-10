/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "sonner";
import { LoginPage } from './pages/LoginPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { CustomerPageContainer } from './pages/customer-page/container.tsx';
import { AttendantPageContainer } from './pages/attendant-page/container.tsx';
import { UserProfileContainer } from './pages/user-profile/container.tsx';
import { PaymentsPageContainer } from './pages/payments-page/container.tsx';
import { TokenHistoryPageContainer } from './pages/token-history-page/container.tsx';
import { ProtectedRoute } from './protected-route.tsx';
import { UserPainelPage } from './pages/UserPainelPage.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProtectedRoute } from './role-protected-route.tsx';
import { useAuthStore } from './states/stores.ts';
import { DailyProvider } from '@daily-co/daily-react';
import { DailyService } from './services/daily.ts';
import { resetCallState } from './states/reset-call-state.ts';

const queryClient = new QueryClient();

export default function App() {
  const { t } = useTranslation();
  const ready = useAuthStore((s) => s.ready);
  const error = useAuthStore((s) => s.error);
  const [callObject, setCallObject] = useState(() => DailyService.getInstance().callObject);

  useEffect(() => {
    const dailyService = DailyService.getInstance();
    dailyService.onCallObjectChanged(setCallObject);

    // Real tab close/refresh: release camera/mic and tear down the call for good.
    const handleBeforeUnload = () => {
      dailyService.destroy();
      resetCallState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // App re-mounting without the page actually unloading (StrictMode's
      // dev double-invoke, Vite HMR) leaves the old call object destroyed —
      // rebuild so the singleton stays usable and push the new object
      // through onCallObjectChanged so DailyProvider re-renders with it.
      dailyService.rebuild();
    };
  }, []);

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-brand-canvas)]">
      <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
        <h3 className="text-base font-bold text-slate-800">{t('error.initError')}</h3>
        <p className="text-xs text-slate-500 mt-2">{error}</p>
        <button
          onClick={() => window.location.replace('/login')}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
        >
          {t('error.tryAgain')}
        </button>
      </div>
    </div>
  );

  if (!ready) return <div>{t('call.loadingSession')}</div>;

  return (
    <DailyProvider callObject={callObject}>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/painel" element={<UserPainelPage />} />
            <Route path="/profile" element={<UserProfileContainer />} />
            <Route path="/payments" element={<PaymentsPageContainer />} />
            <Route path="/token-history" element={<TokenHistoryPageContainer />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={['admin', 'customer']} />}>
            <Route path="/customer" element={<CustomerPageContainer />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={['admin', 'attendant']} />}>
            <Route path="/attendant" element={<AttendantPageContainer />} />
          </Route>

          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </QueryClientProvider>
    </DailyProvider>
  );
}
