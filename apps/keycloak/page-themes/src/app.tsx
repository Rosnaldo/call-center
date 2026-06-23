/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { EmailVerificationPage } from './pages/EmailVerificationPage.tsx';
import { EmailExpiredPage } from './pages/EmailExpiredPage.tsx';
import { LoginErrorPage } from './pages/LoginErrorPage.tsx';
import { Footer } from './components/Footer.tsx';


export default function App() {
  
  return (
    <div id="app-root-wrapper" className="min-h-screen bg-brand-canvas text-brand-dark antialiased selection:bg-brand-ochre/20 pb-12">
      
      <Routes>
        {/* ROOT REDIRECT */}
        <Route path="/" element={<Navigate to={"/login"} replace />} />

        {/* ROUTE: LOGIN WITH EMAIL/PASSWORD FORM */}
        <Route path="/login" element={
          <LoginPage />
        } />

        {/* ROUTE: REGISTER WITH SPLIT FORM FIELDS */}
        <Route path="/register" element={
            <RegisterPage />} />

        {/* ROUTE: FORGOT PASSWORD INTERACTIVE FORM */}
        <Route path="/forgot-password" element={
          <ForgotPasswordPage />
        } />

        {/* ROUTE: EMAIL VERIFICATION INTERACTIVE FORM */}
        <Route path="/verify-email" element={
          <EmailVerificationPage />
        } />

        {/* ROUTE: EMAIL EXPIRED PAGE */}
        <Route path="/email-expired" element={
          <EmailExpiredPage />
        } />

        {/* ROUTE: LOGIN ERROR WITH FEEDBACK MESSAGE */}
        <Route path="/login-error" element={
          <LoginErrorPage />
        } />
      </Routes>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
