<#import "template.ftl" as layout>

<@layout.registrationLayout title="Cadastrar • ChácaraMeets">

      <!-- Card -->
        <form id="kc-register-form" action="${url.registrationAction}" method="post" class="space-y-4" novalidate>
          <div class="grid grid-cols-2 gap-4">
            <!-- Nome -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none" for="firstName">Nome</label>
              <div class="relative">
                <!-- Ícone User -->
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value="${(register.formData.firstName!'')}"
                  placeholder="João"
                  class="bg-background/50 px-10 block w-full rounded-md border border-input py-2 text-sm"
                  autocomplete="given-name"
                />
              </div>
              <#if messagesPerField.existsError('firstName')>
                <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('firstName'))}</p>
              </#if>
            </div>

            <!-- Sobrenome -->
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none" for="lastName">Sobrenome</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value="${(register.formData.lastName!'')}"
                placeholder="Silva"
                class="bg-background/50 block w-full rounded-md border border-input py-2 px-3 text-sm"
                autocomplete="family-name"
              />
              <#if messagesPerField.existsError('lastName')>
                <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('lastName'))}</p>
              </#if>
            </div>
          </div>

          <#-- Username: só exibe se o realm NÃO usa email como username -->
          <#if !realm.registrationEmailAsUsername>
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none" for="username">Usuário</label>
              <input
                id="username"
                name="username"
                type="text"
                value="${(register.formData.username!'')}"
                placeholder="seu_usuario"
                class="bg-background/50 block w-full rounded-md border border-input py-2 px-3 text-sm"
                autocomplete="username"
              />
              <#if messagesPerField.existsError('username')>
                <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('username'))}</p>
              </#if>
            </div>
          <#else>
            <input type="hidden" id="username" name="username" value="${(register.formData.email!'')}" />
          </#if>

          <!-- E-mail -->
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none text-primary-foreground" for="email">E-mail</label>
            <div class="relative">
              <!-- Ícone Mail -->
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6"/>
              </svg>
              <input
                id="email"
                type="email"
                name="email"
                value="${(register.formData.email!'')}"
                placeholder="seu@email.com"
                class="bg-background/50 px-10 block w-full rounded-md border border-input py-2 text-sm"
                autocomplete="email"
                required
              />
            </div>
            <#if messagesPerField.existsError('email')>
              <p class="text-xs text-destructive">${kcSanitize(messagesPerField.get('email'))}</p>
            </#if>
          </div>

          <!-- Senha -->
          <div class="space-y-6">
          <#if realm.password>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                    <label
                        for="password"
                        data-slot="label"
                        class="${properties.kcLabelClass!} text-sm font-medium leading-none text-primary-foreground"
                    >
                        Senha
                    </label>
              </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <div class="${properties.kcInputGroup!} relative" dir="ltr">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-lock absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                            aria-hidden="true"
                        >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            data-slot="input"
                            class="${properties.kcInputClass!} px-10 block file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background/50 pl-10 pr-10"
                            autofocus autocomplete="senha"
                            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                            placeholder="Digite sua nova senha"
                        />
                        <button
                            id="toggle-password"
                            class="${properties.kcFormPasswordVisibilityButtonClass!} absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" type="button" aria-label="${msg('showPassword')}"
                            aria-controls="password-new"  data-password-toggle
                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}"
                        >
                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true">
                                <span id="eye-off" class="hidden">
                                    <!-- EyeOff -->
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.62 20.62 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.7 20.7 0 0 1-3.22 4.42M1 1l22 22"/>
                                    </svg>
                                </span>
                                <span id="eye">
                                    <!-- Eye -->
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </span>
                            </i>
                        </button>
                    </div>
                    <div class="mt-2">
                      <p class="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
                    </div>
                    <#if messagesPerField.existsError('password')>
                        <span id="input-error-password" class="${properties.kcInputErrorMessageClass!} text-xs text-destructive" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <!-- Confirmar senha -->
            <div class="${properties.kcFormGroupClass!} space-y-2">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label
                        for="password-confirm"
                        data-slot="label"
                        class="${properties.kcLabelClass!} flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                    >
                        ${msg("passwordConfirm")}
                    </label>
                </div>
              <div class="${properties.kcInputGroup!} relative" dir="ltr">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-lock absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                            aria-hidden="true"
                        >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <input
                            type="password"
                            id="password-confirm"
                            name="password-confirm"
                            data-slot="input"
                            class="${properties.kcInputClass!} px-10 block file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background/50 pl-10 pr-10"
                            autofocus autocomplete="new-password"
                            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                            placeholder="Confirme sua nova senha"
                        />

                        <button
                            id="confirm-toggle-password"
                            class="${properties.kcFormPasswordVisibilityButtonClass!} absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" type="button" aria-label="${msg('showPassword')}"
                            type="button" aria-label="${msg('showPassword')}"
                            aria-controls="password-confirm"  data-password-toggle
                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}"
                        >
                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true">
                                <span id="confirm-eye-off" class="hidden">
                                    <!-- EyeOff -->
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.62 20.62 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.7 20.7 0 0 1-3.22 4.42M1 1l22 22"/>
                                    </svg>
                                </span>
                                <span id="confirm-eye">
                                    <!-- Eye -->
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </span>
                            </i>
                        </button>
                    </div>
                <#if messagesPerField.existsError('password-confirm')>
                    <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!} text-xs text-destructive" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                    </span>
                </#if>
            </div>
          </#if>
          </div>

          <#-- Mensagens globais (ex.: usuário/email já existe) -->
          <#if messages?has_content>
            <#list messages as m>
              <p class="text-xs <#if m.type == 'error'>text-destructive<#else>text-muted-foreground</#if>">${kcSanitize(m.summary)}</p>
            </#list>
          </#if>

          <!-- Botão Registrar -->
          <button
            type="submit"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md my-4 py-2 text-sm"
          >
            ${msg("doRegister", "Registrar")}
          </button>
        </form>

        <!-- Voltar para o login -->
        <a
          href="${url.loginUrl}"
          class="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          <!-- Ícone ArrowLeft -->
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Voltar para o login
        </a>

