<#import "template.ftl" as layout>
<@layout.registrationLayout >
        <div class="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <svg class="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4z" fill="none"/>
            <path d="M22 6L12 13 2 6"/>
            </svg>
        </div>
        <div class="flex flex-col items-center justify-center my-6">
            <h2 class="text-2xl font-semibold mb-2">Esqueceu sua senha?</h2>
            <p class="text-muted-foreground text-sm text-center">
            Digite seu e-mail e enviaremos um link para você redefinir sua senha.
            </p>
        </div>

        <form id="kc-reset-password-form" class="${properties.kcFormClass!} space-y-6" action="${url.loginAction}" method="post">
            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label
                        for="username" class="${properties.kcLabelClass!}"
                        data-slot="label"
                        class="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                        >E-mail</label
                    >
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input
                        type="text"
                        data-slot="input"
                        class="${properties.kcInputClass!} file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background/50"
                        autofocus
                        id="username"
                        name="username"
                        value="${(auth.attemptedUsername!'')}"
                        placeholder="seu@email.com"
                        aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
                        dir="ltr"
                    />
                    <#if messagesPerField.existsError('username')>
                        <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('username'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>
            <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">

                    <input
                        class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*=&#x27;size-&#x27;])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-9 px-4 py-2 has-[&gt;svg]:px-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        type="submit"
                        value="Enviar link de recuperação"
                    />
                </div>
            </div>
        </form>

        <#include "back-to-login.ftl">

</@layout.registrationLayout>
