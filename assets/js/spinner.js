/* Small rotating ASCII glyph — a compass/star that turns slowly.
   Purely decorative signature element. Freezes on one frame if the
   user prefers reduced motion. */
(function () {
  var el = document.getElementById("glyph");
  if (!el) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var frames = [
    "   *\n  .|.\n .\\|/.\n-->*<--\n ./|\\.\n  '|'\n ~~|~~",
    "   |\n  \\|/\n .-*-.\n<--*-->\n '-*-'\n  /|\\\n ~~|~~",
    "   \\\n  '|'\n ./|\\.\n<--*-->\n .\\|/.\n  \\|/\n ~~|~~",
    "   *\n  \\|/\n .-*-.\n-->*<--\n '-*-'\n  |\n ~~|~~"
  ];

  var i = 0;
  el.textContent = frames[0];
  if (reduceMotion) return;

  setInterval(function () {
    i = (i + 1) % frames.length;
    el.textContent = frames[i];
  }, 900);
})();
