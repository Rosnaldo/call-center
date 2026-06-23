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
  AlertCircle, 
  Sparkles,
  ArrowLeft,
  KeyRound,
  CheckCircle2
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const step = (searchParams.get('step') as 'request' | 'verify_code' | 'new_password' | 'done') || 'request';
  const email = searchParams.get('email') || '';

  const handleRequestReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const emailVal = (formData.get('email') as string || '').trim();

    const errorAlert = document.getElementById('forgot-error-alert');
    const errorMessage = document.getElementById('forgot-error-message');
    const successAlert = document.getElementById('forgot-success-alert');
    const successMessage = document.getElementById('forgot-success-message');

    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert) successAlert.classList.add('hidden');

    if (!emailVal) {
      if (errorMessage) errorMessage.innerText = 'Por favor, informe seu e-mail cadastrado.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (successAlert && successMessage) {
      successMessage.innerText = `Instruções de redefinição direcionadas para ${emailVal}. Código de teste: 1234`;
      successAlert.classList.remove('hidden');
    }

    setTimeout(() => {
      window.history.pushState(null, '', `?step=verify_code&email=${encodeURIComponent(emailVal)}`);
    }, 1500);
  };

  const handleVerifyCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get('code') as string || '').trim();

    const errorAlert = document.getElementById('forgot-error-alert');
    const errorMessage = document.getElementById('forgot-error-message');
    const successAlert = document.getElementById('forgot-success-alert');
    const successMessage = document.getElementById('forgot-success-message');

    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert) successAlert.classList.add('hidden');

    if (!code) {
      if (errorMessage) errorMessage.innerText = 'Por favor, insira o código de validação.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (code !== '1234') {
      if (errorMessage) errorMessage.innerText = 'Código inválido ou expirado. Use o código de simulação: 1234';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (successAlert && successMessage) {
      successMessage.innerText = 'Código verificado com sucesso!';
      successAlert.classList.remove('hidden');
    }

    setTimeout(() => {
      window.history.pushState(null, '', `?step=new_password&email=${encodeURIComponent(email)}`);
    }, 1000);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = (formData.get('newPassword') as string || '').trim();
    const confirmNewPassword = (formData.get('confirmNewPassword') as string || '').trim();

    const errorAlert = document.getElementById('forgot-error-alert');
    const errorMessage = document.getElementById('forgot-error-message');
    const successAlert = document.getElementById('forgot-success-alert');
    const successMessage = document.getElementById('forgot-success-message');

    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert) successAlert.classList.add('hidden');

    if (!newPassword || !confirmNewPassword) {
      if (errorMessage) errorMessage.innerText = 'Por favor, preencha todos os campos obrigatórios.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (newPassword.length < 4) {
      if (errorMessage) errorMessage.innerText = 'Sua nova senha deve conter pelo menos 4 caracteres.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      if (errorMessage) errorMessage.innerText = 'As senhas não coincidem.';
      if (errorAlert) errorAlert.classList.remove('hidden');
      return;
    }

    if (successAlert && successMessage) {
      successMessage.innerText = 'Sua senha de segurança foi redefinida com sucesso.';
      successAlert.classList.remove('hidden');
    }

    setTimeout(() => {
      window.history.pushState(null, '', `?step=done&email=${encodeURIComponent(email)}`);
    }, 1500);
  };

  const togglePasswordVisibility = () => {
    const passwordInput = document.getElementById('reset-new-password') as HTMLInputElement | null;
    const showIcon = document.getElementById('reset-eye-show');
    const hideIcon = document.getElementById('reset-eye-hide');

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
    const passwordInput = document.getElementById('reset-confirm-password') as HTMLInputElement | null;
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
      id="forgot-password-page-container" 
      className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-12 relative overflow-hidden font-sans"
    >
      {/* Decorative Brand Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div id="forgot-brand-logo" className="flex flex-col items-center text-center gap-2 select-none">
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

        {/* Forgot Password Card */}
        <div 
          id="forgot-card-panel" 
          className="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-5"
        >
          {/* Header Link */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <h3 className="text-sm font-bold tracking-tight text-brand-dark">
              {step === 'request' && 'Recuperar Senha'}
              {step === 'verify_code' && 'Validar Código'}
              {step === 'new_password' && 'Criar Nova Senha'}
              {step === 'done' && 'Sucesso!'}
            </h3>
            {step !== 'done' && (
              <a 
                href="/login" 
                className="text-xs text-brand-ochre hover:text-brand-ochre-hover flex items-center gap-1 transition animate-fade-in"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao login</span>
              </a>
            )}
          </div>

          {/* Feedback Alerts */}
          <div 
            id="forgot-error-alert" 
            className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5 hidden animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span id="forgot-error-message"></span>
          </div>

          <div 
            id="forgot-success-alert" 
            className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5 hidden animate-fade-in"
          >
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
            <span id="forgot-success-message"></span>
          </div>

          {/* Core forms based on step state */}
          {step === 'request' && (
            <form id="forgot-request-form" onSubmit={handleRequestReset} className="flex flex-col gap-4">
              <p className="text-xs text-brand-muted leading-relaxed text-left">
                Esqueceu seus dados de acesso? Informe o endereço de e-mail de sua conta cadastrada. Nós simularemos o envio de instruções imediatas de redefinição.
              </p>

              <div className="flex flex-col gap-1.5 text-left mt-2">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="forgot-email">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    placeholder="andrey@site.com"
                    defaultValue={email}
                    className="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="forgot-submit-btn"
                className="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Enviar Código de Redefinição</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'verify_code' && (
            <form id="forgot-verify-form" onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <p className="text-xs text-brand-muted leading-relaxed text-left">
                Um código temporário de verificação foi gerado. Use o token de teste <strong className="text-brand-ochre">1234</strong> para prosseguir com a redefinição de segurança.
              </p>

              <div className="flex flex-col gap-1.5 text-left mt-2">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="forgot-code">
                  Código de 4 dígitos enviado
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="forgot-code"
                    name="code"
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1234"
                    className="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre text-center font-mono tracking-[0.3em] font-bold text-lg transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-brand-muted">
                <span>Não recebeu o código?</span>
                <a
                  href="?step=request"
                  className="text-brand-ochre hover:underline font-semibold cursor-pointer"
                >
                  Reenviar e-mail
                </a>
              </div>

              <button
                type="submit"
                id="forgot-verify-code-btn"
                className="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Validar Código</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'new_password' && (
            <form id="forgot-reset-form" onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-brand-muted leading-relaxed text-left">
                Sua identidade foi validada. Defina sua nova senha mestra de acesso para a conta <span className="font-semibold text-brand-dark">{email}</span>.
              </p>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5 text-left mt-2">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="reset-new-password">
                  Nova senha (mínimo 4 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="reset-new-password"
                    name="newPassword"
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
                    <span id="reset-eye-show" className="block"><Eye className="w-3.5 h-3.5" /></span>
                    <span id="reset-eye-hide" className="hidden"><EyeOff className="w-3.5 h-3.5" /></span>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase" htmlFor="reset-confirm-password">
                  Confirme a nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" />
                  <input
                    id="reset-confirm-password"
                    name="confirmNewPassword"
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
                id="forgot-save-pass-btn"
                className="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Concluir Redefinição</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'done' && (
            <div id="forgot-done-view" className="flex flex-col items-center justify-center py-6 text-center gap-4 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 scale-110">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-brand-dark">Acesso Restabelecido!</h4>
                <p className="text-xs text-brand-muted max-w-sm mt-0.5 leading-relaxed">
                  Sua nova senha de segurança foi armazenada com sucesso no sistema. Você já pode acessar sua conta utilizando as novas credenciais.
                </p>
              </div>
              <a
                href="/login"
                className="px-6 py-2.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs font-bold leading-none mt-3.5 hover:scale-[1.02] shadow-none active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center"
              >
                Retornar ao Login
              </a>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
