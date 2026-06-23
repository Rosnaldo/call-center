<#import "template.ftl" as layout>
<@layout.registrationLayout>

  <!-- Card Header -->
  <div class="flex items-center justify-between pb-3 border-b border-brand-border">
    <h3 class="text-sm font-bold tracking-tight text-brand-dark">
      ${msg("passwordNew")}
    </h3>
  </div>

  <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" class="flex flex-col gap-4" onsubmit="login.disabled = true; return true;">

    <!-- New Password -->
    <div class="flex flex-col gap-1.5 text-left">
      <label for="password-new" class="text-[10px] font-bold font-mono tracking-wider text-brand-muted uppercase">
        ${msg("passwordNew")}
      </label>
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <input
          type="password"
          id="password-new"
          name="password-new"
          autofocus
          autocomplete="new-password"
          aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
          placeholder="Digite sua nova senha"
          class="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
        <button type="button" id="toggle-password"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
          title="Ver/Ocultar senha">
          <span id="eye" class="block">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </span>
          <span id="eye-off" class="hidden">
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
        ${msg("passwordConfirm")}
      </label>
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <input
          type="password"
          id="password-confirm"
          name="password-confirm"
          autocomplete="new-password"
          aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
          placeholder="Confirme sua nova senha"
          class="w-full pl-9 pr-9 py-2.5 bg-brand-canvas border border-brand-border rounded-xl text-xs sm:text-sm text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-ochre focus:border-brand-ochre transition-all"
        />
        <button type="button" id="confirm-toggle-password"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-dark cursor-pointer focus:outline-none"
          title="Ver/Ocultar senha">
          <span id="confirm-eye" class="block">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </span>
          <span id="confirm-eye-off" class="hidden">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path>
              <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
              <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path>
              <path d="m2 2 20 20"></path>
            </svg>
          </span>
        </button>
      </div>
      <#if messagesPerField.existsError('password-confirm')>
        <p class="text-xs text-rose-500">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
      </#if>
    </div>

    <!-- Submit -->
    <button type="submit" name="login"
      class="w-full py-3.5 bg-brand-ochre hover:bg-brand-ochre-hover text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
    >
      Alterar Senha
    </button>

  </form>

  <#include "back-to-login.ftl">

  <script>
    (function () {
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
      makeToggle('toggle-password', 'password-new', 'eye', 'eye-off');
      makeToggle('confirm-toggle-password', 'password-confirm', 'confirm-eye', 'confirm-eye-off');
    })();
  </script>

</@layout.registrationLayout>
