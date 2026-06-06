<#import "template.ftl" as layout>

<@layout.registrationLayout title="Entrar • ChácaraMeets">

    <form
      id="kc-form-login"
      action="${url.loginAction}"
      method="post"
      class="space-y-6"
    >

      <!-- EMAIL -->
      <div class="space-y-2">
        <label for="username" class="block text-sm font-medium">
          E-mail
        </label>

        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </span>

          <input
            id="username"
            name="username"
            type="email"
            value="${(login.username!'')}"
            placeholder="seu@email.com"
            required
            autofocus
            class="w-full bg-background/50 px-10 py-2 rounded-md border"
          />
        </div>

        <#if messagesPerField.existsError("username")>
          <p class="text-sm text-destructive">
            ${messagesPerField.get("username")}
          </p>
        </#if>
      </div>

      <!-- PASSWORD -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="password" class="block text-sm font-medium">
            Senha
          </label>

          <#if realm.resetPasswordAllowed>
            <a
              href="${url.loginResetCredentialsUrl}"
              class="text-sm text-primary hover:text-primary/80"
            >
              esqueceu a senha?
            </a>
          </#if>
        </div>

        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 11c1.105 0 2 .895 2 2v3H10v-3c0-1.105.895-2 2-2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </span>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            class="w-full bg-background/50 px-10 py-2 rounded-md border"
          />
        </div>

        <#if messagesPerField.existsError("password")>
          <p class="text-sm text-destructive">
            ${messagesPerField.get("password")}
          </p>
        </#if>
      </div>

      <!-- REMEMBER ME -->
      <#if realm.rememberMe>
        <div class="flex items-center space-x-2">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            <#if login.rememberMe?? && login.rememberMe>checked</#if>
          />
          <label for="rememberMe" class="text-sm">
            Lembrar-me
          </label>
        </div>
      </#if>

      <!-- SUBMIT -->
      <button
        type="submit"
        class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-md"
      >
        Entrar
      </button>

    </form>

    <!-- REGISTER -->
    <#if realm.registrationAllowed>
      <p class="text-center text-sm text-muted-foreground mt-6">
        Não tem uma conta?
        <a
          href="${url.registrationUrl}"
          class="text-primary hover:text-primary/80 font-semibold"
        >
          Cadastre-se
        </a>
      </p>
    </#if>

</@layout.registrationLayout>
