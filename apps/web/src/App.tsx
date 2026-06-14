/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.tsx';
import { CustomerPageContainer } from './pages/customer-page/container.tsx';
import { AttendantPageContainer } from './pages/attendant-page/container.tsx';
import { UserProfileContainer } from './pages/user-profile/container.tsx';
import { PaymentsPageContainer } from './pages/payments-page/container.tsx';
import { TokenHistoryPageContainer } from './pages/token-history-page/container.tsx';
import { Footer } from './components/Footer.tsx';
import { ProtectedRoute } from './protected-route.tsx';
import { UserPainelPage } from './pages/UserPainelPage.tsx';
import { AuthProvider } from "./providers/auth-provider";

export default function App() {
  return (
    <AuthProvider>

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/painel" element={<UserPainelPage />} />
          <Route path="/customer" element={<CustomerPageContainer />} />
          <Route path="/attendant" element={<AttendantPageContainer />} />
          <Route path="/profile" element={<UserProfileContainer />} />
          <Route path="/payments" element={<PaymentsPageContainer />} />
          <Route path="/token-history" element={<TokenHistoryPageContainer />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Footer />
    </AuthProvider>
  );
}
