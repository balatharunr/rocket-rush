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

  function hideOverlay() { RR.dom.overlay.classList.add("hidden"); RR.dom.overlay.classList.remove("room-overlay"); }
  function showOverlay() {
    RR.dom.overlay.classList.remove("hidden", "room-overlay");
    RR.dom.modal.className = "modal";
  }
  function lobbyModeActive() {
    return ["lobby", "lobbyStart", "playing", "bossIntro", "bossFight", "bossDefeated"].includes(RR.state.mode)
      && RR.multiplayerState && !!RR.multiplayerState.activePartyId;
  }

  function updateSessionControls() {
    const inLobby = RR.state.mode === "lobby" || RR.state.mode === "lobbyStart";
    const party = RR.multiplayer && RR.multiplayer.activeParty ? RR.multiplayer.activeParty() : null;
    const multiplayerActive = lobbyModeActive();
    const soloGameplay = !multiplayerActive && ["playing", "bossIntro", "bossFight", "bossDefeated", "wormhole", "warp"].includes(RR.state.mode);
    if (RR.dom.roomBtn) RR.dom.roomBtn.classList.toggle("hidden-control", !lobbyModeActive());
    if (RR.dom.exitBtn) {
      RR.dom.exitBtn.classList.toggle("hidden-control", !multiplayerActive && !soloGameplay);
      RR.dom.exitBtn.textContent = multiplayerActive ? "Exit" : "Pause";
    }
    if (RR.dom.lobbyActions) RR.dom.lobbyActions.classList.toggle("hidden-control", !inLobby || !party);
    if (RR.dom.lobbyStartInlineBtn) {
      RR.dom.lobbyStartInlineBtn.disabled = !party || !RR.multiplayer.canStart() || !RR.multiplayerState.isHost || RR.state.mode === "lobbyStart";
      RR.dom.lobbyStartInlineBtn.textContent = RR.multiplayerState.isHost ? "Start Game" : "Waiting For Host";
    }
  }

  function esc(text) {
    const div = document.createElement("div");
    div.textContent = String(text == null ? "" : text);
    return div.innerHTML;
  }

  function showConfirm({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }) {
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>${esc(title)}</h1>
      <h2>Confirm action</h2>
      <p class="mission">${esc(message)}</p>
      <div class="button-row">
        <button id="confirmYesBtn">${esc(confirmLabel)}</button>
        <button class="secondary" id="confirmNoBtn">${esc(cancelLabel)}</button>
      </div>`;
    document.getElementById("confirmYesBtn").addEventListener("click", () => {
      if (onConfirm) onConfirm();
    });
    document.getElementById("confirmNoBtn").addEventListener("click", () => {
      if (onCancel) onCancel();
      else hideOverlay();
    });
  }

  function showHostExitPrompt() {
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Exit Party</h1>
      <h2>Host controls</h2>
      <p class="mission">Do you want to delete the party for everyone, or leave and promote the next joined player as host?</p>
      <div class="button-row">
        <button id="hostLeaveBtn">Leave Party</button>
        <button class="secondary danger" id="hostDeleteBtn">Delete Party</button>
        <button class="secondary" id="hostCancelBtn">Cancel</button>
      </div>`;
    document.getElementById("hostLeaveBtn").addEventListener("click", () => RR.multiplayer.leaveActiveSession({ deleteParty: false }));
    document.getElementById("hostDeleteBtn").addEventListener("click", () => RR.multiplayer.leaveActiveSession({ deleteParty: true }));
    document.getElementById("hostCancelBtn").addEventListener("click", hideOverlay);
  }

  function ensurePlayerName(next) {
    if (RR.multiplayer.hasPlayerName()) {
      next();
      return;
    }
    showPlayerNamePrompt(next);
  }

  function showPlayerNamePrompt(next, error = "") {
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Pilot Name</h1>
      <h2>Identify your signal</h2>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <form class="party-form compact" id="playerNameForm">
        <label>
          <span>Your Name</span>
          <input id="playerNamePromptInput" maxlength="18" autocomplete="off" value="${esc(RR.multiplayer.getPlayerName())}" required />
        </label>
        <div class="button-row">
          <button type="submit">Continue</button>
          <button type="button" class="secondary" id="playerNameCancelBtn">Cancel</button>
        </div>
      </form>`;
    document.getElementById("playerNameCancelBtn").addEventListener("click", showMenu);
    document.getElementById("playerNameForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const clean = RR.multiplayer.setPlayerName(document.getElementById("playerNamePromptInput").value);
      if (!clean) return showPlayerNamePrompt(next, "Enter a pilot name.");
      next();
    });
  }

  function showMenu() {
    RR.state.mode = "menu";
    if (RR.multiplayerState) RR.multiplayerState.roomOpen = false;
    updateSessionControls();
    showOverlay();
    const muted = RR.audio.isMuted();

    RR.dom.modal.innerHTML = `
      <h1>Rocket Rush</h1>
      <h2>Galactic Threat Edition</h2>

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
        <button id="menuFriendsBtn">Play with Friends</button>
        <button class="secondary muteLabel" id="menuMuteBtn">Sound: ${muted ? "Off" : "On"}</button>
      </div>
      <p class="tip">Tip: <strong>TURBO</strong> makes everything faster — including the danger.</p>`;

    document.getElementById("menuStartBtn").addEventListener("click", () => { RR.audio.ensure(); RR.game.reset(); });
    document.getElementById("menuFriendsBtn").addEventListener("click", () => ensurePlayerName(showPartyMenu));
    document.getElementById("menuMuteBtn").addEventListener("click", RR.game.toggleMute);
  }

  function showPartyMenu(error) {
    RR.state.mode = "partyMenu";
    RR.multiplayer.loadParties();
    updateSessionControls();
    showOverlay();
    const offline = !RR.multiplayer.networkAvailable();
    const playerName = RR.multiplayer.getPlayerName();
    RR.dom.modal.innerHTML = `
      <h1>Squad Link</h1>
      <h2>Party staging</h2>
      <p class="network-note">${offline ? "Network connection required for real-time friend multiplayer." : "Real-time friend multiplayer requires network access."}</p>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <label class="player-name-field">
        <span>Pilot</span>
        <input id="playerNameInlineInput" maxlength="18" autocomplete="off" value="${esc(playerName)}" />
      </label>
      <div class="party-actions">
        <button class="party-big" id="createPartyBtn" ${offline ? "disabled" : ""}>Create Party</button>
        <button class="party-big secondary" id="joinPartyBtn" ${offline ? "disabled" : ""}>Join Party</button>
      </div>
      <div class="button-row">
        <button class="secondary" id="partyBackBtn">Title Screen</button>
      </div>`;
    document.getElementById("createPartyBtn").addEventListener("click", showCreatePartyForm);
    document.getElementById("joinPartyBtn").addEventListener("click", showJoinPartyList);
    document.getElementById("partyBackBtn").addEventListener("click", showMenu);
    document.getElementById("playerNameInlineInput").addEventListener("change", (e) => {
      RR.multiplayer.setPlayerName(e.target.value);
      showPartyMenu();
    });
  }

  function showCreatePartyForm(error) {
    RR.state.mode = "partyMenu";
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Create Party</h1>
      <h2>Open a pre-game lobby</h2>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <form class="party-form" id="createPartyForm">
        <label>
          <span>Party Name</span>
          <input id="partyNameInput" name="partyName" maxlength="24" autocomplete="off" required />
          <small id="partyNameStatus">Must be unique among active public lobbies.</small>
        </label>
        <label>
          <span>Capacity</span>
          <select id="partyCapacityInput" name="capacity">
            <option value="2">2 Players</option>
            <option value="3">3 Players</option>
            <option value="4">4 Players</option>
          </select>
        </label>
        <label>
          <span>Privacy</span>
          <span class="privacy-toggle">
            <span>Public</span>
            <input id="partyPrivacyInput" type="checkbox" />
            <span>Private</span>
          </span>
        </label>
        <label class="hidden-field" id="partyPasswordField">
          <span>Password</span>
          <input id="partyPasswordInput" name="password" maxlength="20" autocomplete="off" />
        </label>
        <div class="button-row">
          <button type="submit">Enter Lobby</button>
          <button type="button" class="secondary" id="createBackBtn">Back</button>
        </div>
      </form>`;

    const nameInput = document.getElementById("partyNameInput");
    const status = document.getElementById("partyNameStatus");
    const privacy = document.getElementById("partyPrivacyInput");
    const passwordField = document.getElementById("partyPasswordField");
    nameInput.addEventListener("input", () => {
      const unique = RR.multiplayer.isPartyNameUnique(nameInput.value, null, privacy.checked ? "private" : "public");
      status.textContent = unique ? "Name available." : "Name already in use.";
      status.className = unique ? "ok" : "bad";
    });
    privacy.addEventListener("change", () => {
      passwordField.classList.toggle("hidden-field", !privacy.checked);
      nameInput.dispatchEvent(new Event("input"));
    });
    document.getElementById("createBackBtn").addEventListener("click", showPartyMenu);
    document.getElementById("createPartyForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const result = RR.multiplayer.createParty({
        name: nameInput.value,
        capacity: Number(document.getElementById("partyCapacityInput").value),
        privacy: privacy.checked ? "private" : "public",
        password: document.getElementById("partyPasswordInput").value,
      });
      if (!result.ok) showCreatePartyForm(result.error);
    });
  }

  function showJoinPartyList(error, search = "") {
    RR.state.mode = "partyMenu";
    if (RR.multiplayer.setLastJoinSearch) RR.multiplayer.setLastJoinSearch(search);
    showOverlay();
    const parties = RR.multiplayer.searchParties(search);
    const rows = parties.length ? parties.map((party) => {
      const canDelete = RR.multiplayer.canDeleteParty && RR.multiplayer.canDeleteParty(party);
      return `
      <div class="party-card">
        <span>
          <strong>${esc(party.name)}</strong>
          <small>${party.players.length}/${party.capacity} pilots · ${party.privacy}</small>
        </span>
        <span class="party-card-actions">
          <button class="party-chip ${party.privacy === "private" ? "private" : ""}" data-party-id="${esc(party.id)}">${party.privacy === "private" ? "Password" : "Join"}</button>
          ${canDelete ? `<button class="party-chip delete" data-delete-party-id="${esc(party.id)}">Delete</button>` : ""}
        </span>
      </div>`;
    }).join("") : "<p class=\"mission\">No active network parties found.</p>";

    RR.dom.modal.innerHTML = `
      <h1>Join Party</h1>
      <h2>Recent active lobbies</h2>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <label class="search-field">
        <span>Search Party Name</span>
        <input id="partySearchInput" value="${esc(search)}" autocomplete="off" />
      </label>
      <div class="party-list">${rows}</div>
      <div class="button-row">
        <button class="secondary" id="joinBackBtn">Back</button>
      </div>`;
    document.getElementById("joinBackBtn").addEventListener("click", showPartyMenu);
    document.getElementById("partySearchInput").addEventListener("input", (e) => {
      showJoinPartyList("", e.target.value);
      const input = document.getElementById("partySearchInput");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    RR.dom.modal.querySelectorAll("[data-party-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const party = RR.multiplayer.findParty(button.dataset.partyId);
        if (!party) return showJoinPartyList("Party no longer exists.");
        if (party.privacy === "private") return showPasswordPrompt(party.id);
        const result = RR.multiplayer.joinParty(party.id);
        if (!result.ok) showJoinPartyList(result.error);
      });
    });
    RR.dom.modal.querySelectorAll("[data-delete-party-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const party = RR.multiplayer.findParty(button.dataset.deletePartyId);
        if (!party) return showJoinPartyList("Party no longer exists.", search);
        showConfirm({
          title: "Delete Party",
          message: `Delete ${party.name} for everyone?`,
          confirmLabel: "Delete",
          onConfirm: () => {
            const result = RR.multiplayer.deletePartyByHost(party.id);
            if (!result.ok) showJoinPartyList(result.error, search);
            else showJoinPartyList("", search);
          },
          onCancel: () => showJoinPartyList("", search),
        });
      });
    });
  }

  function showPasswordPrompt(partyId, error) {
    const party = RR.multiplayer.findParty(partyId);
    if (!party) return showJoinPartyList("Party no longer exists.");
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Private Party</h1>
      <h2>${esc(party.name)}</h2>
      ${error ? `<p class="form-error">${esc(error)}</p>` : ""}
      <form class="party-form compact" id="passwordForm">
        <label>
          <span>Password</span>
          <input id="joinPasswordInput" type="password" maxlength="20" autocomplete="off" />
        </label>
        <div class="button-row">
          <button type="submit">Join</button>
          <button type="button" class="secondary" id="passwordBackBtn">Back</button>
        </div>
      </form>`;
    document.getElementById("passwordBackBtn").addEventListener("click", showJoinPartyList);
    document.getElementById("passwordForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const result = RR.multiplayer.joinParty(party.id, document.getElementById("joinPasswordInput").value);
      if (!result.ok) showPasswordPrompt(party.id, result.error);
    });
  }

  function showLobby() {
    const party = RR.multiplayer.activeParty();
    if (!party) return showPartyMenu("Lobby no longer exists.");
    const inPregame = RR.state.mode === "lobby" || RR.state.mode === "lobbyStart";
    if (!lobbyModeActive()) RR.state.mode = "lobby";
    RR.multiplayerState.roomOpen = true;
    updateSessionControls();
    showOverlay();
    const usedColors = new Set(party.players.map((player) => player.color));
    const local = party.players.find((player) => player.id === RR.multiplayer.clientId()) || party.players[0];
    const colorButtons = RR.config.MULTIPLAYER.colors.map((color) => {
      const locked = usedColors.has(color.id) && local.color !== color.id;
      const selected = local.color === color.id;
      return `
        <button class="color-choice ${selected ? "selected" : ""}" data-color-id="${color.id}" ${locked ? "disabled" : ""}>
          <span class="swatch" style="background:${color.value}"></span>
          <span>${color.label}</span>
          ${locked ? "<small>Locked</small>" : ""}
        </button>`;
    }).join("");
    const roster = party.players.map((player) => {
      const color = RR.config.MULTIPLAYER.colors.find((item) => item.id === player.color);
      const suffix = player.id === RR.multiplayer.clientId() ? " (you)" : (player.id === party.hostId ? " (host)" : "");
      return `<li><span class="swatch" style="background:${color ? color.value : "#fff"}"></span>${esc(player.name)}${suffix}</li>`;
    }).join("");
    const canStart = RR.multiplayer.canStart();

    RR.dom.modal.innerHTML = `
      <h1>Waiting Room</h1>
      <h2>${esc(party.name)}</h2>
      <p class="mission">Players: <strong>${party.players.length}/${party.capacity}</strong></p>
      <div class="lobby-grid">
        <section>
          <div class="map-label">Rocket color</div>
          <div class="color-grid">${colorButtons}</div>
        </section>
        <section>
          <div class="map-label">Roster</div>
          <ul class="party-roster">${roster}</ul>
        </section>
      </div>
      <div class="button-row">
        ${inPregame ? `<button id="startLobbyBtn" ${canStart && RR.multiplayerState.isHost ? "" : "disabled"}>${RR.multiplayerState.isHost ? "Start Game" : "Waiting For Host"}</button>` : ""}
        <button class="secondary" id="closeLobbyBtn">Close Room</button>
      </div>`;

    RR.dom.modal.querySelectorAll(".color-choice").forEach((button) => {
      button.addEventListener("click", () => {
        RR.multiplayer.selectColor(button.dataset.colorId);
        showLobby();
      });
    });
    const startLobbyBtn = document.getElementById("startLobbyBtn");
    if (startLobbyBtn) startLobbyBtn.addEventListener("click", () => {
      if (!RR.multiplayer.startGameFromLobby()) toast("NEED 2 PLAYERS");
    });
    document.getElementById("closeLobbyBtn").addEventListener("click", () => {
      RR.multiplayerState.roomOpen = false;
      hideOverlay();
    });
  }

  function showPause() {
    showOverlay();
    RR.dom.modal.innerHTML = `
      <h1>Paused</h1>
      <h2>Systems holding orbit</h2>
      <p class="mission">Take a breath, pilot. Press <kbd>P</kbd> to resume.</p>
      <div class="button-row">
        <button id="resumeBtn">Resume</button>
        <button class="secondary" id="menuBtn">Return To Title Screen</button>
      </div>`;
    document.getElementById("resumeBtn").addEventListener("click", RR.game.resume);
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
    showMenu, showPartyMenu, showCreatePartyForm, showJoinPartyList, showPasswordPrompt, showLobby,
    showPause, showGameOver, showVictory, showComingSoon,
    hideOverlay, showOverlay, updateSessionControls,
    showConfirm, showHostExitPrompt, ensurePlayerName,
  };
})(typeof window !== "undefined" ? window : this);
