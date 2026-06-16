<#import "template.ftl" as layout>

<style>
  .input-py { padding-block: 0.75rem; }
  .btn-py { padding-block: 0.875rem; }
  .left-icon { left: 0.875rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .pb-3 { padding-bottom: 0.75rem; }
  .text-10 { font-size: 0.625rem; }
  .gap-1-5 { gap: 0.375rem; }
  .gap-2-5 { gap: 0.625rem; }
</style>

<@layout.registrationLayout title="Recuperar Senha • ChácaraMeets">

  <!-- Brand Logo -->
  <div class="flex flex-col items-center text-center gap-2 select-none mb-6">
    <a href="${url.loginUrl}" class="p-4 bg-primary text-primary-foreground rounded-2xl shadow-sm inline-flex items-center justify-center hover:bg-primary/90 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 10l4.553-2.069A1 1 0 0121 8.816v6.368a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    </a>
    <div>
      <h1 class="font-bold text-foreground text-2xl tracking-tight">
        Chácara<span class="text-primary">Meets</span>
      </h1>
      <p class="text-10 tracking-widest text-muted-foreground uppercase mt-1">
        Automated Operations Portal
      </p>
    </div>
  </div>

  <!-- Card Header -->
  <div class="flex items-center justify-between pb-3 border-t border-input mb-6">
    <h3 class="text-sm font-bold tracking-tight text-foreground mt-2">
      Recuperar Senha
    </h3>
    <a href="${url.loginUrl}" class="text-xs text-primary hover:text-primary/80 flex items-center gap-1-5 transition-colors mt-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span>Voltar ao login</span>
    </a>
  </div>

  <!-- Error Alert -->
  <#if message?has_content && message.type == "error">
    <div class="bg-destructive/10 border border-accent/20 text-destructive rounded-xl px-4 py-2 text-xs font-medium flex items-start gap-2-5 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>${kcSanitize(message.summary)?no_esc}</span>
    </div>
  </#if>

  <!-- Form -->
  <form id="kc-reset-password-form" action="${url.loginAction}" method="post" class="flex flex-col gap-4">

    <!-- Description -->
    <p class="text-xs text-muted-foreground leading-relaxed">
      Esqueceu seus dados de acesso? Informe o endereço de e-mail da sua conta e enviaremos as instruções de redefinição imediatamente.
    </p>

    <!-- Email -->
    <div class="flex flex-col gap-1-5">
      <label for="username" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
        E-mail cadastrado
      </label>
      <div class="relative">
        <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
        </span>
        <input
          id="username"
          name="username"
          type="text"
          value="${(auth.attemptedUsername!'')}"
          placeholder="seu@email.com"
          required
          autofocus
          aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
          class="w-full input-py pl-10 pr-4 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
        />
      </div>
      <#if messagesPerField.existsError('username')>
        <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
      </#if>
    </div>

    <!-- Submit -->
    <button type="submit"
      class="w-full btn-py bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1-5 mt-2"
    >
      <span>Enviar Código de Redefinição</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

  </form>

</@layout.registrationLayout>
