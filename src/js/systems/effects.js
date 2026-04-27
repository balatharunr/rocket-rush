/* Rocket Rush — Effects
 * Particles, floating texts, explosions, screen shake, flashes.
 * Particles use a pool to avoid GC churn on low-end devices.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { rand, choose, TWO_PI, clamp } = RR.utils;

  const particlePool = RR.utils.makePool(() => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: "#fff",
    drag: 0.985, gravity: 0,
  }));
  const floatingTexts = [];

  function spawnParticle(x, y, vx, vy, life, size, color, drag = 0.985, gravity = 0) {
    const cap = RR.config.TUNE.perf.maxParticles;
    if (particlePool.live.length >= cap) {
      // Recycle oldest.
      particlePool.release(0);
    }
    particlePool.acquire((p) => {
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color;
      p.drag = drag; p.gravity = gravity;
    });
  }

  function boom(x, y, count, color) {
    const P = RR.config.PALETTE;
    const max = RR.config.lowDetail ? Math.min(count, 14) : count;
    for (let i = 0; i < max; i++) {
      const a = rand(0, TWO_PI);
      const sp = rand(60, 320);
      spawnParticle(
        x, y,
        Math.cos(a) * sp, Math.sin(a) * sp,
        rand(0.32, 0.85),
        rand(1.4, 4.6),
        Math.random() < 0.22 ? P.white : color
      );
    }
  }

  function spark(x, y, color) {
    spawnParticle(x, y, rand(-180, 180), rand(-180, 180), rand(0.15, 0.32), rand(1, 2.4), color);
  }

  function showFloating(text, x, y, color) {
    const cap = RR.config.TUNE.perf.maxFloatTexts;
    if (floatingTexts.length >= cap) floatingTexts.shift();
    floatingTexts.push({ text, x, y, color, life: 0.95, vy: -38 });
  }

  function update(dt) {
    // Particles
    const live = particlePool.live;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag; p.vy *= drag;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) particlePool.release(i);
    }
    // Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const f = floatingTexts[i];
      f.y += f.vy * dt; f.life -= dt;
      if (f.life <= 0) floatingTexts.splice(i, 1);
    }
    // Effects timers
    const fx = RR.fx;
    fx.shake = Math.max(0, fx.shake - dt * 38);
    fx.flash = Math.max(0, fx.flash - dt);
    fx.slowMo = Math.max(0, fx.slowMo - dt);
    fx.levelToastCooldown = Math.max(0, fx.levelToastCooldown - dt);
  }

  function clear() {
    particlePool.clear();
    floatingTexts.length = 0;
  }

  function shake(amount) { RR.fx.shake = Math.max(RR.fx.shake, amount); }
  function flash(amount, color) {
    RR.fx.flash = Math.max(RR.fx.flash, amount);
    if (color) RR.fx.flashColor = color;
  }

  RR.effects = {
    particlePool, floatingTexts,
    spawnParticle, boom, spark, showFloating,
    update, clear, shake, flash,
  };
})(typeof window !== "undefined" ? window : this);
