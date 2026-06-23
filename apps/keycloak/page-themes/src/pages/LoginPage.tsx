/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Video, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '').trim();
    
    const errorAlert = document.getElementById('login-error-alert');
    const errorMessage = document.getElementById('login-error-message');

    if (!email || !password) {
      if (errorMessage) errorMessage.innerText = 'Por favor, preencha todos os campos.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (password.length < 4) {
      if (errorMessage) errorMessage.innerText = 'A senha deve conter pelo menos 4 caracteres.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (errorAlert) errorAlert.classList.add('hidden');

    // Direct user to email verification page on login attempt
    window.history.pushState(null, '', `/verify-email?email=${encodeURIComponent(email)}`);
  };

  const togglePasswordVisibility = () => {
    const passwordInput = document.getElementById('signin-password') as HTMLInputElement | null;
    const showIcon = document.getElementById('eye-icon-show');
    const hideIcon = document.getElementById('eye-icon-hide');

    if (passwordInput) {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (showIcon) showIcon.classList.add('hidden');
        if (hideIcon) hideIcon.classList.remove('hidden');
      } else {
        passwordInput.type = 'password';
        if (showIcon) showIcon.classList.remove('hidden');
        if (hideIcon) hideIcon.classList.add('hidden');
      }
    }
  };

  return (
    <div 
      id="login-page-container" 
      className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-12 relative overflow-hidden font-sans"
    >
      {/* Decorative Brand Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div id="login-brand-logo" className="flex flex-col items-center text-center gap-2 select-none">
          <div className="p-3 bg-brand-ochre text-white rounded-2xl shadow-sm inline-flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-brand-dark text-2xl tracking-tight font-display">
              Open<span className="text-brand-ochre">Hive</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-brand-muted uppercase mt-1">
              Automated Operations Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div 
          id="login-card-panel" 
          className="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-6"
        >
          {/* Header Link */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <h3 className="text-sm font-bold tracking-tight text-brand-dark">
              Acessar Sua Conta
            </h3>
          </div>

          {/* Feedback Alerts (Hidden by default, shown via DOM) */}
          <div 
            id="login-error-alert" 
            className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5 hidden"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span id="login-error-message"></span>
          </div>

          {/* Sign In Form */}
          <form id="signin-credentials-form" onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 align-left text-left">
              <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signin-email">
                E-mail institucional / pessoal
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted/70" />
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  required
                  placeholder="exemplo@openhive.io"
                  className="w-full pl-10 pr-4 py-3 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 align-left text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signin-password">
                  Senha de segurança
                </label>
                <a
                  href="/forgot-password"
                  className="text-[10px] text-brand-ochre hover:text-brand-ochre-hover font-semibold transition"
                >
                  Esqueceu?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted/70" />
                <input
                  id="signin-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
                  title="Alterar visibilidade da senha"
                >
                  <span id="eye-icon-show" className="block"><Eye className="w-4 h-4" /></span>
                  <span id="eye-icon-hide" className="hidden"><EyeOff className="w-4 h-4" /></span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="signin-submit-btn"
              className="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Acessar Painel Central</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Links block */}
          <div className="text-center pt-2 border-t border-brand-border">
            <span className="text-xs text-brand-muted">
              Não tem uma conta?{' '}
              <a href="/register" className="text-brand-ochre hover:text-brand-ochre-hover font-bold transition">
                Cadastre-se grátis
              </a>
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
