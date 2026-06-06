import React from 'react';
import fs from 'fs'
import prettier from "prettier"
import ReactDOMServer from 'react-dom/server'
import Page from './src/page/login-verify-email'

const rawHtml = ReactDOMServer.renderToStaticMarkup(<Page />)

const loginHtml = await prettier.format(rawHtml, {
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

fs.writeFileSync('dist/login.ftl', buildHtml(loginHtml, 'Login'))
