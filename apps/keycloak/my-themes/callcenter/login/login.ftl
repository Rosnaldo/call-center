<#import "template.ftl" as layout>


<@layout.registrationLayout title="Acessar Sua Conta • Call">

  <!-- Card Header -->
  <div class="flex items-center justify-between pb-3 border-b border-brand-border">
    <h3 class="text-sm font-bold tracking-tight text-brand-dark">
      Acessar Sua Conta
    </h3>
  </div>

  <!-- Global Error Alert -->
  <#if message?has_content && message.type == "error">
    <div class="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>${message.summary}</span>
    </div>
  </#if>

  <!-- Form -->
  <form id="kc-form-login" action="${url.loginAction}" method="post" class="flex flex-col gap-4">

    <!-- Email -->
    <div class="flex flex-col gap-1.5">
      <label for="username" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
        E-mail institucional / pessoal
      </label>
      <div class="relative">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
        </span>
        <input
          id="username"
          name="username"
          type="email"
          value="${(login.username!'')}"
          placeholder="exemplo@mail.io"
          required
          autofocus
          class="w-full pl-10 pr-4 py-3 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
      </div>
      <#if messagesPerField.existsError("username")>
        <p class="text-xs text-red-500">${messagesPerField.get("username")}</p>
      </#if>
    </div>

    <!-- Password -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label for="password" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Senha de segurança
        </label>
        <#if realm.resetPasswordAllowed>
          <a href="${url.loginResetCredentialsUrl}"
             class="text-[10px] text-brand-ochre hover:text-brand-ochre-hover font-semibold transition">
            Esqueceu?
          </a>
        </#if>
      </div>
      <div class="relative">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 11c1.105 0 2 .895 2 2v3H10v-3c0-1.105.895-2 2-2z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </span>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          class="w-full pl-10 pr-10 py-3 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
        <button
          type="button"
          onclick="kcTogglePassword()"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
          title="Ver/Ocultar senha"
        >
          <!-- Eye icon (visible password hidden) -->
          <svg id="kc-eye-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <!-- EyeOff icon (password visible) -->
          <svg id="kc-eye-off-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
      </div>
      <#if messagesPerField.existsError("password")>
        <p class="text-xs text-red-500">${messagesPerField.get("password")}</p>
      </#if>
    </div>

    <!-- Remember Me -->
    <#if realm.rememberMe>
      <div class="flex items-center gap-2">
        <input id="rememberMe" name="rememberMe" type="checkbox"
               <#if login.rememberMe?? && login.rememberMe>checked</#if> />
        <label for="rememberMe" class="text-sm text-brand-muted">Lembrar-me</label>
      </div>
    </#if>

    <!-- Submit -->
    <button
      type="submit"
      class="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
    >
      <span>Acessar Painel Central</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

  </form>

  <!-- Register Link -->
  <#if realm.registrationAllowed>
    <div class="text-center pt-2 border-t border-brand-border">
      <span class="text-xs text-brand-muted">
        Não tem uma conta?
        <a href="${url.registrationUrl}"
           class="text-brand-ochre hover:text-brand-ochre-hover font-bold transition">
          Cadastre-se grátis
        </a>
      </span>
    </div>
  </#if>

  <script>
    function kcTogglePassword() {
      var input = document.getElementById('password');
      var eye = document.getElementById('kc-eye-icon');
      var eyeOff = document.getElementById('kc-eye-off-icon');
      if (input.type === 'password') {
        input.type = 'text';
        eye.classList.add('hidden');
        eyeOff.classList.remove('hidden');
      } else {
        input.type = 'password';
        eye.classList.remove('hidden');
        eyeOff.classList.add('hidden');
      }
    }
  </script>

</@layout.registrationLayout>
