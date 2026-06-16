<#import "template.ftl" as layout>

<style>
  .input-py { padding-block: 0.75rem; }
  .btn-py { padding-block: 0.875rem; }
  .left-icon { left: 0.875rem; }
  .right-icon { right: 0.75rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .pb-3 { padding-bottom: 0.75rem; }
  .text-10 { font-size: 0.625rem; }
  .gap-1-5 { gap: 0.375rem; }
  .gap-2-5 { gap: 0.625rem; }
  .gap-3-5 { gap: 0.875rem; }
</style>

<@layout.registrationLayout title="Cadastrar • ChácaraMeets">

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
      Criar Nova Conta
    </h3>
    <a href="${url.loginUrl}" class="text-xs text-primary hover:text-primary/80 flex items-center gap-1-5 transition-colors mt-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span>Voltar ao login</span>
    </a>
  </div>

  <!-- Global Message Alert -->
  <#if message?has_content>
    <#if message.type == "error">
      <div class="bg-destructive/10 border border-accent/20 text-destructive rounded-xl px-4 py-2 text-xs font-medium flex items-start gap-2-5 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${kcSanitize(message.summary)?no_esc}</span>
      </div>
    <#elseif message.type == "success">
      <div class="bg-green-500/10 border border-accent/20 text-green-500 rounded-xl px-4 py-2 text-xs font-medium flex items-start gap-2-5 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 mt-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 13l4 4L19 7" />
        </svg>
        <span>${kcSanitize(message.summary)?no_esc}</span>
      </div>
    </#if>
  </#if>

  <!-- Registration Form -->
  <form id="kc-register-form" action="${url.registrationAction}" method="post" class="flex flex-col gap-4" novalidate>

    <!-- First Name + Last Name -->
    <div class="grid grid-cols-2 gap-3-5">

      <div class="flex flex-col gap-1-5">
        <label for="firstName" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
          Nome
        </label>
        <div class="relative">
          <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value="${(register.formData.firstName!'')}"
            placeholder="Andrey"
            required
            autocomplete="given-name"
            class="w-full input-py pl-10 pr-3 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
          />
        </div>
        <#if messagesPerField.existsError('firstName')>
          <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('firstName'))}</p>
        </#if>
      </div>

      <div class="flex flex-col gap-1-5">
        <label for="lastName" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
          Sobrenome
        </label>
        <div class="relative">
          <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value="${(register.formData.lastName!'')}"
            placeholder="Tsuzuki"
            required
            autocomplete="family-name"
            class="w-full input-py pl-10 pr-3 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
          />
        </div>
        <#if messagesPerField.existsError('lastName')>
          <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('lastName'))}</p>
        </#if>
      </div>

    </div>

    <!-- Username (somente quando o realm NÃO usa email como username) -->
    <#if !realm.registrationEmailAsUsername>
      <div class="flex flex-col gap-1-5">
        <label for="username" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value="${(register.formData.username!'')}"
          placeholder="seu_usuario"
          autocomplete="username"
          class="w-full input-py px-4 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
        />
        <#if messagesPerField.existsError('username')>
          <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('username'))}</p>
        </#if>
      </div>
    <#else>
      <input type="hidden" id="username" name="username" value="${(register.formData.email!'')}" />
    </#if>

    <!-- Email -->
    <div class="flex flex-col gap-1-5">
      <label for="email" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
        E-mail Corporativo ou Pessoal
      </label>
      <div class="relative">
        <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
        </span>
        <input
          id="email"
          name="email"
          type="email"
          value="${(register.formData.email!'')}"
          placeholder="andrey@site.com"
          required
          autocomplete="email"
          class="w-full input-py pl-10 pr-4 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
        />
      </div>
      <#if messagesPerField.existsError('email')>
        <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('email'))}</p>
      </#if>
    </div>

    <#if realm.password>

      <!-- Password -->
      <div class="flex flex-col gap-1-5">
        <label for="password" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
          Defina uma senha
        </label>
        <div class="relative">
          <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
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
            autocomplete="new-password"
            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
            class="w-full input-py pl-10 pr-10 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
          />
          <button type="button" id="toggle-password"
            class="absolute right-icon top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer outline-none"
            title="Ver/Ocultar senha">
            <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg id="eye-off-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>
        <#if messagesPerField.existsError('password')>
          <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('password'))?no_esc}</p>
        </#if>
      </div>

      <!-- Confirm Password -->
      <div class="flex flex-col gap-1-5">
        <label for="password-confirm" class="text-10 font-bold tracking-widest text-muted-foreground uppercase">
          Confirme sua senha
        </label>
        <div class="relative">
          <span class="absolute left-icon top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 11c1.105 0 2 .895 2 2v3H10v-3c0-1.105.895-2 2-2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </span>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
            class="w-full input-py pl-10 pr-10 bg-background/50 border border-input rounded-xl text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-all outline-none"
          />
          <button type="button" id="toggle-confirm-password"
            class="absolute right-icon top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer outline-none"
            title="Ver/Ocultar senha">
            <svg id="confirm-eye-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg id="confirm-eye-off-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>
        <p id="password-mismatch" class="text-xs text-destructive hidden">As senhas não coincidem.</p>
        <#if messagesPerField.existsError('password-confirm')>
          <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
        </#if>
      </div>

    </#if>

    <!-- Submit -->
    <button type="submit"
      class="w-full btn-py bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1-5 mt-2"
    >
      <span>Concluir Cadastro</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

  </form>

  <!-- Login Link -->
  <div class="text-center pb-3 border-t border-input mt-6">
    <span class="text-xs text-muted-foreground mt-2 block">
      Já possui registro?
      <a href="${url.loginUrl}" class="text-primary hover:text-primary/80 font-bold transition-colors">
        Acesse sua conta
      </a>
    </span>
  </div>

  <script>
    (function () {
      var email = document.getElementById('email');
      var username = document.getElementById('username');

      if (email && username && username.type === 'hidden') {
        email.addEventListener('input', function () { username.value = email.value; });
      }

      function makeToggle(btnId, inputId, eyeId, eyeOffId) {
        var btn = document.getElementById(btnId);
        var input = document.getElementById(inputId);
        var eye = document.getElementById(eyeId);
        var eyeOff = document.getElementById(eyeOffId);
        if (!btn || !input || !eye || !eyeOff) return;
        btn.addEventListener('click', function () {
          var show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          eye.classList.toggle('hidden', show);
          eyeOff.classList.toggle('hidden', !show);
        });
      }

      makeToggle('toggle-password', 'password', 'eye-icon', 'eye-off-icon');
      makeToggle('toggle-confirm-password', 'password-confirm', 'confirm-eye-icon', 'confirm-eye-off-icon');

      var pass = document.getElementById('password');
      var pass2 = document.getElementById('password-confirm');
      var mismatch = document.getElementById('password-mismatch');
      var form = document.getElementById('kc-register-form');

      if (pass && pass2 && mismatch) {
        function check() {
          mismatch.classList.toggle('hidden', !pass2.value || pass.value === pass2.value);
        }
        pass.addEventListener('input', check);
        pass2.addEventListener('input', check);
      }
      if (form && pass && pass2) {
        form.addEventListener('submit', function (e) {
          if (pass.value !== pass2.value) {
            e.preventDefault();
            if (mismatch) mismatch.classList.remove('hidden');
          }
        });
      }
    })();
  </script>

</@layout.registrationLayout>
