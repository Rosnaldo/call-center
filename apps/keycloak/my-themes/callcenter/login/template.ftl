<#macro registrationLayout title="Call" displayMessage=true displayInfo=false>
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />

  <#if scripts??>
    <#list scripts as script>
      <script src="${script}" defer></script>
    </#list>
  </#if>
</head>

<body class="${properties.kcBodyClass!}">

  <main class="min-h-screen w-full overflow-y-auto kc-scrollbar flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">

    <div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-ochre/5 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-lg flex flex-col gap-6 relative z-10">

      <!-- Brand Logo -->
      <div class="flex flex-col items-center text-center gap-2 select-none">
        <div>
          <h1 class="font-extrabold text-brand-dark text-2xl tracking-tight font-display">
            Call<span class="text-brand-ochre">Center</span>
          </h1>
          <p class="text-[10px] font-mono tracking-widest text-brand-muted uppercase mt-1">
            Automated Operations Portal
          </p>
        </div>
      </div>

      <!-- Card -->
      <div class="bg-white border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(27,25,22,0.03)] flex flex-col gap-6">
        <#nested>
      </div>

    </div>
  </main>

</body>
</html>
</#macro>
