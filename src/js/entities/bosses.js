/* Rocket Rush — Bosses
 * The Bouldron Family™. Three escalating rock-themed bosses with funny taunts.
 * Each boss has its own attack pattern. Final boss has 3 phases.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { rand, choose, clamp, circleHit, TWO_PI } = RR.utils;

  let active = null;          // active boss instance
  let bossBullets = [];       // boss-fired projectiles
  let defeatedFlags = {};     // map id -> boolean

  function reset() {
    active = null;
    bossBullets.length = 0;
    defeatedFlags = {};
    RR.state.bossIndex = -1;
    RR.state.bossPhase = 0;
    RR.state.bossIntroT = 0;
    RR.state.bossDefeatedT = 0;
  }

  // Triggered by spawn pacing when level reaches a boss level.
  function maybeTrigger() {
    if (active) return;
    const st = RR.state;
    const list = RR.config.BOSSES;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (st.level === b.atLevel && !defeatedFlags[b.id]) {
        startIntro(i);
        return;
      }
    }
  }

  function startIntro(i) {
    const cfg = RR.config.BOSSES[i];
    RR.state.mode = "bossIntro";
    RR.state.bossIndex = i;
    RR.state.bossIntroT = 2.6;
    // Clear small asteroids to give the player a clean entry.
    RR.entities.asteroids.length = 0;
    RR.ui.toast(cfg.taunt);
    RR.audio.sfx.bossWarn();
    RR.effects.shake(20);
    RR.effects.flash(0.3, cfg.color);
  }

  function spawnBoss(i) {
    const cfg = RR.config.BOSSES[i];
    const { W, H } = RR.config;
    active = {
      id: cfg.id,
      cfg: cfg,
      cfgIdx: i,
      x: W + 90, y: H / 2,
      tx: W * 0.78, ty: H / 2,    // target position
      r: cfg.type === "dread" ? 85 : (cfg.type === "cosmic" ? 60 : (cfg.type === "tech" ? 70 : 54)),
      hp: cfg.hp,
      maxHp: cfg.hp,
      phase: 1,
      t: 0,
      attackT: rand(1.2, 2.0),
      color: cfg.color,
      name: cfg.name,
      title: cfg.title,
      vy: 0,
      seed: Math.random() * 1000,
      angle: 0,
    };
    RR.state.mode = "bossFight";
    RR.state.bossPhase = 1;
    RR.audio.sfx.bossWarn();
  }

  // ───── Update ─────
  function update(dt, gdt) {
    const st = RR.state;

    if (st.mode === "bossIntro") {
      st.bossIntroT -= dt;
      if (st.bossIntroT <= 0) spawnBoss(st.bossIndex);
      // Progress boss bullets & such even during intro.
      updateBossBullets(dt, gdt);
      return;
    }

    if (st.mode === "bossDefeated") {
      st.bossDefeatedT -= dt;
      updateBossBullets(dt, gdt);
      if (st.bossDefeatedT <= 0) finishBossDefeat();
      return;
    }

    if (st.mode !== "bossFight" || !active) {
      updateBossBullets(dt, gdt);
      return;
    }

    const A = active;
    A.t += dt;

    // Movement styles per type
    if (A.cfg.type === "ufo") {
      // Dart around fast
      if (Math.random() < 0.02) A.tx = RR.config.W * rand(0.65, 0.85);
      if (Math.random() < 0.03) A.ty = rand(A.r + 40, RR.config.H - A.r - 40);
      A.x += (A.tx - A.x) * Math.min(1, dt * 6);
      A.y += (A.ty - A.y) * Math.min(1, dt * 6);
      A.angle = Math.sin(A.t * 3) * 0.1;
    } else if (A.cfg.type === "tech") {
      // Slow rigid float
      A.tx = RR.config.W * 0.78;
      A.ty = RR.config.H / 2 + Math.sin(A.t * 0.6) * 80;
      A.x += (A.tx - A.x) * Math.min(1, dt * 2);
      A.y += (A.ty - A.y) * Math.min(1, dt * 2);
      A.angle = 0;
    } else if (A.cfg.type === "cosmic") {
      // Static center, wobbles size (pulse)
      A.tx = RR.config.W * 0.82;
      A.ty = RR.config.H / 2;
      A.x += (A.tx - A.x) * Math.min(1, dt * 1);
      A.y += (A.ty - A.y) * Math.min(1, dt * 1);
      A.angle += dt * 0.2;
    } else if (A.cfg.type === "dread") {
      // Lumbering titan
      A.tx = RR.config.W * 0.85;
      A.ty = RR.config.H / 2 + Math.sin(A.t * 0.4) * 120;
      A.x += (A.tx - A.x) * Math.min(1, dt * 0.8);
      A.y += (A.ty - A.y) * Math.min(1, dt * 0.8);
      A.angle = Math.sin(A.t * 0.2) * 0.05;
    } else {
      // Rock (default)
      A.x += (A.tx - A.x) * Math.min(1, dt * 1.6);
      A.ty = RR.config.H / 2 + Math.sin(A.t * 0.9) * 110 + Math.sin(A.t * 1.7) * 25 * A.phase;
      A.y += (A.ty - A.y) * Math.min(1, dt * 4);
      A.angle += dt * 0.6 * A.phase;
    }

    // Attack timer.
    A.attackT -= dt;
    if (A.attackT <= 0) {
      doAttack(A);
      const baseCd = A.cfg.type === "ufo" ? rand(0.4, 0.8)
        : A.cfg.type === "tech" ? rand(1.2, 1.8)
          : A.cfg.type === "cosmic" ? rand(0.8, 1.4)
            : A.cfg.type === "dread" ? rand(0.5, 1.0)
              : rand(0.6, 1.2);
      A.attackT = baseCd / (1 + (A.phase - 1) * 0.3);
    }

    // Collide with rocket.
    if (RR.entities.rocketHits(A)) {
      RR.entities.damageRocket();
      // Knockback boss slightly, unless cosmic (anomaly sucks you in)
      if (A.cfg.type !== "cosmic") A.tx = Math.min(RR.config.W * 0.85, A.x + 14);
    }

    // Phase transitions logic based on HP. Everyone gets 2 phases, final boss gets 3.
    const ratio = A.hp / A.maxHp;
    if (A.cfg.final) {
      if (ratio < 0.66 && A.phase < 2) { A.phase = 2; st.bossPhase = 2; RR.ui.toast("DREADNOUGHT ACCELERATING"); RR.effects.flash(0.4, A.color); RR.audio.sfx.bossWarn(); }
      if (ratio < 0.30 && A.phase < 3) { A.phase = 3; st.bossPhase = 3; RR.ui.toast("CORE OVERLOAD!"); RR.effects.flash(0.5, RR.config.PALETTE.red); RR.audio.sfx.bossWarn(); }
    } else {
      if (ratio < 0.5 && A.phase < 2) { A.phase = 2; st.bossPhase = 2; RR.ui.toast(`${A.name} IS ANGRY`); RR.audio.sfx.bossWarn(); }
    }

    updateBossBullets(dt, gdt);
  }

  function updateBossBullets(dt, gdt) {
    const W = RR.config.W, H = RR.config.H;
    for (let i = bossBullets.length - 1; i >= 0; i--) {
      const b = bossBullets[i];
      // Use gdt so slow-mo also slows boss projectiles.
      b.x += b.vx * gdt; b.y += b.vy * gdt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
        bossBullets.splice(i, 1); continue;
      }
      // Hit rocket?
      if (RR.entities.rocketHits(b)) {
        bossBullets.splice(i, 1);
        RR.entities.damageRocket();
      }
    }
  }

  // ───── Attacks ─────
  function doAttack(A) {
    const P = RR.config.PALETTE;
    const rkt = RR.entities.rocket;
    const aim = Math.atan2(rkt.y - A.y, rkt.x - A.x);

    if (A.cfg.type === "rock") {
      // Bouldron: Rocks and ring bursts
      if (A.phase >= 1) {
        const cnt = A.phase >= 2 ? 2 : 1;
        for (let i = 0; i < cnt; i++) {
          RR.entities.asteroids.push({ x: A.x - 40, y: A.y + rand(-50, 50), r: rand(16, 24), vx: -(280 + rand(0, 80)), vy: rand(-60, 60), spin: rand(-3, 3), rot: 0, hp: 2, fast: true, splitter: false, seed: Math.random() * 999 });
        }
      }
      if (A.phase >= 2) {
        const ringN = 12;
        for (let i = 0; i < ringN; i++) {
          const a = (i / ringN) * TWO_PI + A.t * 0.4;
          bossBullets.push({ x: A.x, y: A.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 6, life: 2.6, color: P.orange });
        }
      }
    } else if (A.cfg.type === "ufo") {
      // Zeta Saucer: Laser spreads and plasma barrages
      if (Math.random() < 0.4 || A.phase >= 2) {
        // Barrage
        for (let i = 0; i < 4 + A.phase * 2; i++) {
          const a = aim + rand(-0.4, 0.4);
          bossBullets.push({ x: A.x - 20, y: A.y + rand(-10, 10), vx: Math.cos(a) * 450, vy: Math.sin(a) * 450, r: 5, life: 2.5, color: P.green });
        }
      } else {
        // Targeted spread
        for (let i = -1; i <= 1; i++) {
          bossBullets.push({ x: A.x - 20, y: A.y, vx: Math.cos(aim + i * 0.15) * 500, vy: Math.sin(aim + i * 0.15) * 500, r: 6, life: 2.3, color: P.cyan });
        }
      }
    } else if (A.cfg.type === "tech") {
      // Orbital Bastion: Area denial and laser walls
      if (A.phase >= 1) {
        if (Math.random() < 0.4) {
          // Deploy a spread of 3 slow, large mines
          for (let i = -1; i <= 1; i++) {
            RR.entities.asteroids.push({
              x: A.x - 40, y: A.y + i * 40, r: 28,
              vx: -100, vy: i * 30, spin: rand(-1, 1), rot: 0, hp: 3, fast: false, splitter: true, seed: Math.random() * 999,
            });
          }
        } else {
          // Shotgun blast of fast lasers
          for (let i = -2; i <= 2; i++) {
            bossBullets.push({ x: A.x - 30, y: A.y, vx: Math.cos(aim + i * 0.1) * 650, vy: Math.sin(aim + i * 0.1) * 650, r: 6, life: 2.5, color: P.cyan });
          }
        }
      }
      if (A.phase >= 2 && Math.random() < 0.6) {
        // "Laser Wall" with a random gap
        const gapIndex = Math.floor(rand(2, 9));
        for (let i = 0; i < 11; i++) {
          if (i === gapIndex || i === gapIndex + 1) continue; // Leave a gap for the player to dodge through
          bossBullets.push({
            x: A.x - 20, y: 50 + i * (RR.config.H - 100) / 10,
            vx: -350, vy: 0, r: 8, life: 4.0, color: P.pink
          });
        }
      }
    } else if (A.cfg.type === "cosmic") {
      // Anomaly: Dense interlocking spirals and targeted singularities
      A._spinT = (A._spinT || 0) + 0.35;
      
      // Phase 1: Dual interlocking spirals
      const arms = A.phase >= 2 ? 4 : 2;
      for (let i = 0; i < arms; i++) {
        const a = A._spinT + (i * TWO_PI / arms);
        bossBullets.push({ x: A.x, y: A.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, r: 7, life: 4.0, color: P.purple });
        // Counter-rotating inner spiral
        const b = -A._spinT + (i * TWO_PI / arms);
        bossBullets.push({ x: A.x, y: A.y, vx: Math.cos(b) * 140, vy: Math.sin(b) * 140, r: 5, life: 5.0, color: P.pink });
      }

      if (A.phase >= 2 && Math.random() < 0.4) {
        // "Singularity Blast": A dense ring of bullets fired directly at the player's current position
        const ringN = 12;
        for (let i = 0; i < ringN; i++) {
          const spread = (i / ringN) * TWO_PI;
          bossBullets.push({ 
            x: A.x, y: A.y, 
            vx: Math.cos(aim) * 450 + Math.cos(spread) * 100, 
            vy: Math.sin(aim) * 450 + Math.sin(spread) * 100, 
            r: 8, life: 3.0, color: P.muted 
          });
        }
      }
    } else if (A.cfg.type === "dread") {
      // Mothership: The ultimate bullet hell
      A._spinT = (A._spinT || 0) + 0.15; // Fast sine wave sweeper
      
      if (A.phase >= 1) {
        // Sweeping heavy beams
        const sweepAim = aim + Math.sin(A._spinT) * 0.5;
        for (let i = -1; i <= 1; i++) {
          bossBullets.push({ 
            x: A.x - 40, y: A.y + i*20, 
            vx: Math.cos(sweepAim + i * 0.05) * 600, vy: Math.sin(sweepAim + i * 0.05) * 600, 
            r: 9, life: 3.0, color: P.red 
          });
        }
      }
      if (A.phase >= 2 && Math.random() < 0.4) {
        // Barrage of fast seeker rocks masking a huge spread of bullets
        RR.entities.asteroids.push({ 
          x: A.x - 50, y: rkt.y + rand(-100, 100), r: 22, vx: -450, vy: rand(-40, 40), 
          spin: rand(-4, 4), rot: 0, hp: 4, fast: true, splitter: false, seed: Math.random() * 999 
        });
        // 7-way spread
        for (let i = -3; i <= 3; i++) {
          bossBullets.push({ x: A.x - 40, y: A.y, vx: Math.cos(aim + i * 0.12) * 400, vy: Math.sin(aim + i * 0.12) * 400, r: 6, life: 3.5, color: P.orange });
        }
      }
      if (A.phase >= 3) {
        // Desperation move: Chaotic Omni-directional blast + Hellfire spiral
        const arms = 5;
        for (let i = 0; i < arms; i++) {
          const a = A._spinT * 2 + (i * TWO_PI / arms);
          bossBullets.push({ x: A.x - 30, y: A.y, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, r: 8, life: 4.0, color: P.yellow });
        }
        if (Math.random() < 0.3) {
          // Pincer bullets from top and bottom
          bossBullets.push({ x: rkt.x + rand(100, 300), y: -10, vx: -200, vy: 300, r: 10, life: 4.0, color: P.red });
          bossBullets.push({ x: rkt.x + rand(100, 300), y: RR.config.H + 10, vx: -200, vy: -300, r: 10, life: 4.0, color: P.red });
        }
      }
    }

    RR.audio.sfx.bossHit();
  }

  // Bullet from rocket → boss collision.
  function collideBullet(b) {
    if (!active || RR.state.mode === "bossDefeated") return false;
    const A = active;
    if (circleHit(b, A)) {
      damage(b.dmg || 1);
      RR.effects.boom(b.x, b.y, 6, A.color);
      return true;
    }
    return false;
  }

  function damage(amount) {
    if (!active || RR.state.mode === "bossDefeated") return;
    const A = active;
    A.hp -= amount;
    RR.effects.shake(4);
    RR.audio.sfx.bossHit();
    if (A.hp <= 0) defeat();
  }

  function onBomb(amount) { damage(amount); }

  function defeat() {
    if (!active) return;
    const A = active;
    const cfg = RR.config.BOSSES[A.cfgIdx];
    defeatedFlags[A.id] = true;
    RR.state.mode = "bossDefeated";
    RR.state.bossDefeatedT = 2.0;
    RR.effects.shake(40);
    RR.effects.flash(0.6, A.color);
    RR.audio.sfx.bossDown();

    // Clear active bullets so the player isn't cheap-shotted after winning.
    bossBullets.length = 0;

    // Dramatic chain explosion over 1.5 seconds.
    const duration = 1500;
    const count = 20;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!active || active.deadVisual) return;
        RR.effects.boom(
          A.x + rand(-A.r, A.r),
          A.y + rand(-A.r, A.r),
          rand(15, 35),
          choose([A.color, "#fff", RR.config.PALETTE.orange, RR.config.PALETTE.yellow])
        );
        RR.effects.shake(4);
        if (i % 3 === 0) RR.audio.sfx.boom();
      }, (i / count) * duration);
    }

    // Final massive blast.
    setTimeout(() => {
      if (!active) return;
      RR.effects.shake(35);
      RR.effects.flash(0.8, "#fff");
      RR.effects.boom(A.x, A.y, A.r * 1.8, "#fff");
      RR.audio.sfx.bossDown();
      A.deadVisual = true; // Hides the boss drawing
    }, duration);

    RR.game.addScore(2200 + (A.cfgIdx + 1) * 1500, "BOSS DESTROYED", A.x, A.y, RR.config.PALETTE.yellow);
    RR.ui.toast(cfg.final ? "GALAXY SAVED!" : `${A.name} DESTROYED`);
  }

  function finishBossDefeat() {
    const A = active;
    active = null;
    bossBullets.length = 0;
    if (!A) return;
    const cfg = RR.config.BOSSES[A.cfgIdx];
    if (cfg.final) {
      RR.game.victory();
    } else {
      RR.state.mode = "playing";
      RR.state.bossIndex = -1;
      RR.state.bossPhase = 0;
      // Force-progress to next level so spawn pacing resumes naturally.
      RR.state.distance = (cfg.atLevel) * RR.config.TUNE.world.distPerLevel + 50;
      RR.audio.sfx.victory();
    }
  }

  // ───── Render ─────
  function draw(ctx) {
    if (!active) return;
    const A = active;
    if (A.deadVisual) return; // Don't draw after the final massive boom

    const t = performance.now() / 1000;
    ctx.save();
    
    let dx = 0, dy = 0;
    if (RR.state.mode === "bossDefeated") {
      dx = rand(-6, 6);
      dy = rand(-6, 6);
      // Optional: fade out right before the big explosion
      ctx.globalAlpha = Math.max(0, 1 - (2.0 - RR.state.bossDefeatedT) / 2.0);
    }
    ctx.translate(A.x + dx, A.y + dy);

    // Glow
    ctx.save();
    ctx.globalAlpha = 0.20 + Math.sin(t * 4) * 0.06;
    ctx.fillStyle = A.color;
    ctx.beginPath(); ctx.arc(0, 0, A.r + 22, 0, TWO_PI); ctx.fill();
    ctx.restore();

    // Body logic per type
    if (A.cfg.type === "ufo") drawUFO(ctx, A);
    else if (A.cfg.type === "tech") drawStation(ctx, A);
    else if (A.cfg.type === "cosmic") drawAnomaly(ctx, A);
    else if (A.cfg.type === "dread") drawDreadnought(ctx, A);
    else drawRock(ctx, A);

    ctx.restore();

    // (Boss bullets are drawn by render.drawBossBullets to keep z-order clean.)

    // Boss HP bar at top.
    const W = RR.config.W;
    const barW = W * 0.6;
    const barX = (W - barW) / 2;
    const ratio = clamp(A.hp / A.maxHp, 0, 1);
    ctx.save();
    ctx.fillStyle = "rgba(5,3,22,0.7)";
    ctx.fillRect(barX - 4, 18, barW + 8, 16);
    ctx.fillStyle = A.color;
    ctx.fillRect(barX, 22, barW * ratio, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, 22, barW, 8);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${A.name}  ·  ${A.title}  ·  PHASE ${A.phase}`, W / 2, 16);
    ctx.restore();
  }

  // ───── Boss Renders ─────

  function drawRock(ctx, A) {
    ctx.save();
    ctx.rotate(A.angle);
    const points = 14;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const ang = (i / points) * TWO_PI;
      const wob = 0.78 + 0.30 * Math.sin(A.seed + i * 1.61);
      const rr = A.r * wob;
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = A.color; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.stroke();
    // Craters
    ctx.globalAlpha = 0.30; ctx.fillStyle = "#050316";
    for (let c = 0; c < 6; c++) {
      const ang = A.seed + c * 1.7;
      const rr = A.r * 0.45;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, A.r * (0.10 + (c % 3) * 0.04), 0, TWO_PI); ctx.fill();
    }
    ctx.restore();

    // Eyes & Mouth
    ctx.save();
    const t = performance.now() / 1000;
    const blink = (Math.sin(t * 2.4 + A.seed) > 0.95) ? 0.2 : 1;
    const ex = -A.r * 0.18, ey = -A.r * 0.05;
    const er = A.r * 0.18;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(-ex, ey, er, 0, TWO_PI); ctx.fill();
    const rkt = RR.entities.rocket;
    const px1 = ex + clamp((rkt.x - (A.x + ex)) * 0.01, -er * 0.5, er * 0.5);
    const px2 = -ex + clamp((rkt.x - (A.x - ex)) * 0.01, -er * 0.5, er * 0.5);
    const py = ey + clamp((rkt.y - (A.y + ey)) * 0.01, -er * 0.5, er * 0.5);
    ctx.fillStyle = "#0a0026";
    ctx.beginPath(); ctx.ellipse(px1, py, er * 0.5, er * 0.5 * blink, 0, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px2, py, er * 0.5, er * 0.5 * blink, 0, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = "#0a0026"; ctx.lineWidth = Math.max(2, A.r * 0.05); ctx.beginPath();
    const y = A.r * 0.28;
    ctx.moveTo(-A.r * 0.30, y);
    for (let i = 0; i <= 6; i++) {
      const xx = -A.r * 0.30 + (A.r * 0.60) * (i / 6);
      ctx.lineTo(xx, y + (i % 2 ? -A.r * 0.06 : A.r * 0.06));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawUFO(ctx, A) {
    ctx.save();
    ctx.rotate(A.angle);
    // Saucer Base
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.ellipse(0, 0, A.r, A.r * 0.4, 0, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = A.color; ctx.lineWidth = 4; ctx.stroke();
    // Glass Dome
    ctx.fillStyle = "rgba(120,255,122,0.4)";
    ctx.beginPath(); ctx.arc(0, -A.r * 0.15, A.r * 0.45, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    // Blinking lights
    const t = performance.now() / 100;
    for(let i=0; i<5; i++) {
      const ang = Math.PI + (i/4)*Math.PI;
      const lx = Math.cos(ang) * (A.r * 0.8), ly = Math.sin(ang) * (A.r * 0.25) + 5;
      ctx.fillStyle = (Math.floor(t + i) % 2 === 0) ? A.color : "#fff";
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, TWO_PI); ctx.fill();
    }
    ctx.restore();
  }

  function drawStation(ctx, A) {
    ctx.save();
    const t = performance.now() / 1000;
    
    // Rotating outer defense ring
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.strokeStyle = "#4466ff";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, A.r * 1.4, 0, TWO_PI); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#112244";
      ctx.fillRect(A.r * 1.3, -A.r * 0.2, A.r * 0.4, A.r * 0.4);
      ctx.strokeStyle = A.color;
      ctx.strokeRect(A.r * 1.3, -A.r * 0.2, A.r * 0.4, A.r * 0.4);
      // Blinking node lights
      ctx.fillStyle = (Math.sin(t * 5 + i) > 0) ? A.color : "#fff";
      ctx.beginPath(); ctx.arc(A.r * 1.5, 0, 4, 0, TWO_PI); ctx.fill();
    }
    ctx.restore();

    // Main Bastion Core
    ctx.fillStyle = "#0c1020";
    ctx.beginPath();
    ctx.moveTo(A.r * 0.8, 0);
    ctx.lineTo(A.r * 0.5, A.r * 0.8);
    ctx.lineTo(-A.r * 0.5, A.r * 0.8);
    ctx.lineTo(-A.r * 0.8, 0);
    ctx.lineTo(-A.r * 0.5, -A.r * 0.8);
    ctx.lineTo(A.r * 0.5, -A.r * 0.8);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = A.color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Central Energy Reactor
    ctx.fillStyle = "#050a14";
    ctx.beginPath(); ctx.arc(0, 0, A.r * 0.5, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = A.color;
    ctx.beginPath(); ctx.arc(0, 0, A.r * 0.4 + Math.sin(t * 8) * 4, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, A.r * 0.2 + Math.sin(t * 12) * 2, 0, TWO_PI); ctx.fill();
    
    ctx.restore();
  }

  function drawAnomaly(ctx, A) {
    ctx.save();
    const t = performance.now() / 1000;
    
    // Accretion Disk (multiple layered ellipses)
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate(t * (0.5 + i * 0.2));
      ctx.fillStyle = `hsla(${270 + i * 15 + Math.sin(t) * 20}, 100%, 60%, 0.15)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, A.r * (1.2 + i * 0.1), A.r * (0.3 + i * 0.05), 0, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    // Pulsing event horizon aura
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
    const grad = ctx.createRadialGradient(0, 0, A.r * 0.4, 0, 0, A.r * 1.5);
    grad.addColorStop(0, A.color);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, A.r * 1.5, 0, TWO_PI); ctx.fill();

    // The Void (Pitch Black center)
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000000";
    ctx.beginPath(); ctx.arc(0, 0, A.r * 0.65 + Math.sin(t * 6) * 5, 0, TWO_PI); ctx.fill();
    
    // Swirling singular debris inside
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const angle = t * (4 - i) + i * TWO_PI / 3;
      const dist = A.r * 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 3, 0, TWO_PI); ctx.fill();
    }
    
    ctx.restore();
  }

  function drawDreadnought(ctx, A) {
    ctx.save();
    const t = performance.now() / 1000;
    ctx.rotate(A.angle);
    
    // Engine Trails
    ctx.fillStyle = "#ffaa00";
    ctx.globalAlpha = 0.6 + Math.sin(t * 20) * 0.4;
    ctx.beginPath();
    ctx.ellipse(-A.r * 1.1, -A.r * 0.3, A.r * 0.4 + Math.random()*10, A.r * 0.15, 0, 0, TWO_PI);
    ctx.ellipse(-A.r * 1.1, A.r * 0.3, A.r * 0.4 + Math.random()*10, A.r * 0.15, 0, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wing spans (swept forward)
    ctx.fillStyle = "#0a050a";
    ctx.beginPath();
    ctx.moveTo(-A.r * 0.5, 0);
    ctx.lineTo(-A.r * 0.8, -A.r * 1.2);
    ctx.lineTo(A.r * 0.2, -A.r * 0.9);
    ctx.lineTo(A.r * 0.5, 0);
    ctx.lineTo(A.r * 0.2, A.r * 0.9);
    ctx.lineTo(-A.r * 0.8, A.r * 1.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = "#441111";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Main Fuselage
    ctx.fillStyle = "#1a0a1a";
    ctx.beginPath();
    ctx.moveTo(A.r * 1.1, 0); 
    ctx.lineTo(A.r * 0.4, -A.r * 0.4); 
    ctx.lineTo(-A.r, -A.r * 0.5);
    ctx.lineTo(-A.r, A.r * 0.5); 
    ctx.lineTo(A.r * 0.4, A.r * 0.4); 
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = A.color; 
    ctx.lineWidth = 4; 
    ctx.stroke();
    
    // Front heavy cannon / Maw
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(A.r * 1.1, 0);
    ctx.lineTo(A.r * 0.6, -A.r * 0.15);
    ctx.lineTo(A.r * 0.6, A.r * 0.15);
    ctx.closePath();
    ctx.fill();

    // Core Engine / Eye
    ctx.fillStyle = A.color;
    ctx.beginPath(); ctx.arc(-A.r * 0.4, 0, A.r * 0.35, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-A.r * 0.4, 0, A.r * 0.15 + Math.sin(t * 10) * 4, 0, TWO_PI); ctx.fill();
    
    // Warning lights along the wings
    ctx.fillStyle = (Math.floor(t * 4) % 2 === 0) ? "#ff0000" : "#550000";
    ctx.beginPath(); ctx.arc(-A.r * 0.6, -A.r * 1.0, 5, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(-A.r * 0.6, A.r * 1.0, 5, 0, TWO_PI); ctx.fill();

    ctx.restore();
  }

  // ───── Tracker (bottom-middle level/boss progress) ─────
  function drawTracker(ctx) {
    const { W, H, BOSSES, LEVEL_FOR_VICTORY, PALETTE } = RR.config;
    const trackY = H - 24;
    const trackW = Math.min(W * 0.62, 620);
    const x0 = (W - trackW) / 2;
    const x1 = x0 + trackW;

    // Container
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(5,3,22,0.55)";
    ctx.fillRect(x0 - 12, trackY - 14, trackW + 24, 28);
    ctx.strokeStyle = "rgba(54,245,255,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 12, trackY - 14, trackW + 24, 28);

    // Base line
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, trackY); ctx.lineTo(x1, trackY); ctx.stroke();

    // Level dots
    const totalLevels = LEVEL_FOR_VICTORY;
    for (let i = 1; i <= totalLevels; i++) {
      const fx = x0 + (trackW * (i - 1) / (totalLevels - 1));
      const bossData = BOSSES.find(b => b.atLevel === i);
      const isBoss = !!bossData;
      const passed = i < RR.state.level;
      const current = i === RR.state.level;
      ctx.beginPath();
      if (isBoss) {
        // Diamond marker
        ctx.save();
        ctx.translate(fx, trackY);
        ctx.rotate(Math.PI / 4);
        const sz = current ? 8 : (bossData.final || bossData.type === "dread" ? 6 : 5);
        ctx.fillStyle = passed ? PALETTE.green : (current ? PALETTE.red : PALETTE.muted);
        ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
        ctx.restore();
      } else {
        const r = current ? 5 : 3.5;
        ctx.fillStyle = passed ? PALETTE.green : (current ? PALETTE.cyan : "rgba(255,255,255,0.35)");
        ctx.arc(fx, trackY, r, 0, TWO_PI);
        ctx.fill();
      }
    }

    // Boss labels — only show for current/upcoming boss to save space.
    ctx.font = "bold 9px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    BOSSES.forEach((b) => {
      // Only show if it's the very next boss, or currently fighting it, or if it's the final boss.
      if (b.atLevel === RR.state.level || (b.final && RR.state.level > 10)) {
        const fx = x0 + (trackW * (b.atLevel - 1) / (totalLevels - 1));
        ctx.globalAlpha = b.atLevel === RR.state.level ? 1 : 0.45;
        ctx.fillStyle = b.color;
        ctx.fillText(b.name, fx, trackY - 14);
      }
    });
    ctx.globalAlpha = 1;

    // Mini rocket icon at the player's progress.
    const distPerLevel = RR.config.TUNE.world.distPerLevel;
    const fracInLevel = clamp((RR.state.distance - (RR.state.level - 1) * distPerLevel) / distPerLevel, 0, 1);
    const lvl = clamp(RR.state.level + fracInLevel, 1, totalLevels);
    const fx = x0 + (trackW * (lvl - 1) / (totalLevels - 1));
    ctx.save();
    ctx.translate(fx, trackY + 9);
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(7, 4); ctx.lineTo(-7, 4); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Boss intro overlay (drawn each frame during intro).
  function drawIntro(ctx) {
    const st = RR.state;
    if (st.mode !== "bossIntro") return;
    const cfg = RR.config.BOSSES[st.bossIndex];
    if (!cfg) return;
    const W = RR.config.W, H = RR.config.H;
    const t = performance.now() / 1000;
    const flicker = (Math.sin(t * 30) > 0) ? 1 : 0.45;
    ctx.save();
    ctx.fillStyle = "rgba(5,3,22,0.55)";
    ctx.fillRect(0, H * 0.30, W, H * 0.20);
    ctx.textAlign = "center";
    ctx.fillStyle = cfg.color;
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = flicker;
    ctx.font = "bold 36px 'Courier New', Courier, monospace";
    ctx.fillText("⚠  WARNING  ⚠", W / 2, H * 0.40);
    ctx.font = "bold 28px 'Courier New', Courier, monospace";
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 8;
    ctx.fillText(cfg.taunt, W / 2, H * 0.46);
    ctx.restore();
  }

  RR.bosses = {
    reset, maybeTrigger, update, draw, drawTracker, drawIntro,
    collideBullet, onBomb, damage, defeat,
    get active() { return active; },
    get bossBullets() { return bossBullets; },
    get defeatedFlags() { return defeatedFlags; },
  };
})(typeof window !== "undefined" ? window : this);
