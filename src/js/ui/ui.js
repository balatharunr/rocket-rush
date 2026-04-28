/* Rocket Rush — UI
 * HUD updates, overlay menus, toast notifications.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { pad, clamp } = RR.utils;

  let toastTimer = null;

  function hudUpdate() {
    const st = RR.state;
    const r = RR.entities.rocket;
    RR.dom.score.textContent  = pad(st.score);
    RR.dom.best.textContent   = pad(st.best);
    RR.dom.lives.textContent  = "♥".repeat(Math.max(0, st.lives)) || "---";
    RR.dom.level.textContent  = String(st.level).padStart(2, "0");
    RR.dom.shield.textContent = String(Math.round(clamp(r.shield, 0, 100))).padStart(3, "0") + "%";
    if (RR.dom.bombs) RR.dom.bombs.textContent = String(st.bombs).padStart(2, "0");
    
    const boostStat = document.querySelector(".boost-stat");
    const boostVal = document.getElementById("boost");
    const boostFill = document.getElementById("boost-fill");
    if (boostStat && boostVal && boostFill) {
      const pct = Math.round((1 - r.heat) * 100);
      boostVal.textContent = pct + "%";
      boostFill.style.width = pct + "%";
      if (r.overheated) boostStat.classList.add("overheated");
      else boostStat.classList.remove("overheated");
    }
  }

  function toast(text) {
    const el = RR.dom.toast;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1300);
  }

  function hideOverlay() { RR.dom.overlay.classList.add("hidden"); }
  function showOverlay() { RR.dom.overlay.classList.remove("hidden"); }

  function showMenu() {
    RR.state.mode = "menu";
    showOverlay();
    const muted = RR.audio.isMuted();
    const maps = RR.config.MAPS;
    const selectedMapId = RR.state.mapId;

    // Build map selector HTML
    const mapCardsHtml = maps.map((m, i) => `
      <div class="map-card${i === selectedMapId ? ' selected' : ''}" data-map-id="${i}">
        <div class="map-name">${m.name}</div>
        <div class="map-desc">${m.desc}</div>
      </div>
    `).join("");

    RR.dom.modal.innerHTML = `
      <h1>Rocket Rush</h1>
      <h2>Galactic Threat Edition</h2>

      <!-- Map Selection -->
      <div class="map-selector">
        <div class="map-label">SELECT ZONE</div>
        <div class="map-grid">${mapCardsHtml}</div>
      </div>

      <p class="mission">Pilot the Starling-7 into the outer belt. Dodge, blast, and bomb your way past <strong>5 Cosmic Threats</strong> to face the ultimate entity, the <strong>Xenon Dreadnought</strong>.</p>
      <div class="kbd-grid">
        <div class="key-card"><kbd>↑</kbd><kbd>W</kbd><span>Thrust up</span></div>
        <div class="key-card"><kbd>↓</kbd><kbd>S</kbd><span>Thrust down</span></div>
        <div class="key-card"><kbd>←</kbd><kbd>A</kbd><span>Slow left</span></div>
        <div class="key-card"><kbd>→</kbd><kbd>D</kbd><span>Push right</span></div>
        <div class="key-card"><kbd>Space</kbd><span>TURBO BURN</span></div>
        <div class="key-card"><kbd>J</kbd><kbd>Z</kbd><kbd>LMB</kbd><span>Pulse cannon</span></div>
        <div class="key-card"><kbd>B</kbd><kbd>X</kbd><kbd>RMB</kbd><span>Drop bomb</span></div>
        <div class="key-card"><kbd>P</kbd><kbd>M</kbd><kbd>R</kbd><span>Pause / Mute / Restart</span></div>
      </div>
      <p>
        <strong style="color:var(--green)">Shield</strong> ·
        <strong style="color:var(--cyan)">Slow-mo</strong> ·
        <strong style="color:var(--yellow)">Bomb</strong> ·
        <strong style="color:var(--red)">Life</strong> ·
        <strong style="color:var(--pink)">Magnet</strong> ·
        <strong style="color:var(--purple)">Phase</strong> ·
        <strong style="color:var(--orange)">Multi-shot</strong>
      </p>
      <div class="button-row">
        <button id="menuStartBtn">Start Mission</button>
        <button class="secondary muteLabel" id="menuMuteBtn">Sound: ${muted ? "Off" : "On"}</button>
      </div>
      <p class="tip">Tip: <strong>TURBO</strong> makes everything faster — including the danger.</p>`;

    // Map selection logic
    document.querySelectorAll(".map-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.mapId, 10);
        RR.state.mapId = id;
        RR.config.applyMapPalette(id);
        RR.entities.initStars();
        RR.render.rebuildCaches();
        // Update visual selection
        document.querySelectorAll(".map-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        RR.ui.toast(maps[id].name.toUpperCase());
      });
    });

    document.getElementById("menuStartBtn").addEventListener("click", () => { RR.audio.ensure(); RR.game.reset(); });
    document.getElementById("menuMuteBtn").addEventListener("click", RR.game.toggleMute);
  }

  function showPause() {
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Paused</h1>
      <h2>Systems holding orbit</h2>
      <p class="mission">Take a breath, pilot. Press <kbd>P</kbd> to resume.</p>
      <div class="button-row">
        <button id="resumeBtn">Resume</button>
        <button class="secondary" id="restartBtn">Restart</button>
        <button class="secondary" id="menuBtn">Title Screen</button>
      </div>`;
    document.getElementById("resumeBtn").addEventListener("click", RR.game.resume);
    document.getElementById("restartBtn").addEventListener("click", RR.game.reset);
    document.getElementById("menuBtn").addEventListener("click", showMenu);
  }

  function showGameOver() {
    showOverlay();
    const st = RR.state;
    const newBest = st.score >= st.best && st.score > 0;
    RR.dom.modal.innerHTML = `
      <h1>${newBest ? "New Record" : "Game Over"}</h1>
      <h2>${newBest ? "You burned your name into the stars" : "The belt claims another rocket"}</h2>
      <p class="mission">Final score: <strong>${pad(st.score)}</strong> · Level reached: <strong>${String(st.level).padStart(2,"0")}</strong> · Best: <strong>${pad(st.best)}</strong></p>
      <p>Collect shields early, save bombs for boss waves, and remember: turbo is faster <em>but spawns more chaos</em>.</p>
      <div class="button-row">
        <button id="againBtn">Fly Again</button>
        <button class="secondary" id="menuBtn">Title Screen</button>
      </div>`;
    document.getElementById("againBtn").addEventListener("click", RR.game.reset);
    document.getElementById("menuBtn").addEventListener("click", showMenu);
  }

  function showVictory() {
    showOverlay();
    const st = RR.state;
    if (st.score > st.best) { st.best = st.score | 0; RR.saveBest(); }
    RR.dom.modal.innerHTML = `
      <h1 class="victory">VICTORY</h1>
      <h2>The Galaxy is safe once more</h2>
      <p class="mission">The Xenon Dreadnought has been shattered into star dust. Final score: <strong>${pad(st.score)}</strong> · Best: <strong>${pad(st.best)}</strong></p>
      <p>You are now the legend the asteroid belt warns its children about.</p>
      <div class="button-row">
        <button id="againBtn">Fly Again</button>
        <button class="secondary" id="menuBtn">Title Screen</button>
      </div>`;
    document.getElementById("againBtn").addEventListener("click", RR.game.reset);
    document.getElementById("menuBtn").addEventListener("click", showMenu);
  }

  function showComingSoon() {
    showOverlay();
    const st = RR.state;
    if (st.score > st.best) { st.best = st.score | 0; RR.saveBest(); }
    RR.dom.modal.innerHTML = `
      <h1 class="victory">ZONE 3</h1>
      <h2>Signal locked... but the gate is still under construction</h2>
      <p class="mission">You cleared Zone 2 and survived the Chrono Kraken. Final score: <strong>${pad(st.score)}</strong> · Best: <strong>${pad(st.best)}</strong></p>
      <p>The next cosmic sector is booting soon. Expect stranger bosses, meaner patterns, and very questionable space physics.</p>
      <div class="button-row">
        <button id="againBtn">Fly Again</button>
        <button class="secondary" id="menuBtn">Title Screen</button>
      </div>`;
    document.getElementById("againBtn").addEventListener("click", RR.game.reset);
    document.getElementById("menuBtn").addEventListener("click", showMenu);
  }

  RR.ui = {
    hudUpdate, toast,
    showMenu, showPause, showGameOver, showVictory, showComingSoon,
    hideOverlay, showOverlay,
  };
})(typeof window !== "undefined" ? window : this);
