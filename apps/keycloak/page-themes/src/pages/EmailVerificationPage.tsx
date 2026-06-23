/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Video, 
  Mail, 
  ArrowLeft,
  ShieldCheck,
  Send,
  CheckCircle2
} from 'lucide-react';

export const EmailVerificationPage: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const emailToVerify = searchParams.get('email') || 'usuario@openhive.io';
  const resent = searchParams.get('resent') === 'true';

  const handleResend = () => {
    window.history.pushState(null, '', `?email=${encodeURIComponent(emailToVerify)}&resent=true`);
  };

  return (
    <div 
      id="email-verification-page-container" 
      className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-12 relative overflow-hidden font-sans"
    >
      {/* Decorative Brand Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div id="verify-brand-logo" className="flex flex-col items-center text-center gap-2 select-none">
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

        {/* Verification Card */}
        <div 
          id="verification-card-panel" 
          className="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-6 text-center items-center"
        >
          {/* Decorative Icon */}
          <div className="w-16 h-16 bg-brand-ochre/10 rounded-full flex items-center justify-center text-brand-ochre">
            <Mail className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2">
            {/* Title requested exactly: "Verifique seu e-mail" */}
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              Verifique seu e-mail
            </h2>
            {/* Description requested exactly: "Você precisa verificar o seu endereço de e-mail para ativar sua conta." */}
            <p className="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
              Você precisa verificar o seu endereço de e-mail para ativar sua conta.
            </p>
          </div>

          {/* Target email preview for realistic feel */}
          <div className="w-full px-4 py-3 bg-brand-canvas border border-brand-border rounded-2xl flex items-center justify-center gap-2 max-w-sm">
            <ShieldCheck className="w-4 h-4 text-brand-ochre shrink-0" />
            <span className="text-xs font-bold text-brand-dark truncate">{emailToVerify}</span>
          </div>

          {resent && (
            <div 
              id="verification-success-alert" 
              className="w-full bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-xs font-medium flex items-start gap-2.5 animate-fade-in text-left max-w-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Um novo link de ativação foi enviado para o seu endereço de e-mail!</span>
            </div>
          )}

          {/* Resend button exactly matching "Reenviar e-mail de verificação" */}
          <button
            type="button"
            id="resend-verification-btn"
            onClick={handleResend}
            className="w-full max-w-sm py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer bg-brand-ochre hover:bg-brand-ochre-hover text-white"
          >
            <Send className="w-4 h-4" />
            <span>Reenviar e-mail de verificação</span>
          </button>

          {/* Helpful Navigation links */}
          <div className="flex flex-col gap-3 pt-4 border-t border-brand-border w-full max-w-sm">
            <a 
              href="/login" 
              className="text-xs text-brand-muted hover:text-brand-ochre flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para tela de Login</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
