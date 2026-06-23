<#import "template.ftl" as layout>

<@layout.registrationLayout title="Recuperar Senha • Call">

  <!-- Card Header -->
  <div class="flex items-center justify-between pb-3 border-b border-brand-border">
    <h3 class="text-sm font-bold tracking-tight text-brand-dark">
      Recuperar Senha
    </h3>
    <a href="${url.loginUrl}" class="text-xs text-brand-ochre hover:text-brand-ochre-hover flex items-center gap-1 transition">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l-7-7 7-7" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5" />
      </svg>
      <span>Voltar ao login</span>
    </a>
  </div>

  <!-- Error Alert -->
  <#if message?has_content && message.type == "error">
    <div class="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" x2="12" y1="8" y2="12"></line>
        <line x1="12" x2="12.01" y1="16" y2="16"></line>
      </svg>
      <span>${kcSanitize(message.summary)?no_esc}</span>
    </div>
  </#if>

  <!-- Form -->
  <form id="kc-reset-password-form" action="${url.loginAction}" method="post" class="flex flex-col gap-4">

    <!-- Description -->
    <p class="text-xs text-brand-muted leading-relaxed text-left">
      Esqueceu seus dados de acesso? Informe o endereço de e-mail da sua conta e enviaremos as instruções de redefinição imediatamente.
    </p>

    <!-- Email -->
    <div class="flex flex-col gap-1.5 text-left mt-2">
      <label for="username" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
        E-mail cadastrado
      </label>
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        </svg>
        <input
          id="username"
          name="username"
          type="text"
          value="${(auth.attemptedUsername!'')}"
          placeholder="seu@email.com"
          required
          autofocus
          aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
          class="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
      </div>
      <#if messagesPerField.existsError('username')>
        <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
      </#if>
    </div>

    <!-- Submit -->
    <button type="submit"
      class="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
    >
      <span>Enviar Código de Redefinição</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

  </form>

</@layout.registrationLayout>
