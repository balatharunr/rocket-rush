/* Rocket Rush — Game
 * Lifecycle (init/reset/pause/resume/end/victory), main loop, resize.
 * Wires everything together and is the single boot entry point.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { pad } = RR.utils;

  let lastTime = 0;
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;
  let bootDone = false;

  // ───── Boot ─────
  function boot() {
    if (bootDone) return;
    bootDone = true;
    RR.bindDom();
    RR.loadBest();
    RR.input.bind();
    RR.audio.setMuted(false);

    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 80));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && RR.state.mode === "playing") pause();
    });
    const exitBtn = document.getElementById("exitBtn");
    if (exitBtn) exitBtn.addEventListener("click", () => {
      const inMultiplayer = RR.multiplayerState && RR.multiplayerState.activePartyId;
      if (inMultiplayer && RR.multiplayer && RR.multiplayer.leaveActiveSession) {
        if (RR.multiplayerState.isHost) {
          RR.ui.showHostExitPrompt();
        } else {
          RR.ui.showConfirm({
            title: "Exit Party",
            message: "Leave this multiplayer session?",
            confirmLabel: "Exit",
            onConfirm: () => RR.multiplayer.leaveActiveSession(),
          });
        }
        return;
      }
      if (RR.state.mode === "playing" || RR.state.mode === "bossIntro" || RR.state.mode === "bossFight" || RR.state.mode === "bossDefeated" || RR.state.mode === "wormhole" || RR.state.mode === "warp") {
        pause();
        return;
      }
      RR.ui.showMenu();
    });
    if (RR.dom.roomBtn) RR.dom.roomBtn.addEventListener("click", RR.ui.showLobby);
    if (RR.dom.lobbyStartInlineBtn) RR.dom.lobbyStartInlineBtn.addEventListener("click", () => {
      if (RR.multiplayer && !RR.multiplayer.startGameFromLobby()) RR.ui.toast("NEED 2 PLAYERS");
    });

    // Apply default map palette before first render
    RR.config.applyMapPalette(RR.state.mapId);
    resize();
    RR.entities.initStars();
    RR.bosses.reset();
    RR.ui.hudUpdate();
    RR.ui.showMenu();
    if (RR.multiplayer && RR.multiplayer.initRealtime) RR.multiplayer.initRealtime();

    requestAnimationFrame(loop);
  }

  // ───── Resize / DPR ─────
  function resize() {
    const cfg = RR.config;
    const canvas = RR.dom.canvas;
    const wrap = RR.dom.wrap;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(180, Math.floor(rect.height));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const bw = Math.floor(cssW * dpr);
    const bh = Math.floor(cssH * dpr);
    if (canvas.width !== bw)  canvas.width  = bw;
    if (canvas.height !== bh) canvas.height = bh;
    cfg.cssWidth = cssW;
    cfg.cssHeight = cssH;
    // Letterbox if aspect doesn't match logical 16/9 — pick scale that fits.
    const sx = bw / cfg.W;
    const sy = bh / cfg.H;
    cfg.scale = Math.min(sx, sy);
    cfg.offsetX = (bw - cfg.W * cfg.scale) / 2;
    cfg.offsetY = (bh - cfg.H * cfg.scale) / 2;
    if (RR.render && RR.render.rebuildCaches) RR.render.rebuildCaches();
  }

  // ───── Lifecycle ─────
  function reset(options = {}) {
    const st = RR.state;
    if (!options.multiplayer && RR.config.resetLogicalSize) {
      RR.config.resetLogicalSize();
      st.activePlayerCount = 1;
    }
    st.mode = "playing";
    st.score = 0;
    st.lives = 5;
    st.zone = 1;
    st.level = 1;
    st.distance = 0;
    st.combo = 0;
    st.comboTimer = 0;
    st.invincible = 2.3;
    st.elapsed = 0;
    st.bombs = 1;
    st.magnetTime = 0;
    st.phaseTime = 0;
    st.multishotTime = 0;
    st.bossIndex = -1;
    st.bossPhase = 0;
    st.wormholeT = 0;
    st.wormholeDestZone = 0;
    st.warpT = 0;
    RR.fx.shake = 0; RR.fx.flash = 0; RR.fx.slowMo = 0;
    RR.config.applyMapPalette(st.mapId);
    if (options.multiplayer && RR.multiplayer) RR.multiplayer.setupGameplayPlayers(options.party);
    RR.entities.resetRocket();
    if (options.multiplayer && RR.multiplayer) RR.multiplayer.positionPlayers();
    RR.entities.clearAll();
    RR.entities.initStars();
    RR.effects.clear();
    RR.spawn.reset();
    RR.bosses.reset();
    RR.ui.hideOverlay();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    RR.ui.hudUpdate();
    RR.ui.toast("MISSION START");
    RR.audio.sfx.start();
    RR.audio.startMusic();
    lastTime = 0;
  }

  function pause() {
    if (RR.state.mode !== "playing") return;
    RR.state.mode = "paused";
    RR.audio.sfx.pause();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    RR.ui.showPause();
  }

  function resume() {
    if (RR.state.mode !== "paused") return;
    RR.state.mode = "playing";
    RR.ui.hideOverlay();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    lastTime = performance.now();
    RR.ui.toast("RESUME");
  }

  function togglePause() {
    if (RR.state.mode === "playing") pause();
    else if (RR.state.mode === "paused") resume();
  }

  function toggleMute() {
    const next = !RR.audio.isMuted();
    RR.audio.setMuted(next);
    if (!next) RR.audio.startMusic();
    document.querySelectorAll(".muteLabel").forEach((el) => {
      el.textContent = `Sound: ${next ? "Off" : "On"}`;
    });
    RR.ui.toast(next ? "SOUND OFF" : "SOUND ON");
  }

  function end() {
    const st = RR.state;
    st.mode = "gameover";
    if (st.score > st.best) { st.best = st.score | 0; RR.saveBest(); }
    RR.ui.hudUpdate();
    RR.effects.boom(RR.entities.rocket.x, RR.entities.rocket.y, 36, RR.config.PALETTE.red);
    RR.audio.sfx.death();
    RR.audio.stopMusic();
    setTimeout(() => RR.ui.showGameOver(), 1100);
  }

  function victory() {
    const st = RR.state;
    st.mode = "victory";
    if (st.score > st.best) { st.best = st.score | 0; RR.saveBest(); }
    RR.audio.stopMusic();
    RR.audio.sfx.victory();
    setTimeout(() => RR.ui.showVictory(), 1100);
  }

  function comingSoon() {
    const st = RR.state;
    st.mode = "comingSoon";
    if (st.score > st.best) { st.best = st.score | 0; RR.saveBest(); }
    RR.audio.stopMusic();
    RR.audio.sfx.victory();
    setTimeout(() => RR.ui.showComingSoon(), 900);
  }

  // ───── Score ─────
  function addScore(amount, label, x, y, color) {
    const st = RR.state;
    const boost = 1 + Math.min(st.combo, 8) * 0.08;
    const gained = Math.round(amount * boost);
    st.score += gained;
    if (gained > 0) RR.effects.showFloating(`+${gained}${label ? " " + label : ""}`, x, y, color || RR.config.PALETTE.yellow);
    if (st.score > st.best) RR.dom.best.textContent = pad(st.score);
  }

  // ───── Update ─────
  function update(dt) {
    const st = RR.state;
    if (st.mode === "lobby" || st.mode === "lobbyStart") {
      const gdt = dt;
      RR.entities.updateRocket(dt);
      RR.entities.updateStars(dt, gdt);
      RR.entities.updateAsteroids(dt, gdt);
      RR.entities.updateBullets(dt, gdt);
      if (RR.spawn.updateLobby) RR.spawn.updateLobby(dt, gdt);
      RR.effects.update(dt);
      if (st.mode === "lobbyStart" && RR.multiplayerState) {
        RR.multiplayerState.fadeT = Math.max(0, RR.multiplayerState.fadeT - dt);
      }
      RR.ui.hudUpdate();
      return;
    }

    if (st.mode !== "playing" && st.mode !== "bossIntro" && st.mode !== "bossFight" && st.mode !== "bossDefeated" && st.mode !== "wormhole" && st.mode !== "warp") {
      // Still tick effects so background animates on menu.
      RR.effects.update(dt);
      return;
    }

    // Time scale: slow-mo affects everything except UI smoothing.
    const timeScale = RR.fx.slowMo > 0 ? 0.55 : 1;
    const gdt = dt * timeScale;

    st.elapsed += dt;

    // Level progression — paused during boss fight & intro.
    if (st.mode === "playing") {
      st.distance += gdt * (RR.config.TUNE.world.baseScroll + st.level * RR.config.TUNE.world.scrollPerLevel) * RR.entities.worldScrollMul();
      const nextLevel = 1 + Math.floor(st.distance / RR.config.TUNE.world.distPerLevel);
      if (nextLevel > st.level && nextLevel <= RR.config.LEVEL_FOR_VICTORY) {
        st.level = nextLevel;
        RR.fx.levelToastCooldown = 1.2;
        RR.ui.toast(`LEVEL ${String(st.level).padStart(2, "0")}`);
        addScore(500 + st.level * 80, "LEVEL", RR.entities.rocket.x + 12, RR.entities.rocket.y - 32, RR.config.PALETTE.green);
        RR.audio.sfx.levelUp();
        RR.bosses.maybeTrigger();
      }
    }

    const inTransition = st.mode === "wormhole" || st.mode === "warp";
    if (st.mode === "warp") {
      RR.fx.motionLines = 1;
      RR.entities.updateStars(dt, gdt * 6);
    } else {
      RR.entities.updateRocket(dt);
      RR.entities.updateStars(dt, gdt);
    }
    if (!inTransition) {
      RR.entities.updateAsteroids(dt, gdt);
      RR.entities.updateBullets(dt, gdt);
      RR.entities.updatePickups(dt, gdt);
      RR.spawn.update(dt, gdt);
    }
    RR.bosses.update(dt, gdt);
    RR.effects.update(dt);

    // Passive score & idle bonuses.
    if (st.mode === "playing" || st.mode === "bossFight") {
      st.score += dt * (10 + st.level * 3 + (RR.entities.rocket.turbo ? 12 : 0));
    }

    RR.ui.hudUpdate();
  }

  // ───── Loop ─────
  function loop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const rawDt = timestamp - lastTime;
    lastTime = timestamp;
    const dt = Math.min(rawDt / 1000, 0.05);

    // FPS sampling — used for low-detail auto switch.
    fpsAcc += rawDt;
    fpsFrames++;
    fpsTimer += rawDt;
    if (fpsTimer >= 1000) {
      const fps = (fpsFrames * 1000) / fpsAcc;
      RR.state.fps = fps;
      fpsAcc = 0; fpsFrames = 0; fpsTimer = 0;
      // Auto-toggle low-detail mode if sustained low FPS.
      if (!RR.config.lowDetail && fps < RR.config.TUNE.perf.autoLowAtFps) {
        RR.config.lowDetail = true;
        RR.entities.initStars();
        RR.ui.toast("LOW-DETAIL MODE");
      }
    }

    update(dt);
    RR.render.frame();
    requestAnimationFrame(loop);
  }

  RR.game = {
    boot, reset, pause, resume, togglePause, toggleMute, end, victory, comingSoon, addScore, resize,
  };
})(typeof window !== "undefined" ? window : this);
