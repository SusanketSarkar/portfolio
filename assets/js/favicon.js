/* Slowly rotating asterisk favicon. Falls back to the static
   assets/favicon.svg when JS is off or motion is reduced. */
(function () {
  var link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function svg(angle) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect x="4" y="4" width="92" height="92" rx="20" fill="#111412"/>' +
      '<g transform="rotate(' + angle + ' 50 50)" stroke="#a3d9c0" stroke-width="9" stroke-linecap="round">' +
        '<line x1="50" y1="20" x2="50" y2="80"/>' +
        '<line x1="24" y1="35" x2="76" y2="65"/>' +
        '<line x1="76" y1="35" x2="24" y2="65"/>' +
      '</g>' +
      '<circle cx="50" cy="50" r="5" fill="#EEE9DD"/>' +
    '</svg>';
  }

  var cache = {};

  function apply(angle) {
    if (!cache[angle]) cache[angle] = "data:image/svg+xml," + encodeURIComponent(svg(angle));
    link.href = cache[angle];
  }

  apply(0);
  if (reduceMotion) return;

  var angle = 0;
  var timer = null;

  function tick() {
    angle = (angle + 12) % 360;
    apply(angle);
    timer = setTimeout(tick, 150);
  }

  function start() {
    if (timer !== null) return;
    timer = setTimeout(tick, 150);
  }

  function stop() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  start();
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
})();
