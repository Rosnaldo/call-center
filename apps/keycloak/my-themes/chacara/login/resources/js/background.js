(function () {
  function seededRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  function generateSeed() {
    // stable per page load (similar spirit to useId)
    const str = location.pathname + navigator.userAgent;
    let acc = 0;
    for (let i = 0; i < str.length; i++) {
      acc += str.charCodeAt(i);
    }
    return acc;
  }

  const container = document.getElementById("sakura-container");
  if (!container) return;

  const random = seededRandom(generateSeed());

  for (let i = 0; i < 20; i++) {
    const left = random() * 100;
    const delay = random() * 10;
    const size = random() * 15 + 10;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.classList.add("absolute", "animate-sakura", "opacity-30");

    svg.style.left = left + "%";
    svg.style.animationDelay = delay + "s";
    svg.style.width = size + "px";
    svg.style.height = size + "px";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M10 0 C12 4 16 6 20 10 C16 12 12 16 10 20 C8 16 4 12 0 10 C4 8 8 4 10 0"
    );
    path.setAttribute("fill", "hsl(350, 80%, 75%)");

    svg.appendChild(path);
    container.appendChild(svg);
  }
})();
