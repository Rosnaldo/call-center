<#import "template.ftl" as layout>

<@layout.registrationLayout title="Cadastrar • Call">

  <!-- Card Header -->
  <div class="flex items-center justify-between pb-3 border-b border-brand-border">
    <h3 class="text-sm font-bold tracking-tight text-brand-dark">
      Criar Nova Conta
    </h3>
    <a href="${url.loginUrl}" class="text-xs text-brand-ochre hover:text-brand-ochre-hover flex items-center gap-1 transition">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l-7-7 7-7" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5" />
      </svg>
      <span>Voltar ao login</span>
    </a>
  </div>

  <!-- Global Message Alert -->
  <#if message?has_content>
    <#if message.type == "error">
      <div class="bg-red-50 border border-red-100 text-red-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" x2="12" y1="8" y2="12"></line>
          <line x1="12" x2="12.01" y1="16" y2="16"></line>
        </svg>
        <span>${kcSanitize(message.summary)?no_esc}</span>
      </div>
    <#elseif message.type == "success">
      <div class="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 text-xs font-medium flex items-start gap-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>${kcSanitize(message.summary)?no_esc}</span>
      </div>
    </#if>
  </#if>

  <!-- Registration Form -->
  <form id="kc-register-form" action="${url.registrationAction}" method="post" class="flex flex-col gap-4" novalidate>

    <!-- First Name + Last Name -->
    <div class="grid grid-cols-2 gap-3.5">

      <div class="flex flex-col gap-1.5 text-left">
        <label for="firstName" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Nome (First Name)
        </label>
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" x2="19" y1="8" y2="14"></line>
            <line x1="22" x2="16" y1="11" y2="11"></line>
          </svg>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value="${(register.formData.firstName!'')}"
            placeholder="Andrey"
            required
            autocomplete="given-name"
            class="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
          />
        </div>
        <#if messagesPerField.existsError('firstName')>
          <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('firstName'))}</p>
        </#if>
      </div>

      <div class="flex flex-col gap-1.5 text-left">
        <label for="lastName" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Sobrenome (Last Name)
        </label>
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" x2="19" y1="8" y2="14"></line>
            <line x1="22" x2="16" y1="11" y2="11"></line>
          </svg>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value="${(register.formData.lastName!'')}"
            placeholder="Tsuzuki"
            required
            autocomplete="family-name"
            class="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
          />
        </div>
        <#if messagesPerField.existsError('lastName')>
          <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('lastName'))}</p>
        </#if>
      </div>

    </div>

    <!-- Username (somente quando o realm NÃO usa email como username) -->
    <#if !realm.registrationEmailAsUsername>
      <div class="flex flex-col gap-1.5 text-left">
        <label for="username" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value="${(register.formData.username!'')}"
          placeholder="seu_usuario"
          autocomplete="username"
          class="w-full py-2.5 px-4 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
        <#if messagesPerField.existsError('username')>
          <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('username'))}</p>
        </#if>
      </div>
    <#else>
      <input type="hidden" id="username" name="username" value="${(register.formData.email!'')}" />
    </#if>

    <!-- Email -->
    <div class="flex flex-col gap-1.5 text-left">
      <label for="email" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
        E-mail Corporativo ou Pessoal
      </label>
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        </svg>
        <input
          id="email"
          name="email"
          type="email"
          value="${(register.formData.email!'')}"
          placeholder="andrey@site.com"
          required
          autocomplete="email"
          class="w-full pl-9 pr-3 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
      </div>
      <#if messagesPerField.existsError('email')>
        <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('email'))}</p>
      </#if>
    </div>

    <#if realm.password>

      <!-- Password -->
      <div class="flex flex-col gap-1.5 text-left">
        <label for="password" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Defina uma senha (mínimo 4 caracteres)
        </label>
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
            class="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
          />
          <button type="button" id="toggle-password"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
            title="Alterar visibilidade da senha">
            <span id="eye-icon" class="block">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </span>
            <span id="eye-off-icon" class="hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path>
                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
                <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path>
                <path d="m2 2 20 20"></path>
              </svg>
            </span>
          </button>
        </div>
        <#if messagesPerField.existsError('password')>
          <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('password'))?no_esc}</p>
        </#if>
      </div>

      <!-- Confirm Password -->
      <div class="flex flex-col gap-1.5 text-left">
        <label for="password-confirm" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
          Confirme sua senha
        </label>
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
            class="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
          />
          <button type="button" id="toggle-confirm-password"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
            title="Alterar visibilidade da senha">
            <span id="confirm-eye-icon" class="block">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </span>
            <span id="confirm-eye-off-icon" class="hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path>
                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
                <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path>
                <path d="m2 2 20 20"></path>
              </svg>
            </span>
          </button>
        </div>
        <p id="password-mismatch" class="text-xs text-rose-500 hidden">As senhas não coincidem.</p>
        <#if messagesPerField.existsError('password-confirm')>
          <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
        </#if>
      </div>

    </#if>

    <!-- Submit -->
    <button type="submit"
      class="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
    >
      <span>Concluir Cadastro</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

  </form>

  <!-- Login Link -->
  <div class="text-center pt-2 mt-1 border-t border-brand-border">
    <span class="text-xs text-brand-muted">
      Já possui registro?
      <a href="${url.loginUrl}" class="text-brand-ochre hover:text-brand-ochre-hover font-bold transition">
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
