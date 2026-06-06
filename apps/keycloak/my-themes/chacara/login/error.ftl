<#import "template.ftl" as layout>

<@layout.registrationLayout title=msg("errorTitle", "Ocorreu um erro")>
        <!-- Ícone -->
        <div class="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-destructive" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        <h2 class="text-2xl font-bold mb-2 text-center">
            ${msg("errorTitle", "Ocorreu um erro")}
        </h2>

        <!-- Mensagens do servidor -->
        <div id="kc-error-message">
            <p class="instruction text-center">${kcSanitize(message.summary)?no_esc}</p>
        </div>

        <div class="space-y-3">
            <a
                id="backToApplication"
                href="${client.baseUrl}"
                class="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
            >
            <!-- Ícone ArrowLeft -->
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Voltar para o login
            </a>
        </div>
</@layout.registrationLayout>
