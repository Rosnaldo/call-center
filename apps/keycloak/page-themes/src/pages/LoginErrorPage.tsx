/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Video, 
  AlertOctagon, 
  ArrowLeft
} from 'lucide-react';

export const LoginErrorPage: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  
  // Custom error reasons to make the page highly dynamic and rich
  const errorCode = searchParams.get('code') || 'AUTH_FAILED';
  const email = searchParams.get('email') || '';

  let errorTitle = 'Falha de Autenticação';
  let errorMessage = 'Não foi possível completar o acesso à sua conta corporativa. Por favor, revise suas credenciais de login ou tente novamente mais tarde.';

  if (errorCode === 'SUSPENDED') {
    errorTitle = 'Conta Suspensa';
    errorMessage = 'Este perfil de usuário foi suspenso temporariamente devido a violações das políticas de segurança do OpenHive ou pendências cadastrais.';
  } else if (errorCode === 'IP_BLOCKED') {
    errorTitle = 'Acesso Bloqueado';
    errorMessage = 'Detectamos múltiplas tentativas falhas de login de um endereço de IP não seguro. Por proteção, este acesso foi bloqueado por 15 minutos.';
  } else if (errorCode === 'CSRF_INVALID') {
    errorTitle = 'Sessão Expirada';
    errorMessage = 'Os tokens de segurança de sua sessão atual são inválidos ou expiraram devido ao tempo de inatividade. Por favor, restabeleça o login de forma limpa.';
  } else if (errorCode === 'PROVIDER_ERROR') {
    errorTitle = 'Erro do Provedor SSO';
    errorMessage = 'O provedor de autenticação de logon único corporativo respondeu com um erro crítico durante a troca de credenciais de segurança.';
  }

  return (
    <div 
      id="login-error-page-container" 
      className="min-h-screen flex items-center justify-center bg-brand-canvas px-4 py-12 relative overflow-hidden font-sans"
    >
      {/* Decorative Brand Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div id="error-brand-logo" className="flex flex-col items-center text-center gap-2 select-none">
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

        {/* Error Details Card */}
        <div 
          id="error-card-panel" 
          className="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-6 text-center items-center"
        >
          {/* Decorative Icon displaying Alert state */}
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100/50">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono font-bold tracking-widest text-red-500 uppercase">
              STATUS_ERROR: {errorCode}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              {errorTitle}
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
              {errorMessage}
            </p>
          </div>

          {/* Conditional custom info badge */}
          {email && (
            <div className="w-full px-4 py-3 bg-brand-canvas border border-brand-border rounded-2xl flex items-center justify-center gap-2 max-w-sm">
              <span className="text-[10px] text-brand-muted font-bold tracking-wide uppercase">Email Alvo:</span>
              <strong className="text-xs text-brand-dark truncate">{email}</strong>
            </div>
          )}

          {/* Navigation link block */}
          <div className="flex flex-col gap-3 border-t border-brand-border w-full max-w-sm pt-4">
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