</@layout.registrationLayout>

  <script>
    (function () {
      const email = document.getElementById('email');
      const username = document.getElementById('username');
      const pass = document.getElementById('password');
      const pass2 = document.getElementById('password-confirm');
      const mismatch = document.getElementById('password-mismatch');

      // Se o realm usa email como username, sincroniza o hidden username
      if (email && username) {
        email.addEventListener('input', () => {
          if (username && username.type === 'hidden') {
            username.value = email.value;
          }
        });
      }

      // Toggle senha
      const toggleBtn = document.getElementById('toggle-password');
      const eyeOff = document.getElementById('eye-off');
      const eye = document.getElementById('eye');
      if (toggleBtn && pass && eye && eyeOff) {
        toggleBtn.addEventListener('click', () => {
          const isPwd = pass.type === 'password';
          pass.type = isPwd ? 'text' : 'password';
          eye.classList.toggle('hidden', !isPwd);
          eyeOff.classList.toggle('hidden', isPwd);
        });
      }

      // Toggle confirmação
      const toggleConfirmBtn = document.getElementById('confirm-toggle-password');
      const eyeOff2 = document.getElementById('confirm-eye-off');
      const eye2 = document.getElementById('confirm-eye');
      if (toggleConfirmBtn && pass2 && eye2 && eyeOff2) {
        toggleConfirmBtn.addEventListener('click', () => {
          const isPwd = pass2.type === 'password';
          pass2.type = isPwd ? 'text' : 'password';
          eye2.classList.toggle('hidden', !isPwd);
          eyeOff2.classList.toggle('hidden', isPwd);
        });
      }

      // Validação simples de confirmação de senha (cliente)
      const form = document.getElementById('kc-register-form');
      if (form && pass && pass2 && mismatch) {
        const check = () => {
          if (pass2.value && pass.value !== pass2.value) {
            mismatch.classList.remove('hidden');
          } else {
            mismatch.classList.add('hidden');
          }
        };
        pass.addEventListener('input', check);
        pass2.addEventListener('input', check);
        form.addEventListener('submit', (e) => {
          if (pass.value !== pass2.value) {
            e.preventDefault();
            mismatch.classList.remove('hidden');
          }
        });
      }
    })();
  </script>
