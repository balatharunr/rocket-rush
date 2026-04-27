/* Rocket Rush — Entities
 * Rocket + Asteroids + Pickups + Bullets. Movement, collision, lifecycle.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { clamp, rand, choose, circleHit, TWO_PI } = RR.utils;

  // Background stars (parallax, three layers).
  const stars = [];

  // Active entity arrays (kept simple, splice on remove — counts stay small).
  const asteroids = [];
  const pickups = [];
  const bullets = [];

  const rocket = {
    x: 0, y: 0, vx: 0, vy: 0,
    width: 56, height: 30,
    shield: 0,
    heat: 0,            // 0..1, fills up while turbo is active
    overheated: false,  // true once heat >= 1, locks turbo until cooled
    turbo: false,       // true only when player is actually turbo-ing this frame
    cooldown: 0,
    angle: 0,
  };

  function initStars() {
    stars.length = 0;
    const { W, H } = RR.config;
    const N = RR.config.lowDetail ? 64 : RR.config.TUNE.perf.starCount;
    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 2.6 + 0.3,    // depth: 0.3 (far) .. 2.9 (near)
        tw: Math.random() * TWO_PI,
        size: Math.random() < 0.10 ? 2 : 1,
      });
    }
  }

  function resetRocket() {
    const { H, TUNE } = RR.config;
    rocket.x = TUNE.rocket.startX;
    rocket.y = H / 2;
    rocket.vx = 0; rocket.vy = 0;
    rocket.shield = 0;
    rocket.heat = 0;
    rocket.overheated = false;
    rocket.turbo = false;
    rocket.cooldown = 0;
    rocket.angle = 0;
  }

  function clearAll() {
    asteroids.length = 0;
    pickups.length = 0;
    bullets.length = 0;
  }

  // Approximate hull as 3 circles for fair, forgiving collision.
  // Rotated to match visual angle, reduced radii to prevent cheap hits.
  function rocketHits(target) {
    const cos = Math.cos(rocket.angle);
    const sin = Math.sin(rocket.angle);
    return circleHit({ x: rocket.x + 16 * cos, y: rocket.y + 16 * sin, r: 8 }, target)
        || circleHit({ x: rocket.x - 4 * cos,  y: rocket.y - 4 * sin,  r: 12 }, target)
        || circleHit({ x: rocket.x - 22 * cos, y: rocket.y - 22 * sin, r: 8 }, target);
  }

  function fireBullet() {
    if (rocket.cooldown > 0) return false;
    rocket.cooldown = RR.config.TUNE.rocket.bulletCooldown;
    const speed = RR.config.TUNE.rocket.bulletSpeed;
    bullets.push({ x: rocket.x + 30, y: rocket.y - 2, vx: speed, vy: 0, r: 4, life: 1.4, dmg: 1 });
    if (RR.state.multishotTime > 0) {
      bullets.push({ x: rocket.x + 28, y: rocket.y - 12, vx: speed, vy: -90, r: 3, life: 1.0, dmg: 1 });
      bullets.push({ x: rocket.x + 28, y: rocket.y + 8,  vx: speed, vy:  90, r: 3, life: 1.0, dmg: 1 });
    }
    RR.audio.sfx.shoot();
    return true;
  }

  function detonateBomb() {
    if (RR.state.bombs <= 0) return false;
    RR.state.bombs--;
    RR.effects.flash(0.45, RR.config.PALETTE.yellow);
    RR.effects.shake(22);
    RR.audio.sfx.bomb();
    // Damage all asteroids on screen + heavy boss damage.
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      RR.effects.boom(a.x, a.y, 14, RR.config.PALETTE.orange);
      asteroids.splice(i, 1);
      RR.game.addScore(60 + Math.round(a.r * 2), "ZAP", a.x, a.y, RR.config.PALETTE.orange);
    }
    // Boss damage handled in bosses.js
    if (RR.bosses && RR.bosses.onBomb) RR.bosses.onBomb(8);
    RR.effects.boom(rocket.x, rocket.y, 22, RR.config.PALETTE.yellow);
    return true;
  }

  function damageRocket() {
    const st = RR.state;
    if (st.invincible > 0 || st.phaseTime > 0) return;
    const P = RR.config.PALETTE;
    if (rocket.shield > 0) {
      rocket.shield = Math.max(0, rocket.shield - 38);
      st.invincible = 1.0;
      RR.effects.shake(13);
      RR.effects.flash(0.18, P.cyan);
      RR.effects.boom(rocket.x + 6, rocket.y, 16, P.cyan);
      RR.effects.showFloating("SHIELD HIT", rocket.x + 16, rocket.y - 26, P.cyan);
      RR.audio.sfx.hit();
      return;
    }
    st.lives -= 1;
    st.invincible = 1.7;
    st.combo = 0;
    st.comboTimer = 0;
    RR.effects.shake(20);
    RR.effects.flash(0.30, P.red);
    RR.effects.boom(rocket.x, rocket.y, 28, P.red);
    RR.effects.showFloating("HULL BREACH", rocket.x + 12, rocket.y - 30, P.red);
    RR.audio.sfx.hullBreach();
    if (st.lives > 0 && st.lives <= 2 && RR.spawn && RR.spawn.onLifeLost) {
      RR.spawn.onLifeLost(st.lives);
    }
    if (st.lives <= 0) RR.game.end();
  }

  // Spawning logic delegated to spawn.js; this just exposes the array.

  function makeEngineParticle(turbo) {
    const P = RR.config.PALETTE;
    const back = rocket.x - 30;
    const c = turbo ? choose([P.yellow, P.orange, P.pink]) : choose([P.orange, P.red]);
    RR.effects.spawnParticle(
      back, rocket.y + rand(-7, 7),
      rand(-360, -160) - Math.max(0, rocket.vx * 0.3),
      rand(-55, 55),
      turbo ? rand(0.16, 0.36) : rand(0.10, 0.24),
      turbo ? rand(3.0, 7.0) : rand(1.6, 4.0),
      c
    );
  }

  function updateRocket(dt) {
    const st = RR.state;
    const TUNE = RR.config.TUNE.rocket;
    const W = RR.config.W, H = RR.config.H;
    const I = RR.input;

    const up    = I.action("up");
    const down  = I.action("down");
    const left  = I.action("left");
    const right = I.action("right");
    const turboHeld = I.action("turbo");

    // Heat-gated turbo: once overheated, can't re-engage until cooled below threshold.
    if (rocket.overheated && rocket.heat <= TUNE.heatLockoutBelow) rocket.overheated = false;
    const turbo = turboHeld && !rocket.overheated && rocket.heat < 1;
    rocket.turbo = turbo;

    const thrust = turbo ? TUNE.thrustTurbo : TUNE.thrust;
    const drag   = turbo ? TUNE.dragTurbo : TUNE.drag;
    const maxV   = turbo ? TUNE.maxVTurbo : TUNE.maxV;

    if (up)    rocket.vy -= thrust * dt;
    if (down)  rocket.vy += thrust * dt;
    if (left)  rocket.vx -= thrust * 0.85 * dt;
    if (right) rocket.vx += thrust * 0.85 * dt;

    if (turbo) {
      rocket.vx += TUNE.forwardBoost * dt;
      rocket.heat += TUNE.heatGainTurbo * dt;
      if (Math.random() < 0.55) makeEngineParticle(true);
      if (Math.random() < 0.22) RR.audio.sfx.turboLoop();
      if (rocket.heat >= 1) {
        rocket.heat = 1;
        rocket.overheated = true;
        RR.effects.showFloating("OVERHEAT!", rocket.x + 10, rocket.y - 28, RR.config.PALETTE.red);
        RR.audio.sfx.overheat();
      }
    } else {
      rocket.heat -= TUNE.heatCool * dt;
      if (Math.random() < 0.20) makeEngineParticle(false);
    }
    rocket.heat = clamp(rocket.heat, 0, 1);

    // Soft restoring force toward "home X" so releasing turbo feels smooth, not snappy.
    const homeX = W * TUNE.homeX;
    if (!turbo && rocket.x > homeX) {
      const overrun = rocket.x - homeX;
      rocket.vx -= overrun * TUNE.restoringForce * dt;
    }

    rocket.vx *= Math.pow(drag, dt * 60);
    rocket.vy *= Math.pow(drag, dt * 60);
    rocket.vx = clamp(rocket.vx, -maxV, maxV);
    rocket.vy = clamp(rocket.vy, -maxV, maxV);
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    // Generous bounds — no snap-back, just hard walls. Turbo can push to 0.74.
    const minX = 40;
    const maxX = W * 0.74;
    if (rocket.x < minX) { rocket.x = minX; if (rocket.vx < 0) rocket.vx = 0; }
    if (rocket.x > maxX) { rocket.x = maxX; if (rocket.vx > 0) rocket.vx = 0; }
    if (rocket.y < 32)   { rocket.y = 32;   if (rocket.vy < 0) rocket.vy = 0; }
    if (rocket.y > H-32) { rocket.y = H-32; if (rocket.vy > 0) rocket.vy = 0; }

    rocket.angle = clamp(rocket.vy / 700, -0.22, 0.22);

    // Decay timers.
    rocket.cooldown = Math.max(0, rocket.cooldown - dt);
    rocket.shield = Math.max(0, rocket.shield - dt * TUNE.shieldDecay);
    st.invincible = Math.max(0, st.invincible - dt);
    st.magnetTime = Math.max(0, st.magnetTime - dt);
    st.phaseTime  = Math.max(0, st.phaseTime  - dt);
    st.multishotTime = Math.max(0, st.multishotTime - dt);
    st.comboTimer = Math.max(0, st.comboTimer - dt);
    if (st.comboTimer <= 0) st.combo = 0;

    // Shooting (held), bomb (edge-triggered).
    if (I.action("shoot")) fireBullet();
    if (I.action("bomb")) {
      if (!rocket._bombHeld) { detonateBomb(); rocket._bombHeld = true; }
    } else {
      rocket._bombHeld = false;
    }
  }

  // World scroll modulator: turbo speeds the world up (dodge feel).
  function worldScrollMul() {
    return rocket.turbo ? RR.config.TUNE.world.turboScrollMul : 1;
  }

  function updateStars(dt, gdt) {
    const W = RR.config.W, H = RR.config.H;
    const baseScroll = (RR.config.TUNE.world.baseScroll + RR.state.level * RR.config.TUNE.world.scrollPerLevel);
    const mul = worldScrollMul();
    for (const s of stars) {
      const speed = (28 * s.z + baseScroll * 0.18) * mul;
      s.x -= speed * gdt;
      s.tw += dt * (0.8 + s.z);
      if (s.x < -10) {
        s.x = W + 10;
        s.y = Math.random() * H;
        s.z = Math.random() * 2.6 + 0.3;
      }
    }
  }

  function updateAsteroids(dt, gdt) {
    const H = RR.config.H;
    const mul = worldScrollMul();
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx * gdt * mul;
      a.y += a.vy * gdt;
      a.rot += a.spin * gdt;
      if (a.y < a.r) { a.y = a.r; a.vy *= -1; }
      if (a.y > H - a.r) { a.y = H - a.r; a.vy *= -1; }
      if (a.x < -a.r - 60) {
        asteroids.splice(i, 1);
        RR.game.addScore(15, "DODGE", rocket.x + 8, rocket.y - 18, RR.config.PALETTE.muted);
        continue;
      }
      if (rocketHits(a)) {
        asteroids.splice(i, 1);
        splitAsteroid(a);
        damageRocket();
      }
    }
  }

  function splitAsteroid(a) {
    if (!a.splitter || a.r < 22) return;
    for (let i = 0; i < 2; i++) {
      asteroids.push({
        x: a.x + rand(-6, 6), y: a.y + rand(-8, 8),
        r: a.r * rand(0.45, 0.6),
        vx: a.vx * rand(0.9, 1.15), vy: rand(-110, 110),
        spin: rand(-4, 4), rot: rand(0, TWO_PI),
        hp: 1, fast: false, splitter: false,
        seed: Math.random() * 999,
      });
    }
  }

  function updateBullets(dt) {
    const W = RR.config.W, P = RR.config.PALETTE;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x > W + 30) { bullets.splice(i, 1); continue; }
      let consumed = false;
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const a = asteroids[j];
        if (circleHit(b, a)) {
          a.hp -= b.dmg;
          RR.effects.boom(b.x, b.y, 6, P.yellow);
          consumed = true;
          if (a.hp <= 0) {
            asteroids.splice(j, 1);
            splitAsteroid(a);
            RR.effects.boom(a.x, a.y, 16, P.orange);
            RR.game.addScore(110 + Math.round(a.r * 4), "BLAST", a.x, a.y, P.orange);
            RR.state.combo++;
            RR.state.comboTimer = 2.5;
            RR.audio.sfx.blast();
          } else {
            RR.audio.sfx.hit();
          }
          break;
        }
      }
      // Bullet vs boss
      if (!consumed && RR.bosses && RR.bosses.collideBullet) {
        if (RR.bosses.collideBullet(b)) consumed = true;
      }
      if (consumed) bullets.splice(i, 1);
    }
  }

  function updatePickups(dt, gdt) {
    const magnet = RR.state.magnetTime > 0;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.x += p.vx * gdt;
      p.bob += dt * 4;
      // Magnet attraction: pull pickups toward rocket.
      if (magnet) {
        const dx = rocket.x - p.x;
        const dy = rocket.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 60000) {
          const force = 38000 / (d2 + 100);
          const dist = Math.sqrt(d2) || 1;
          p.vx += (dx / dist) * force * gdt;
          p.vy = (p.vy || 0) + (dy / dist) * force * gdt;
          p.y += p.vy * gdt;
        }
      }
      if (p.x < -30) { pickups.splice(i, 1); continue; }
      
      // Increased pickup radius slightly since rocket hitbox was tightened
      if (rocketHits({ ...p, r: p.r + 6 })) {
        pickups.splice(i, 1);
        collectPickup(p);
      }
    }
  }

  function collectPickup(p) {
    const st = RR.state;
    const P = RR.config.PALETTE;
    switch (p.type) {
      case "shield":
        rocket.shield = clamp(rocket.shield + 50, 0, 100);
        RR.game.addScore(120, "SHIELD", p.x, p.y, P.green);
        RR.ui.toast("SHIELD ONLINE");
        RR.effects.boom(p.x, p.y, 14, P.green);
        RR.audio.sfx.shield();
        break;
      case "slow":
        RR.fx.slowMo = 4.4;
        RR.game.addScore(160, "SLOW-MO", p.x, p.y, P.cyan);
        RR.ui.toast("TIME WARP");
        RR.effects.boom(p.x, p.y, 18, P.cyan);
        RR.audio.sfx.slow();
        break;
      case "bomb":
        st.bombs = Math.min(st.bombs + 1, 5);
        RR.game.addScore(140, "BOMB", p.x, p.y, P.yellow);
        RR.ui.toast("BOMB ACQUIRED");
        RR.effects.boom(p.x, p.y, 14, P.yellow);
        RR.audio.sfx.pickup();
        break;
      case "life":
        st.lives = Math.min(st.lives + 1, 5);
        RR.game.addScore(220, "LIFE", p.x, p.y, P.red);
        RR.ui.toast("EXTRA LIFE");
        RR.effects.boom(p.x, p.y, 18, P.red);
        RR.audio.sfx.pickup();
        break;
      case "magnet":
        st.magnetTime = Math.max(st.magnetTime, 9);
        RR.game.addScore(110, "MAGNET", p.x, p.y, P.pink);
        RR.ui.toast("MAGNET ACTIVE");
        RR.effects.boom(p.x, p.y, 14, P.pink);
        RR.audio.sfx.magnet();
        break;
      case "phase":
        st.phaseTime = Math.max(st.phaseTime, 4.5);
        RR.game.addScore(180, "PHASE", p.x, p.y, P.purple);
        RR.ui.toast("PHASE SHIFT");
        RR.effects.boom(p.x, p.y, 18, P.purple);
        RR.audio.sfx.phase();
        break;
      case "multishot":
        st.multishotTime = Math.max(st.multishotTime, 8);
        RR.game.addScore(150, "MULTI", p.x, p.y, P.orange);
        RR.ui.toast("MULTI-SHOT");
        RR.effects.boom(p.x, p.y, 14, P.orange);
        RR.audio.sfx.pickup();
        break;
      case "gem":
        st.combo++; st.comboTimer = 2.8;
        RR.game.addScore(p.value, `x${Math.max(1, st.combo)}`, p.x, p.y, P.yellow);
        RR.effects.boom(p.x, p.y, 10, P.yellow);
        RR.audio.sfx.gem(st.combo);
        break;
      case "star":
      default:
        st.combo++; st.comboTimer = 2.2;
        RR.game.addScore(p.value, "STAR", p.x, p.y, P.white);
        RR.effects.boom(p.x, p.y, 6, P.white);
        RR.audio.sfx.star();
        break;
    }
  }

  RR.entities = {
    stars, asteroids, pickups, bullets, rocket,
    initStars, resetRocket, clearAll,
    rocketHits, splitAsteroid,
    fireBullet, detonateBomb, damageRocket,
    updateRocket, updateStars, updateAsteroids, updateBullets, updatePickups,
    worldScrollMul, makeEngineParticle,
  };
})(typeof window !== "undefined" ? window : this);
