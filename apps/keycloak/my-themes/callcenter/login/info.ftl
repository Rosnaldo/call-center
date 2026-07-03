<#import "template.ftl" as layout>

<@layout.registrationLayout title=(messageHeader!msg("infoTitle", "Informação"))>

  <div class="flex flex-col gap-6 text-center items-center">
    <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100/50">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <path d="m9 11 3 3L22 4"></path>
      </svg>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-[9px] font-mono font-bold tracking-widest text-emerald-500 uppercase">STATUS_OK</span>
      <#if messageHeader??>
        <h2 class="text-xl font-bold tracking-tight text-brand-dark">${messageHeader}</h2>
      </#if>
      <#if requiredActions??>
        <p class="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
          <#list requiredActions><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></#list>
        </p>
      </#if>
      <p class="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-sm">
        ${kcSanitize(message.summary)?no_esc}
      </p>
    </div>

    <#if !skipLink??>
      <div class="flex flex-col gap-3 border-t border-brand-border w-full max-w-sm pt-4">
        <#if pageRedirectUri?has_content>
          <a href="${pageRedirectUri}" class="text-xs text-brand-muted hover:text-brand-ochre flex items-center justify-center gap-2 transition">
            ${msg("backToApplication")}
          </a>
        <#elseif actionUri?has_content>
          <a href="${actionUri}" class="text-xs text-brand-muted hover:text-brand-ochre flex items-center justify-center gap-2 transition">
            ${msg("proceedWithAction")}
          </a>
        <#elseif (client.baseUrl)?has_content>
          <a href="${client.baseUrl}" class="text-xs text-brand-muted hover:text-brand-ochre flex items-center justify-center gap-2 transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m12 19-7-7 7-7"></path>
              <path d="M19 12H5"></path>
            </svg>
            <span>Voltar para tela de Login</span>
          </a>
        </#if>
      </div>
    </#if>
  </div>

</@layout.registrationLayout>
