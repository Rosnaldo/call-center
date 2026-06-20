/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "sonner";
import DailyIframe from '@daily-co/daily-js';
import { DailyProvider } from '@daily-co/daily-react';
import { LoginPage } from './pages/LoginPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { CustomerPageContainer } from './pages/customer-page/container.tsx';
import { AttendantPageContainer } from './pages/attendant-page/container.tsx';
import { UserProfileContainer } from './pages/user-profile/container.tsx';
import { PaymentsPageContainer } from './pages/payments-page/container.tsx';
import { TokenHistoryPageContainer } from './pages/token-history-page/container.tsx';
import { Footer } from './components/Footer.tsx';
import { ProtectedRoute } from './protected-route.tsx';
import { UserPainelPage } from './pages/UserPainelPage.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProtectedRoute } from './role-protected-route.tsx';
import { useAuthStore } from './states/auth/store.ts';

const queryClient = new QueryClient();
const callObject = DailyIframe.createCallObject();

export default function App() {
  const ready = useAuthStore((s) => s.ready);
  const error = useAuthStore((s) => s.error);
  const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-brand-canvas)]">
      <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Erro ao inicializar</h3>
        <p className="text-xs text-slate-500 mt-2">{error}</p>
        <button
          onClick={() => window.location.replace('/login')}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  if (!ready && !isSimulation) return <div>Loading session…</div>;

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

      <Footer />
    </QueryClientProvider>
    </DailyProvider>
  );
}
