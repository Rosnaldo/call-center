<div class="fixed inset-0 pointer-events-none overflow-hidden z-0">

  <!-- Gradient overlay -->
  <div class="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background"></div>

  <!-- Decorative SVG -->
  <svg
    class="absolute top-20 right-10 w-64 h-64 opacity-10 animate-float"
    viewBox="0 0 200 200"
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(350, 80%, 70%)" />
        <stop offset="100%" stop-color="hsl(180, 60%, 60%)" />
      </linearGradient>
    </defs>

    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#grad1)" stroke-width="2" />
    <circle cx="100" cy="100" r="60" fill="none" stroke="url(#grad1)" stroke-width="1" />
    <path
      d="M100 20 L100 180 M20 100 L180 100"
      stroke="url(#grad1)"
      stroke-width="1"
      opacity="0.5"
    />
  </svg>

  <!-- Sakura container (JS will inject petals) -->
  <div id="sakura-container"></div>

  <!-- Pattern -->
  <div
    class="absolute inset-0 opacity-[0.02]"
    style="background-image:url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23ffffff' d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/svg%3E&quot;)"
  ></div>

</div>
