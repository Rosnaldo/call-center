// @ts-expect-error polyfill for SSR — pages read window.location.search
globalThis.window = { location: { search: '' } } as any

import fs from 'fs'
import prettier from "prettier"
import ReactDOMServer from 'react-dom/server'
import { LoginPage } from './src/pages/LoginPage'
import { RegisterPage } from './src/pages/RegisterPage'
import { ForgotPasswordPage } from './src/pages/ForgotPasswordPage'
import { EmailExpiredPage } from './src/pages/EmailExpiredPage'
import { EmailVerificationPage } from './src/pages/EmailVerificationPage'
import { LoginErrorPage } from './src/pages/LoginErrorPage'

const formatHtml = (raw: string) =>
    prettier.format(raw, {
        parser: "html",
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        htmlWhitespaceSensitivity: "css",
    })

const buildHtml = (html: string, title: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link
                href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
                rel="stylesheet"
            />
            <link rel="stylesheet" href="\${url.resourcesPath}/css/index.css" />
            <script src="\${url.resourcesPath}/js/register.js" defer></script>

        </head>
        <body>
            ${html}
        </body>
    </html>
`

const pages = [
    { Component: LoginPage, file: 'login.ftl', title: 'Login' },
    { Component: RegisterPage, file: 'register.ftl', title: 'Cadastro' },
    { Component: ForgotPasswordPage, file: 'forgot-password.ftl', title: 'Esqueci a Senha' },
    { Component: EmailExpiredPage, file: 'email-expired.ftl', title: 'Link Expirado' },
    { Component: EmailVerificationPage, file: 'email-verification.ftl', title: 'Verificação de Email' },
    { Component: LoginErrorPage, file: 'login-error.ftl', title: 'Erro de Login' },
]

for (const { Component, file, title } of pages) {
    const rawHtml = ReactDOMServer.renderToStaticMarkup(<Component />)
    const html = await formatHtml(rawHtml)
    fs.writeFileSync(`dist/${file}`, buildHtml(html, title))
    console.log(`✓ dist/${file}`)
}
