/* Light/dark theme toggle. Persists choice in localStorage,
   defaults to the visitor's OS preference on first visit. */
(function () {
  var root = document.documentElement;
  var KEY = "site-theme";

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "* dark" : "* light";
  }

  var stored = localStorage.getItem(KEY);
  var initial = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  apply(initial);

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.textContent = initial === "light" ? "* dark" : "* light";
    btn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = current === "light" ? "dark" : "light";
      apply(next);
      localStorage.setItem(KEY, next);
    });
  });
})();
