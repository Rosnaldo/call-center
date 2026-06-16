<#macro registrationLayout title="ChácaraMeets" displayMessage=true displayInfo=false>
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>
      ${title}
  </title>

  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link rel="stylesheet" href="${url.resourcesPath}/css/index.css" />
  <script src="${url.resourcesPath}/js/background.js" defer></script>

  <#if scripts??>
    <#list scripts as script>
      <script src="${script}" defer></script>
    </#list>
  </#if>
</head>

<body class="${properties.kcBodyClass!}">

  <main class="h-screen max-h-screen w-full overflow-y-auto kc-scrollbar flex items-center justify-center relative">

    <div class="justify-start flex flex-col h-screen w-full mx-4 relative z-10 py-4">

        <!-- Card -->
        <div class="w-full block max-w-[30rem] mx-auto bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            <#nested>
        </div>
    </div>
  </main>

</body>
</html>
</#macro>
