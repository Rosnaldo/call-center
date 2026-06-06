// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html,ftl}'],
  plugins: [],
  safelist: [
    { pattern: /space-y-(2|4|6)/ },
    { pattern: /max-w-\[\d+rem\]/ },
    { pattern: /(p|px|py|m|mx|my)-\d+/ },
    { pattern: /^text-.+/ },
    'scrollbar-thin',
  ],
};
