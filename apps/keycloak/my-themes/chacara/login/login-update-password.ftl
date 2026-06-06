<#import "template.ftl" as layout>
<@layout.registrationLayout>
        <form id="kc-passwd-update-form" class="${properties.kcFormClass!} space-y-4" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="${properties.kcFormGroupClass!} space-y-2">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label
                        for="password-new"
                        data-slot="label"
                        class="${properties.kcLabelClass!} flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                    >
                        ${msg("passwordNew")}
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
                            id="password-new"
                            name="password-new"
                            data-slot="input"
                            class="${properties.kcInputClass!} px-10 block file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background/50 pl-10 pr-10"
                            autofocus autocomplete="new-password"
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

                    <#if messagesPerField.existsError('password')>
                        <span id="input-error-password" class="${properties.kcInputErrorMessageClass!} text-xs text-destructive" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}  space-y-2">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label
                        for="password-confirm"
                        data-slot="label"
                        class="${properties.kcLabelClass!} flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                    >
                        ${msg("passwordConfirm")}
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
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input
                        name="login"
                        class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*=&#x27;size-&#x27;])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-9 px-4 py-2 has-[&gt;svg]:px-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        type="submit" value="Alterar Senha" />
                </div>
            </div>
        </form>

        <#include "back-to-login.ftl">
<script>
    (function () {
        const pass = document.getElementById('password-new');
        const pass2 = document.getElementById('password-confirm');

        // Toggle senha
        const toggleBtn = document.getElementById('toggle-password');
        const eyeOff = document.getElementById('eye-off');
        const eye = document.getElementById('eye');
        toggleBtn.addEventListener('click', () => {
            const isPwd = pass.type === 'password';
            pass.type = isPwd ? 'text' : 'password';
            eye.classList.toggle('hidden', isPwd);
            eyeOff.classList.toggle('hidden', !isPwd);
        });

        // Toggle confirmação
        const toggleConfirmBtn = document.getElementById('confirm-toggle-password');
        const eyeOff2 = document.getElementById('confirm-eye-off');
        const eye2 = document.getElementById('confirm-eye');
        toggleConfirmBtn.addEventListener('click', () => {
            const isPwd = pass2.type === 'password';
            pass2.type = isPwd ? 'text' : 'password';
            eye2.classList.toggle('hidden', isPwd);
            eyeOff2.classList.toggle('hidden', !isPwd);
        });
    })();
</script>
</@layout.registrationLayout>
