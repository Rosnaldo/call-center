/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useCallStore } from './states/call/store.ts';
import { useAuthentication } from './hooks/auth/useAuthentication.ts';
import { LoginPage } from './pages/LoginPage.tsx';
import { CustomerPageContainer } from './pages/customer-page/container.tsx';
import { AttendantPageContainer } from './pages/attendant-page/container.tsx';
import { UserProfileContainer } from './pages/user-profile/container.tsx';
import { PaymentsPageContainer } from './pages/payments-page/container.tsx';
import { TokenHistoryPageContainer } from './pages/token-history-page/container.tsx';
import { Footer } from './components/Footer.tsx';
import { useCurrentUserStore } from './states/current-user/store.ts';
import { useOnlineUsersStore } from './states/online-users/store.ts';


export default function App() {
  const completeCall = useCallStore((s) => s.completeCall);
  const updateCall = useCallStore((s) => s.updateCall);

  const removeUser = useOnlineUsersStore((s) => s.removeUser);

  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const {
    selectIdentity,
    leaveSession
  } = useAuthentication();

  const reactNavigator = useNavigate();
  const navigate = useCallback((path: string) => {
    if (path.startsWith('/')) {
      reactNavigator(path);
    } else {
      reactNavigator(`/${path}`);
    }
  }, [reactNavigator]);

  const handleSelectIdentity = (user: any) => {
    selectIdentity(user);
    if (user.role === 'customer') {
      navigate('customer');
    } else {
      navigate('attendant');
    }
  };

  const handleLogout = () => {
    const isSimulation = (import.meta as any).env?.VITE_ENV !== 'production'
    if (!isSimulation) {
      removeUser(currentUser?.id || '');
    }
    leaveSession();
    navigate('login');
  };

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      
      <Routes>
        {/* ROOT REDIRECT */}
        <Route path="/" element={
          currentUser ? (
            currentUser.role === 'customer' ? (
              <Navigate to="/customer" replace />
            ) : (
              <Navigate to="/attendant" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROUTE 1: LOGIN DO USUARIO */}
        <Route path="/login" element={
          <LoginPage
            currentUser={currentUser}
            navigate={navigate}
            handleLogout={handleLogout}
            handleSelectIdentity={handleSelectIdentity}
          />
        } />

        {/* ROUTE 2: VISAO DO CLIENTE */}
        <Route path="/customer" element={
          currentUser ? (
            <CustomerPageContainer
              navigate={navigate}
              handleLogout={handleLogout}
              completeCall={completeCall}
              updateCall={updateCall}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROUTE 3: VISAO DO ATENDENTE */}
        <Route path="/attendant" element={
          currentUser ? (
            <AttendantPageContainer
              navigate={navigate}
              handleLogout={handleLogout}
              completeCall={completeCall}
              updateCall={updateCall}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROUTE 4: OUTRA PAGINA DE CONFIGURACAO DE PERFIL DO USUARIO */}
        <Route path="/profile" element={
          currentUser ? (
            <UserProfileContainer
              onLogout={handleLogout}
              navigate={navigate}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROUTE 5: PAGINA DE PAGAMENTOS COM PIX PARA COMPRA DE TOKENS */}
        <Route path="/payments" element={
          currentUser ? (
            <PaymentsPageContainer
              handleLogout={handleLogout}
              navigate={navigate}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROUTE 6: HISTORICO DE TOKENS CONSUMIDOS */}
        <Route path="/token-history" element={
          currentUser ? (
            <TokenHistoryPageContainer
              handleLogout={handleLogout}
              navigate={navigate}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
