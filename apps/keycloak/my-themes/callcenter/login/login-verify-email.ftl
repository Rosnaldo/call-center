<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true>

  <div class="flex flex-col gap-6 text-center items-center">
    <div class="w-16 h-16 bg-brand-ochre/10 rounded-full flex items-center justify-center text-brand-ochre">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
      </svg>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="text-xl font-bold tracking-tight text-brand-dark">Verifique seu e-mail</h2>
      <p class="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
        Você precisa verificar o seu endereço de e-mail para ativar sua conta.
      </p>
    </div>

    <div class="w-full px-4 py-3 bg-brand-canvas border border-brand-border rounded-2xl flex items-center justify-center gap-2 max-w-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-brand-ochre shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
      <span class="text-xs font-bold text-brand-dark truncate">
        <#if verifyEmail??>${verifyEmail}<#else>${user.email}</#if>
      </span>
    </div>

    <form id="kc-verify-email-form" action="${url.loginAction}" method="post">
      <input type="hidden" name="resend" value="true" />
      <button
        type="submit"
        class="w-full max-w-sm py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer bg-brand-ochre hover:bg-brand-ochre-hover text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
          <path d="m21.854 2.147-10.94 10.939"></path>
        </svg>
        <span>Reenviar e-mail de verificação</span>
      </button>
    </form>

    <#include "back-to-login.ftl">
  </div>

</@layout.registrationLayout>
