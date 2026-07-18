/* Minimal ambient starfield — soft twinkle, occasional shooting star.
   Respects prefers-reduced-motion. Density scales with viewport area. */
(function () {
  var canvas = document.getElementById("starfield");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stars = [];
  var shootingStars = [];
  var w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function seedStars() {
    var count = Math.round((w * h) / 9000);
    count = Math.max(60, Math.min(count, 220));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.3,
        base: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2
      });
    }
  }

  function maybeSpawnShootingStar() {
    if (reduceMotion) return;
    if (Math.random() < 0.0035 && shootingStars.length < 1) {
      var startX = Math.random() * w * 0.6 + w * 0.1;
      var startY = Math.random() * h * 0.25;
      var len = Math.random() * 120 + 90;
      var angle = (Math.PI / 4) + (Math.random() * 0.3 - 0.15);
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * 9,
        vy: Math.sin(angle) * 9,
        len: len,
        life: 0,
        maxLife: 40
      });
    }
  }

  var t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = reduceMotion ? s.base : s.base + Math.sin(t * 0.02 * s.speed + s.phase) * 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(233,231,224," + Math.max(0, tw).toFixed(3) + ")";
      ctx.fill();
    }

    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var sh = shootingStars[j];
      var progress = sh.life / sh.maxLife;
      var alpha = Math.sin(progress * Math.PI);
      var tailX = sh.x - sh.vx * (sh.len / 12);
      var tailY = sh.y - sh.vy * (sh.len / 12);
      var grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
      grad.addColorStop(0, "rgba(233,231,224," + (alpha * 0.9).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(233,231,224,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life++;
      if (sh.life > sh.maxLife || sh.x > w + 50 || sh.y > h + 50) {
        shootingStars.splice(j, 1);
      }
    }

    t++;
    maybeSpawnShootingStar();
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();
