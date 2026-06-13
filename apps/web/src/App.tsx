/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.tsx';
import { CustomerPageContainer } from './pages/customer-page/container.tsx';
import { AttendantPageContainer } from './pages/attendant-page/container.tsx';
import { UserProfileContainer } from './pages/user-profile/container.tsx';
import { PaymentsPageContainer } from './pages/payments-page/container.tsx';
import { TokenHistoryPageContainer } from './pages/token-history-page/container.tsx';
import { Footer } from './components/Footer.tsx';
import { ProtectedRoute } from './protected-route.tsx';
import { UserPainelPage } from './pages/UserPainelPage.tsx';

export default function App() {
  const reactNavigator = useNavigate();
  const navigate = useCallback((path: string) => {
    if (path.startsWith('/')) {
      reactNavigator(path);
    } else {
      reactNavigator(`/${path}`);
    }
  }, [reactNavigator]);

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900 pb-12">

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/painel" element={<UserPainelPage />} />
          <Route path="/customer" element={<CustomerPageContainer navigate={navigate} />} />
          <Route path="/attendant" element={<AttendantPageContainer navigate={navigate} />} />
          <Route path="/profile" element={<UserProfileContainer navigate={navigate} />} />
          <Route path="/payments" element={<PaymentsPageContainer navigate={navigate} />} />
          <Route path="/token-history" element={<TokenHistoryPageContainer navigate={navigate} />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Footer />
    </div>
  );
}
