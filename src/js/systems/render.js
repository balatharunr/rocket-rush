/* Rocket Rush — Render
 * All canvas drawing. Background, parallax stars, nebula, asteroids,
 * pickups, bullets, particles, rocket, HUD overlays, boss visuals.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { rand, clamp, TWO_PI } = RR.utils;

  // Cached gradients keyed by their key. Re-created on resize.
  let bgGradient = null;
  let bgGradientKey = "";

  function rebuildCaches() {
    bgGradient = null;
    bgGradientKey = "";
  }

  function ensureBgGradient(ctx) {
    const { W, H, PALETTE } = RR.config;
    const key = `${W}x${H}_${PALETTE.skyTop}_${PALETTE.skyBot}`;
    if (bgGradient && bgGradientKey === key) return bgGradient;
    bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0,    PALETTE.skyTop);
    bgGradient.addColorStop(0.54, PALETTE.skyMid);
    bgGradient.addColorStop(1,    PALETTE.skyBot);
    bgGradientKey = key;
    return bgGradient;
  }

  function frame() {
    const ctx = RR.dom.ctx;
    const cfg = RR.config;
    const { W, H, scale, PALETTE } = cfg;

    // Reset transform and clear backing buffer.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Apply game scale + screen shake (in physical pixels). Letterbox via offsetX/Y.
    const sh = RR.fx.shake;
    const shx = sh > 0 ? rand(-sh, sh) : 0;
    const shy = sh > 0 ? rand(-sh, sh) : 0;
    const ox = (cfg.offsetX || 0), oy = (cfg.offsetY || 0);
    ctx.setTransform(scale, 0, 0, scale, ox + shx, oy + shy);

    drawBackground(ctx);
    drawNebula(ctx);
    drawStars(ctx);
    drawMotionLines(ctx);
    drawPickups(ctx);
    drawAsteroids(ctx);
    drawBullets(ctx);
    drawBossBullets(ctx);
    drawParticles(ctx);
    if (RR.bosses.active) RR.bosses.draw(ctx);
    RR.bosses.drawWormhole(ctx);
    drawRocket(ctx);
    drawFloatingTexts(ctx);

    // UI overlays inside the canvas (not affected by shake).
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    drawForeground(ctx);
    RR.bosses.drawTracker(ctx);
    RR.bosses.drawIntro(ctx);

    // Slow-mo and flash full-screen.
    if (RR.fx.slowMo > 0 && RR.state.mode !== "menu") {
      ctx.save();
      ctx.globalAlpha = 0.13 + Math.sin(performance.now() / 130) * 0.04;
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (RR.fx.flash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(RR.fx.flash * 2.4, 0, 1);
      ctx.fillStyle = RR.fx.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (RR.state.mode === "menu") drawAttractMode(ctx);
  }

  function drawBackground(ctx) {
    const { W, H } = RR.config;
    ctx.fillStyle = ensureBgGradient(ctx);
    ctx.fillRect(0, 0, W, H);
  }

  function drawNebula(ctx) {
    if (RR.config.lowDetail) return;
    const { W, H, PALETTE } = RR.config;
    const t = performance.now() / 1000;
    const colors = PALETTE._nebulaColors || [PALETTE.pink, PALETTE.cyan, PALETTE.purple];
    const count = PALETTE._nebulaCount || 3;
    const brightness = PALETTE._nebulaBrightness || 0.22;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const cx = (W * (0.15 + i * (0.65 / Math.max(count - 1, 1))) + Math.sin(t * 0.13 + i) * 70) % (W + 200);
      const cy = H * (0.25 + 0.22 * Math.sin(t * 0.21 + i * 1.7));
      const r = 200 + Math.sin(t * 0.4 + i) * 55;
      const alphaHex = Math.floor(brightness * 255).toString(16).padStart(2, "0");
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      grad.addColorStop(0,   colors[i % colors.length] + alphaHex);
      grad.addColorStop(0.5, colors[i % colors.length] + Math.floor(brightness * 0.5 * 255).toString(16).padStart(2, "0"));
      grad.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();

    // Map-specific special effects
    const special = PALETTE._special;
    if (special === "aurora") drawAuroraCurtains(ctx, t);
    if (special === "void") drawVoidRays(ctx, t);
  }

  function drawAuroraCurtains(ctx, t) {
    // Glowing vertical aurora curtains for Nebula Storm
    const { W, H, PALETTE } = RR.config;
    const color = PALETTE._auroraColor || PALETTE.cyan;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 4; i++) {
      const cx = W * (0.1 + i * 0.25) + Math.sin(t * 0.08 + i * 1.3) * 80;
      const w = 60 + Math.sin(t * 0.15 + i) * 25;
      const h = H * (0.3 + Math.sin(t * 0.22 + i * 0.7) * 0.15);
      const grad = ctx.createLinearGradient(cx, H * 0.1, cx, H * 0.1 + h);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.3, color + "22");
      grad.addColorStop(0.7, color + "18");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - w / 2, H * 0.1, w, h);
    }
    ctx.restore();
  }

  function drawVoidRays(ctx, t) {
    // Subtle cosmic rays from top for Dark Void
    const { W, H, PALETTE } = RR.config;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + i * 0.35) + Math.sin(t * 0.05 + i * 2.1) * 120;
      const rayW = 4 + Math.sin(t * 0.3 + i) * 2;
      const rayH = H * (0.4 + Math.sin(t * 0.18 + i) * 0.2);
      const grad = ctx.createLinearGradient(cx, 0, cx + 30, rayH);
      grad.addColorStop(0, PALETTE._starAccent + "15");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - rayW / 2, 0);
      ctx.lineTo(cx + rayW / 2 + 30, rayH);
      ctx.lineTo(cx + rayW / 2, rayH);
      ctx.lineTo(cx - rayW / 2 - 20, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStars(ctx) {
    const stars = RR.entities.stars;
    const PALETTE = RR.config.PALETTE;
    const rocket = RR.entities.rocket;
    const fxMotion = RR.fx.motionLines || 0;
    const starHue = PALETTE._starHue || PALETTE.white;
    const starAccent = PALETTE._starAccent || PALETTE.cyan;

    if (!rocket.turbo) {
      // Normal: draw stars as small dots (fast path)
      for (const s of stars) {
        const tw = 0.45 + Math.sin(s.tw) * 0.25 + s.z * 0.18;
        ctx.globalAlpha = clamp(tw, 0.15, 1);
        ctx.fillStyle = s.z > 2.2 ? starAccent : starHue;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
    } else {
      // Turbo: draw stars as elongated streaks for that classic warp-speed feel
      ctx.lineCap = "round";
      for (const s of stars) {
        const tw = 0.45 + Math.sin(s.tw) * 0.25 + s.z * 0.18;
        ctx.globalAlpha = clamp(tw, 0.15, 1);
        // Streak length scales with depth (z) and turbo motion intensity
        const streak = fxMotion * (10 + s.z * 18);
        ctx.strokeStyle = s.z > 2.2 ? starAccent : starHue;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - streak, s.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawMotionLines(ctx) {
    // Stars now do all the speed-streak work in drawStars; this is a no-op kept
    // for backward compatibility and possible future overlays.
    if (RR.config.lowDetail) return;
    if (!RR.entities.rocket.turbo) return;
    const fxMotion = RR.fx.motionLines;
    if (fxMotion <= 0.05) return;
    const { W, H, PALETTE } = RR.config;
    ctx.save();
    // Subtle vignette tint at high boost for extra speed feel
    ctx.globalAlpha = fxMotion * 0.10;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,    PALETTE.cyan);
    grad.addColorStop(0.35, "rgba(0,0,0,0)");
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawPickups(ctx) {
    const { PALETTE } = RR.config;
    for (const p of RR.entities.pickups) {
      const y = p.y + Math.sin(p.bob) * 7;
      ctx.save();
      ctx.translate(p.x, y);
      ctx.rotate(p.bob * 0.7);

      switch (p.type) {
        case "shield":
          ctx.fillStyle = PALETTE.green; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -18); ctx.lineTo(16, -9); ctx.lineTo(10, 14);
          ctx.lineTo(0, 21); ctx.lineTo(-10, 14); ctx.lineTo(-16, -9);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        case "slow":
          ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 16, 0, TWO_PI); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(0, -10);
          ctx.moveTo(0, 0); ctx.lineTo(9, 5);
          ctx.stroke();
          break;
        case "bomb":
          ctx.fillStyle = PALETTE.yellow; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 4, 13, 0, TWO_PI); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#0a0026";
          ctx.fillRect(-2, -10, 4, 6);
          ctx.fillStyle = PALETTE.orange;
          ctx.beginPath(); ctx.arc(0, -12, 3, 0, TWO_PI); ctx.fill();
          break;
        case "life": {
          // Emergency life pickup: bright halo + heart to stand out when health is critical.
          const pulse = 1 + Math.sin(p.bob * 2.8) * 0.14;
          ctx.scale(pulse, pulse);
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = PALETTE.red;
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, TWO_PI); ctx.fill();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, TWO_PI); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = PALETTE.red;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 13);
          ctx.bezierCurveTo(14, 1, 16, -10, 8, -13);
          ctx.bezierCurveTo(3, -15, 0, -11, 0, -8);
          ctx.bezierCurveTo(0, -11, -3, -15, -8, -13);
          ctx.bezierCurveTo(-16, -10, -14, 1, 0, 13);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(Math.cos(p.bob * 2.1) * 20, Math.sin(p.bob * 2.1) * 9, 2.4, 0, TWO_PI);
          ctx.fill();
          break;
        }
        case "magnet":
          ctx.strokeStyle = PALETTE.pink; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 12, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
          ctx.fillStyle = PALETTE.pink;
          ctx.fillRect(-12, -3, 4, 8);
          ctx.fillRect(8, -3, 4, 8);
          ctx.fillStyle = "#fff";
          ctx.fillRect(-12, 4, 4, 3);
          ctx.fillRect(8, 4, 4, 3);
          break;
        case "phase":
          ctx.strokeStyle = PALETTE.purple; ctx.fillStyle = "rgba(181,98,255,0.35)";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 14, 0, TWO_PI); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, TWO_PI); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 3, 0, TWO_PI); ctx.fillStyle = "#fff"; ctx.fill();
          break;
        case "multishot":
          ctx.strokeStyle = PALETTE.orange; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-12, -6); ctx.lineTo(12, -6);
          ctx.moveTo(-12,  0); ctx.lineTo(12, 0);
          ctx.moveTo(-12,  6); ctx.lineTo(12, 6);
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(12, -6, 2, 0, TWO_PI); ctx.fill();
          ctx.beginPath(); ctx.arc(12,  0, 2, 0, TWO_PI); ctx.fill();
          ctx.beginPath(); ctx.arc(12,  6, 2, 0, TWO_PI); ctx.fill();
          break;
        case "gem":
          ctx.fillStyle = PALETTE.yellow; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -18); ctx.lineTo(16, -3); ctx.lineTo(9, 15);
          ctx.lineTo(-9, 15); ctx.lineTo(-16, -3); ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;
        default: // star
          ctx.fillStyle = "#fff"; ctx.strokeStyle = PALETTE.yellow; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 12 : 5;
            const a = -Math.PI / 2 + (i / 10) * TWO_PI;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
      }
      ctx.restore();
    }
  }

  function drawAsteroids(ctx) {
    const { PALETTE } = RR.config;
    for (const a of RR.entities.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      const points = 11;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const ang = (i / points) * TWO_PI;
        // Average radius is now 1.0 * a.r instead of 0.74 * a.r, matching hitbox
        const wob = 1.0 + 0.25 * Math.sin(a.seed + i * 1.74);
        const rr = a.r * wob;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = a.fast ? PALETTE.purple : PALETTE.rock;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = a.fast ? PALETTE.pink : PALETTE.rockEdge;
      ctx.stroke();
      // Crater dots
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#050316";
      for (let c = 0; c < 4; c++) {
        const ang = a.seed + c * 1.9;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * a.r * 0.42, Math.sin(ang) * a.r * 0.38, a.r * (0.10 + (c % 2) * 0.05), 0, TWO_PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function drawBullets(ctx) {
    const { PALETTE } = RR.config;
    for (const b of RR.entities.bullets) {
      ctx.save();
      ctx.globalAlpha = clamp(b.life * 3, 0, 1);
      ctx.fillStyle = PALETTE.cyan;
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBossBullets(ctx) {
    for (const b of RR.bosses.bossBullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(ctx) {
    const live = RR.effects.particlePool.live;
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      const alpha = clamp(p.life * 2.2, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRocket(ctx) {
    const r = RR.entities.rocket;
    const { PALETTE } = RR.config;
    const flicker = RR.state.invincible > 0 && Math.floor(performance.now() / 80) % 2 === 0;
    const phasing = RR.state.phaseTime > 0;
    ctx.save();
    if (flicker) ctx.globalAlpha = 0.45;
    if (phasing) ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 80) * 0.10;
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);

    // Shield ring
    if (r.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(performance.now() / 90) * 0.10;
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 45, 31, 0, 0, TWO_PI);
      ctx.stroke();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = PALETTE.cyan;
      ctx.fill();
      ctx.restore();
    }

    // Magnet aura — visual range matches actual attraction radius (180px)
    if (RR.state.magnetTime > 0) {
      ctx.save();
      const t = performance.now() / 110;
      ctx.strokeStyle = PALETTE.pink;
      ctx.lineWidth = 1.5;
      // Outer ring at the actual gameplay range, plus an inner pulse
      ctx.globalAlpha = 0.14 + Math.sin(t) * 0.05;
      ctx.beginPath(); ctx.arc(0, 0, 180, 0, TWO_PI); ctx.stroke();
      ctx.globalAlpha = 0.22 + Math.sin(t * 1.3) * 0.08;
      ctx.beginPath(); ctx.arc(0, 0, 80 + Math.sin(t * 0.8) * 6, 0, TWO_PI); ctx.stroke();
      ctx.restore();
    }

    // Phase aura
    if (phasing) {
      ctx.save();
      ctx.strokeStyle = PALETTE.purple;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 50, 36, 0, 0, TWO_PI); ctx.stroke();
      ctx.restore();
    }

    // Flame
    const flameLen = r.turbo ? rand(38, 60) : rand(18, 30);
    ctx.fillStyle = r.turbo ? PALETTE.yellow : PALETTE.orange;
    ctx.beginPath();
    ctx.moveTo(-32, -9);
    ctx.lineTo(-32 - flameLen, 0);
    ctx.lineTo(-32, 9);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = r.turbo ? PALETTE.pink : PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(-34, -5);
    ctx.lineTo(-34 - flameLen * 0.6, 0);
    ctx.lineTo(-34, 5);
    ctx.closePath(); ctx.fill();

    // Body
    ctx.fillStyle = "#c8d8ff";
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(12, -17);
    ctx.lineTo(-27, -15);
    ctx.lineTo(-35, 0);
    ctx.lineTo(-27, 15);
    ctx.lineTo(12, 17);
    ctx.closePath(); ctx.fill();

    // Nose
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(12, -17);
    ctx.lineTo(16, 0);
    ctx.lineTo(12, 17);
    ctx.closePath(); ctx.fill();

    // Wings
    ctx.fillStyle = PALETTE.pink;
    ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(-34, -29); ctx.lineTo(-26, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-15,  15); ctx.lineTo(-34,  29); ctx.lineTo(-26,  3); ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath(); ctx.arc(6, -1, 7, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(4, -5, 4, 3);

    // Detail lines
    ctx.strokeStyle = "rgba(5,3,22,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-19, -10); ctx.lineTo(10, -11);
    ctx.moveTo(-22,  10); ctx.lineTo(11,  10);
    ctx.stroke();

    ctx.restore();
  }

  function drawFloatingTexts(ctx) {
    ctx.save();
    ctx.font = "bold 14px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    for (const f of RR.effects.floatingTexts) {
      ctx.globalAlpha = clamp(f.life * 1.6, 0, 1);
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawForeground(ctx) {
    const { W, H, PALETTE } = RR.config;
    const r = RR.entities.rocket;

    // Combo indicator
    if (RR.state.combo > 1 && RR.state.mode !== "menu") {
      ctx.save();
      ctx.font = "bold 13px 'Courier New', Courier, monospace";
      ctx.fillStyle = PALETTE.yellow;
      ctx.globalAlpha = 0.85;
      ctx.fillText(`COMBO ×${RR.state.combo}`, r.x + 4, r.y - 42);
      ctx.restore();
    }
    // Slow-mo border
    if (RR.fx.slowMo > 0) {
      ctx.save();
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 3 + Math.sin(performance.now() / 80) * 1.5;
      ctx.globalAlpha = 0.28;
      ctx.strokeRect(0, 0, W, H);
      ctx.restore();
    }
    // Heat warning bar
    if (r.heat > 0.6) {
      const hw = (r.heat - 0.6) / 0.4;
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 60) * 0.2;
      ctx.fillStyle = PALETTE.orange;
      ctx.fillRect(0, H - 5, W * hw, 5);
      ctx.restore();
    }
    // Ability timers
    drawAbilityTimers(ctx);
  }

  function drawAbilityTimers(ctx) {
    const st = RR.state;
    const items = [];
    if (st.magnetTime > 0)    items.push({ label: "MAG",    t: st.magnetTime,    max: 9, color: RR.config.PALETTE.pink });
    if (st.phaseTime > 0)     items.push({ label: "PHASE",  t: st.phaseTime,     max: 4.5, color: RR.config.PALETTE.purple });
    if (st.multishotTime > 0) items.push({ label: "MULTI",  t: st.multishotTime, max: 8, color: RR.config.PALETTE.orange });
    if (RR.fx.slowMo > 0)     items.push({ label: "SLOW",   t: RR.fx.slowMo,     max: 4.4, color: RR.config.PALETTE.cyan });
    if (!items.length) return;
    const W = RR.config.W;
    const x0 = W - 10, y0 = 10;
    ctx.save();
    ctx.font = "bold 10px 'Courier New', Courier, monospace";
    ctx.textAlign = "right";
    items.forEach((it, i) => {
      const y = y0 + i * 14;
      const w = 90;
      const ratio = clamp(it.t / it.max, 0, 1);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x0 - w, y, w, 10);
      ctx.fillStyle = it.color;
      ctx.fillRect(x0 - w, y, w * ratio, 10);
      ctx.fillStyle = "#fff";
      ctx.fillText(it.label, x0 - 4, y + 9);
    });
    ctx.restore();
  }

  function drawAttractMode(ctx) {
    const { W, H, PALETTE } = RR.config;
    const t = performance.now() / 1000;
    ctx.save();
    const rx = (W * 0.15) + Math.sin(t * 0.4) * 24;
    const ry = (H * 0.72) + Math.cos(t * 0.6) * 14;
    ctx.translate(rx, ry);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(8, -14);
    ctx.lineTo(-22, -12);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-22, 12);
    ctx.lineTo(8, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  RR.render = { frame, rebuildCaches };
})(typeof window !== "undefined" ? window : this);
