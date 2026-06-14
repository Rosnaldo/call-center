/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "sonner";
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
import { AuthProvider } from "./providers/auth-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProtectedRoute } from './role-protected-route.tsx';

export default function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}
