<#import "template.ftl" as layout>

<@layout.registrationLayout title=msg("errorTitle", "Ocorreu um erro")>

  <div class="flex flex-col gap-6 text-center items-center">
    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100/50">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 16h.01"></path>
        <path d="M12 8v4"></path>
        <path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"></path>
      </svg>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-[9px] font-mono font-bold tracking-widest text-red-500 uppercase">STATUS_ERROR</span>
      <h2 class="text-xl font-bold tracking-tight text-brand-dark">
        ${msg("errorTitle", "Ocorreu um erro")}
      </h2>
      <p class="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
        ${kcSanitize(message.summary)?no_esc}
      </p>
    </div>

    <div class="flex flex-col gap-3 border-t border-brand-border w-full max-w-sm pt-4">
      <a
        href="${url.loginRestartFlowUrl}"
        class="text-xs text-brand-muted hover:text-brand-ochre flex items-center justify-center gap-2 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 19-7-7 7-7"></path>
          <path d="M19 12H5"></path>
        </svg>
        <span>Voltar para tela de Login</span>
      </a>
    </div>
  </div>

</@layout.registrationLayout>
