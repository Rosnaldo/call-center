<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true>
        <div class="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <svg class="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4z" fill="none"/>
            <path d="M22 6L12 13 2 6"/>
            </svg>
        </div>
        <div class="mt-6">
            <h2 class="text-2xl font-semibold text-center">Verifique seu e-mail</h2>
        </div>
        <div class="mt-6">
            <p class="text-muted-foreground text-center instruction">
                <#if verifyEmail??>
                    ${msg("emailVerifyInstruction1",verifyEmail)}
                <#else>
                    ${msg("emailVerifyInstruction4",user.email)}
                </#if>
            </p>
        </div>
            <form id="kc-verify-email-form" class="${properties.kcFormClass!} mt-6" action="${url.loginAction}" method="post">
                <div class="${properties.kcFormGroupClass!}">
                    <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                        <input type="hidden" name="resend" value="true" />
                        <button
                            type="submit"
                            data-slot="button"
                            data-variant="outline"
                            data-size="default"
                            class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonLargeClass!} cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*=&#x27;size-&#x27;])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[&gt;svg]:px-3 w-full"
                        >
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
                                class="lucide lucide-refresh-cw w-4 h-4 mr-2"
                                aria-hidden="true"
                                >
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M8 16H3v5"></path>
                            </svg>
                            Reenviar e-mail de verificação
                        </button>
                    </div>
                </div>
            </form>

        <#include "back-to-login.ftl">


</@layout.registrationLayout>