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
  UserPlus, 
  ChevronRight, 
  AlertCircle, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const handleSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get('firstName') as string || '').trim();
    const lastName = (formData.get('lastName') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const password = (formData.get('password') as string || '').trim();
    const confirmPassword = (formData.get('confirmPassword') as string || '').trim();

    const errorAlert = document.getElementById('register-error-alert');
    const errorMessage = document.getElementById('register-error-message');
    const successAlert = document.getElementById('register-success-alert');

    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert) successAlert.classList.add('hidden');

    // Basic validity checks
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      if (errorMessage) errorMessage.innerText = 'Por favor, preencha todos os campos obrigatórios.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (password.length < 4) {
      if (errorMessage) errorMessage.innerText = 'A senha deve conter pelo menos 4 caracteres.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (password !== confirmPassword) {
      if (errorMessage) errorMessage.innerText = 'A confirmação de senha é diferente da senha digitada.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (successAlert) successAlert.classList.remove('hidden');
    
    setTimeout(() => {
      window.history.pushState(null, '', `/verify-email?email=${encodeURIComponent(email)}`);
    }, 1200);
  };

  const togglePasswordVisibility = () => {
    const passwordInput = document.getElementById('signup-password') as HTMLInputElement | null;
    const showIcon = document.getElementById('signup-eye-show');
    const hideIcon = document.getElementById('signup-eye-hide');

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

  const toggleConfirmPasswordVisibility = () => {
    const passwordInput = document.getElementById('signup-confirm-password') as HTMLInputElement | null;
    const showIcon = document.getElementById('confirm-eye-show');
    const hideIcon = document.getElementById('confirm-eye-hide');

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
      id="register-page-container" 
      className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-12 relative overflow-hidden font-sans"
    >
      {/* Decorative Brand Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div id="register-brand-logo" className="flex flex-col items-center text-center gap-2 select-none">
          <a href="/login" className="p-3 bg-brand-ochre text-white rounded-2xl shadow-sm inline-flex items-center justify-center hover:opacity-90 transition">
            <Video className="w-6 h-6" />
          </a>
          <div>
            <h1 className="font-extrabold text-brand-dark text-2xl tracking-tight font-display">
              Open<span className="text-brand-ochre">Hive</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-brand-muted uppercase mt-1">
              Automated Operations Portal
            </p>
          </div>
        </div>

        {/* Register Card */}
        <div 
          id="register-card-panel" 
          className="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-5"
        >
          {/* Header Link */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <h3 className="text-sm font-bold tracking-tight text-brand-dark">
              Criar Nova Conta
            </h3>
            <a 
              href="/login" 
              className="text-xs text-brand-ochre hover:text-brand-ochre-hover flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login</span>
            </a>
          </div>

          {/* Feedback Alerts */}
          <div 
            id="register-error-alert" 
            className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5 hidden animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span id="register-error-message"></span>
          </div>

          <div 
            id="register-success-alert" 
            className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5 hidden"
          >
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
            <span>Inscrição realizada! Direcionando para verificação de e-mail...</span>
          </div>

          {/* Sign Up Form */}
          <form id="signup-credentials-form" onSubmit={handleSignUp} className="flex flex-col gap-4">
            
            {/* Split First and Last Name */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signup-firstname">
                  Nome (First Name)
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="signup-firstname"
                    name="firstName"
                    type="text"
                    required
                    placeholder="Andrey"
                    className="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signup-lastname">
                  Sobrenome (Last Name)
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="signup-lastname"
                    name="lastName"
                    type="text"
                    required
                    placeholder="Tsuzuki"
                    className="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signup-email">
                E-mail Corporativo ou Pessoal
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  placeholder="andrey@site.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signup-password">
                Defina uma senha (mínimo 4 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
                  title="Alterar visibilidade da senha"
                >
                  <span id="signup-eye-show" className="block"><Eye className="w-3.5 h-3.5" /></span>
                  <span id="signup-eye-hide" className="hidden"><EyeOff className="w-3.5 h-3.5" /></span>
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="signup-confirm-password">
                Confirme sua senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
                  title="Alterar visibilidade da senha"
                >
                  <span id="confirm-eye-show" className="block"><Eye className="w-3.5 h-3.5" /></span>
                  <span id="confirm-eye-hide" className="hidden"><EyeOff className="w-3.5 h-3.5" /></span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="signup-submit-btn"
              className="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Concluir Cadastro</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Alternative Link */}
          <div className="text-center pt-2 mt-1 border-t border-brand-border">
            <span className="text-xs text-brand-muted">
              Já possui registro?{' '}
              <a href="/login" className="text-brand-ochre hover:text-brand-ochre-hover font-bold transition">
                Acesse sua conta
              </a>
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
