// pages should not have hooks or Link components.
// main.tsx should not have providers.

npx tsx render.tsx

npx tailwindcss -c ./tailwind.config.js -i ./src/index.css -o ./dist/styles.css
