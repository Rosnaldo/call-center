<#import "template.ftl" as layout>
<@layout.registrationLayout>

  <div class="flex flex-col gap-6 text-center items-center">
    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100/50">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 22h14"></path>
        <path d="M5 2h14"></path>
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
      </svg>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="text-xl font-bold tracking-tight text-brand-dark">
        Link de verificação expirado
      </h2>
      <p class="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
        Por razões de segurança, os links de ativação expiram após 24 horas. Solicite um novo link
        abaixo para confirmar a posse de sua conta corporativa.
      </p>
    </div>

    <#include "back-to-login.ftl">
  </div>

</@layout.registrationLayout>
