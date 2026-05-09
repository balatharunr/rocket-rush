/* Rocket Rush — Local Multiplayer Session Model
 * Party, lobby, color, player-count, and scaling rules.
 * Storage: Firebase Realtime Database (primary) + localStorage (fallback/cache).
 */
(function (root) {
  "use strict";
  console.log("[multiplayer.js] START, window.RR:", typeof root.RR, Object.keys(root.RR || {}));
  const RR = (root.RR = root.RR || {});

  const STORAGE_KEY = "rocketRushPartiesV1";
  const NAME_KEY = "rocketRushPlayerName";
  const CLIENT_KEY = "rocketRushClientId";
  const CHANNEL_NAME = "rocketRushParties";
  const FB_PATH = "rocketRush/parties";
  let channel = null;
  let lastJoinSearch = "";
  let fbUnsubscribe = null;

  function clientId() {
    let id = sessionStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = `player-${Date.now()}-${Math.round(Math.random() * 999999)}`;
      sessionStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function getPlayerName() {
    if (!mp().playerName) mp().playerName = localStorage.getItem(NAME_KEY) || "";
    return mp().playerName;
  }

  function setPlayerName(name) {
    const clean = String(name || "").trim().slice(0, 18);
    mp().playerName = clean;
    if (clean) localStorage.setItem(NAME_KEY, clean);
    else localStorage.removeItem(NAME_KEY);
    return clean;
  }

  function hasPlayerName() {
    return !!getPlayerName();
  }

  function mp() {
    return RR.multiplayerState;
  }

  function cloneParty(party) {
    return {
      ...party,
      players: (party.players || []).map((player) => ({ ...player })),
    };
  }

  function normalizeParty(party) {
    const players = Array.isArray(party.players) ? party.players.map((player) => ({
      id: String(player.id || `player-${Date.now()}`),
      name: String(player.name || "Pilot"),
      color: String(player.color || ""),
      dead: !!player.dead,
    })) : [];
    const hostId = String(party.hostId || (players[0] && players[0].id) || "");
    return {
      id: String(party.id || `party-${Date.now()}`),
      name: String(party.name || "Untitled Party").trim(),
      capacity: [2, 3, 4].includes(Number(party.capacity)) ? Number(party.capacity) : 2,
      privacy: party.privacy === "private" ? "private" : "public",
      password: String(party.password || ""),
      hostId,
      started: !!party.started,
      createdAt: Number(party.createdAt) || Date.now(),
      players,
      active: party.active !== false,
    };
  }

  function loadParties() {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (err) {
      saved = [];
    }
    const byName = new Map();
    saved.map(normalizeParty).forEach((party) => {
      if (party.active) byName.set(party.name.toLowerCase(), party);
    });
    mp().parties = Array.from(byName.values()).sort((a, b) => b.createdAt - a.createdAt);
    return mp().parties;
  }

  function saveParties() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mp().parties));
    broadcastSync();
    fbPushParties();
  }

  // ─── Firebase Realtime Database ───────────────────────────────────────────

  function fbApp() {
    return root.RR && root.RR.firebaseApp;
  }

  async function fbDb() {
    const app = fbApp();
    console.log("[fbDb] app:", app);
    if (!app) return null;
    // Use the pre-initialized db from index.html if available
    if (root.RR.firebaseDb) {
      console.log("[fbDb] using pre-initialized db from index.html");
      return root.RR.firebaseDb;
    }
    if (!root.RR._fbDb) {
      try {
        const { getDatabase } = await import("firebase/database");
        root.RR._fbDb = getDatabase(app);
        console.log("[fbDb] created db instance");
      } catch (err) {
        console.error("[fbDb] error:", err);
        return null;
      }
    }
    return root.RR._fbDb;
  }

  async function fbPushParties() {
    try {
      const db = await fbDb();
      console.log("[fbPushParties] db:", db, "parties count:", mp().parties.length);
      if (!db) { console.log("[fbPushParties] no db, skipping"); return; }
      const { ref, set } = await import("firebase/database");
      const dbRef = ref(db, FB_PATH);
      console.log("[fbPushParties] writing to", FB_PATH);
      await set(dbRef, mp().parties);
      console.log("[fbPushParties] done");
    } catch (err) {
      console.error("[fbPushParties] error:", err);
    }
  }

  async function fbPullParties() {
    try {
      const db = await fbDb();
      console.log("[fbPullParties] db:", db);
      if (!db) { console.log("[fbPullParties] no db, skipping"); return; }
      const { ref, get } = await import("firebase/database");
      const dbRef = ref(db, FB_PATH);
      console.log("[fbPullParties] reading from", FB_PATH);
      const snapshot = await get(dbRef);
      console.log("[fbPullParties] snapshot exists:", snapshot.exists());
      if (!snapshot.exists()) return;
      const remoteParties = Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val() || {});
      console.log("[fbPullParties] remote parties:", remoteParties.length);
      const localIds = new Set(mp().parties.map((p) => p.id));
      const remoteNormalized = remoteParties.filter((p) => p && p.active && p.id).map(normalizeParty);
      remoteNormalized.forEach((rp) => { if (!localIds.has(rp.id)) mp().parties.push(rp); });
      mp().parties.sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mp().parties));
      console.log("[fbPullParties] merged, total parties:", mp().parties.length);
    } catch (err) {
      console.error("[fbPullParties] error:", err);
  }

  function fbSubscribe() {
    if (fbUnsubscribe) { fbUnsubscribe(); fbUnsubscribe = null; }
    (async () => {
      try {
        const db = await fbDb();
        console.log("[fbSubscribe] db:", db);
        if (!db) return;
        const { ref, onValue, off } = await import("firebase/database");
        const dbRef = ref(db, FB_PATH);
        console.log("[fbSubscribe] listening on", FB_PATH);
        const handler = (snapshot) => {
          console.log("[fbSubscribe] change received, exists:", snapshot.exists());
          if (!snapshot.exists()) return;
          const remoteParties = Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val() || {});
          const localIds = new Set(mp().parties.map((p) => p.id));
          const remoteNormalized = remoteParties.filter((p) => p && p.active && p.id).map(normalizeParty);
          let changed = false;
          remoteNormalized.forEach((rp) => { if (!localIds.has(rp.id)) { mp().parties.push(rp); changed = true; } });
          if (!changed) return;
          mp().parties.sort((a, b) => b.createdAt - a.createdAt);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mp().parties));
          refreshFromRealtime();
        };
        fbUnsubscribe = () => off(ref(db, FB_PATH), handler);
        onValue(dbRef, handler);
      } catch (err) {
        console.error("[fbSubscribe] error:", err);
      }
    })();
  }

  async function listParties() {
    await fbPullParties();
    loadParties();
    return mp().parties.filter((party) => party.active).sort((a, b) => b.createdAt - a.createdAt);
  }

  async function searchParties(query) {
    const q = String(query || "").trim().toLowerCase();
    const all = await listParties();
    if (!q) return all;
    return all.filter((party) => party.name.toLowerCase().includes(q));
  }

  function networkAvailable() {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  function broadcastSync() {
    if (channel) channel.postMessage({ type: "parties-updated", at: Date.now() });
  }

  function refreshFromRealtime() {
    const activeId = mp().activePartyId;
    loadParties();
    const party = activeId ? findParty(activeId) : null;
    if (activeId && !party) {
      mp().activePartyId = "";
      mp().players = [];
      mp().deadQueue = [];
      RR.state.activePlayerCount = 1;
      if (RR.ui && RR.ui.toast) RR.ui.toast("PARTY CLOSED");
      if (RR.ui && RR.ui.showMenu) RR.ui.showMenu();
      return;
    }
    if (party) {
      mp().players = party.players;
      mp().isHost = party.hostId === clientId();
      RR.state.activePlayerCount = party.players.filter((player) => !player.dead).length || party.players.length;
      if (RR.ui && RR.ui.updateSessionControls) RR.ui.updateSessionControls();
      if (RR.multiplayerState.roomOpen && RR.ui && RR.ui.showLobby) RR.ui.showLobby();
    }
    if (RR.state.mode === "partyMenu" && RR.ui && RR.ui.showJoinPartyList) {
      RR.ui.showJoinPartyList("", lastJoinSearch);
    }
  }

  function initRealtime() {
    console.log("[initRealtime] starting");
    loadParties();
    fbSubscribe();
    console.log("[initRealtime] done");
    if ("BroadcastChannel" in root && !channel) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === "parties-updated") refreshFromRealtime();
      };
    }
    root.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) refreshFromRealtime();
    });
  }

  function findParty(id) {
    loadParties();
    return mp().parties.find((party) => party.id === id) || null;
  }

  function isPartyNameUnique(name, ignoreId, privacy = "public") {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return false;
    const all = mp().parties.filter((party) => party.active);
    return !all.some((party) => {
      if (party.id === ignoreId) return false;
      if (privacy === "public" && party.privacy !== "public") return false;
      return party.name.toLowerCase() === normalized;
    });
  }

  function colorForIndex(index) {
    const colors = RR.config.MULTIPLAYER.colors;
    return colors[index % colors.length].id;
  }

  function createParty({ name, capacity, privacy, password }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return { ok: false, error: "Party name required." };
    if (!isPartyNameUnique(cleanName, null, privacy)) return { ok: false, error: "That public party name is already active." };
    if (privacy === "private" && !String(password || "").trim()) return { ok: false, error: "Private parties need a password." };
    const playerName = getPlayerName();
    if (!playerName) return { ok: false, error: "Set your pilot name first." };
    const id = clientId();
    const party = normalizeParty({
      id: `party-${Date.now()}-${Math.round(Math.random() * 9999)}`,
      name: cleanName,
      capacity,
      privacy,
      password,
      hostId: id,
      createdAt: Date.now(),
      players: [{ id, name: playerName, color: "cyan", dead: false }],
      active: true,
    });
    mp().parties.unshift(party);
    console.log("[createParty] party created:", party.name, party.id, "pushing to firebase");
    saveParties();
    console.log("[createParty] after saveParties, parties in state:", mp().parties.length);
    enterLobby(party.id, true);
    return { ok: true, party };
  }

  function joinParty(id, password) {
    const party = findParty(id);
    const playerName = getPlayerName();
    if (!playerName) return { ok: false, error: "Set your pilot name first." };
    if (!party) return { ok: false, error: "Party no longer exists." };
    if (party.players.length >= party.capacity) return { ok: false, error: "Party is full." };
    if (party.privacy === "private" && party.password !== String(password || "")) {
      return { ok: false, error: "Incorrect password." };
    }
    const localId = clientId();
    if (!party.players.some((player) => player.id === localId)) {
      party.players.push({
        id: localId,
        name: playerName,
        color: firstAvailableColor(party),
        dead: false,
      });
    }
    saveParties();
    enterLobby(party.id, false);
    return { ok: true, party };
  }

  function enterLobby(id, isHost) {
    const party = findParty(id);
    if (!party) return false;
    const state = mp();
    state.activePartyId = party.id;
    state.isHost = !!isHost || party.hostId === clientId();
    state.players = party.players;
    state.selectedColor = (party.players.find((player) => player.id === clientId()) || party.players[0] || {}).color || "";
    state.deadQueue = [];
    state.fadeT = 0;
    state.roomOpen = false;
    RR.state.mode = "lobby";
    RR.state.activePlayerCount = party.players.length;
    RR.config.resetLogicalSize();
    RR.entities.resetRocket();
    RR.entities.clearAll();
    RR.spawn.reset();
    RR.entities.initStars();
    RR.ui.hideOverlay();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    return true;
  }

  function activeParty() {
    return findParty(mp().activePartyId);
  }

  function firstAvailableColor(party) {
    const used = new Set((party.players || []).map((player) => player.color));
    const available = RR.config.MULTIPLAYER.colors.find((color) => !used.has(color.id));
    return available ? available.id : colorForIndex(0);
  }

  function selectColor(colorId) {
    const party = activeParty();
    if (!party) return false;
    const localPlayer = party.players.find((player) => player.id === clientId()) || party.players[0];
    if (!localPlayer) return false;
    const locked = party.players.some((player) => player.id !== localPlayer.id && player.color === colorId);
    if (locked) return false;
    localPlayer.color = colorId;
    mp().selectedColor = colorId;
    saveParties();
    return true;
  }

  function canStart() {
    const party = activeParty();
    return !!party && party.hostId === clientId() && party.players.length >= 2;
  }

  function addLocalGuest() {
    const party = activeParty();
    if (!party || party.players.length >= party.capacity) return false;
    party.players.push({
      id: `remote-${party.players.length + 1}`,
      name: `Guest ${party.players.length + 1}`,
      color: firstAvailableColor(party),
      dead: false,
    });
    RR.state.activePlayerCount = party.players.length;
    saveParties();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    return true;
  }

  function startGameFromLobby() {
    const party = activeParty();
    if (!party || !canStart()) return false;
    party.started = true;
    saveParties();
    RR.state.activePlayerCount = party.players.length;
    mp().fadeT = 1;
    RR.state.mode = "lobbyStart";
    RR.ui.hideOverlay();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    setTimeout(() => {
      if (RR.state.mode !== "lobbyStart") return;
      RR.game.reset({ multiplayer: true, party: cloneParty(party) });
    }, 1000);
    return true;
  }

  function setupGameplayPlayers(party) {
    const source = party || activeParty();
    const players = (source && source.players.length ? source.players : [{ id: "solo", name: "You", color: "cyan", dead: false }])
      .slice(0, 4)
      .map((player, index) => ({
        ...player,
        dead: false,
        x: RR.config.TUNE.rocket.startX,
        y: 0,
        scoreMultiplier: 1,
        joinedAt: Date.now() + index,
      }));
    mp().players = players;
    RR.state.activePlayerCount = players.filter((player) => !player.dead).length;
    RR.config.setLogicalSizeForPlayers(RR.state.activePlayerCount);
    positionPlayers();
  }

  function positionPlayers() {
    const players = mp().players;
    const count = Math.max(1, players.length);
    const gap = RR.config.H / (count + 1);
    players.forEach((player, index) => {
      player.x = RR.config.TUNE.rocket.startX;
      player.y = Math.round(gap * (index + 1));
    });
    if (players[0]) {
      RR.entities.rocket.x = players[0].x;
      RR.entities.rocket.y = players[0].y;
    }
  }

  function markOldestSurvivorDead() {
    const victim = mp().players.find((player) => !player.dead);
    if (!victim) return null;
    victim.dead = true;
    mp().deadQueue.push(victim.id);
    recalculateActivePlayers();
    return victim;
  }

  function reviveFirstDead() {
    const state = mp();
    const firstId = state.deadQueue.shift();
    const target = state.players.find((player) => player.id === firstId) || state.players.find((player) => player.dead);
    if (!target) return null;
    target.dead = false;
    target.x = RR.config.TUNE.rocket.startX;
    target.y = RR.config.H / 2;
    recalculateActivePlayers();
    return target;
  }

  function hasDeadPlayer() {
    return mp().players.some((player) => player.dead);
  }

  function recalculateActivePlayers() {
    RR.state.activePlayerCount = Math.max(1, mp().players.filter((player) => !player.dead).length || 1);
    if (RR.bosses && RR.bosses.rebalanceActiveBoss) RR.bosses.rebalanceActiveBoss();
    return RR.state.activePlayerCount;
  }

  function deleteParty(id) {
    const state = mp();
    state.parties = state.parties.filter((party) => party.id !== id);
    if (state.activePartyId === id) state.activePartyId = "";
    saveParties();
  }

  function canDeleteParty(party) {
    return !!party && party.hostId === clientId();
  }

  function deletePartyByHost(id) {
    const party = findParty(id);
    if (!party) return { ok: false, error: "Party no longer exists." };
    if (!canDeleteParty(party)) return { ok: false, error: "Only the host can delete this party." };
    deleteParty(party.id);
    return { ok: true };
  }

  function removeLocalPlayerFromParty({ deleteHostedParty = false } = {}) {
    const state = mp();
    const party = activeParty();
    if (!party) return;
    if (state.isHost && deleteHostedParty) {
      deleteParty(party.id);
      return;
    }
    const id = clientId();
    party.players = party.players.filter((player) => player.id !== id);
    if (party.players.length === 0) deleteParty(party.id);
    else {
      if (party.hostId === id) party.hostId = party.players[0].id;
      saveParties();
    }
  }

  function leaveActiveSession(options = {}) {
    const inParty = !!activeParty();
    if (inParty) removeLocalPlayerFromParty({ deleteHostedParty: !!options.deleteParty });
    mp().activePartyId = "";
    mp().isHost = false;
    mp().players = [];
    mp().deadQueue = [];
    mp().selectedColor = "";
    mp().fadeT = 0;
    mp().roomOpen = false;
    RR.state.activePlayerCount = 1;
    RR.config.resetLogicalSize();
    if (RR.audio && RR.audio.stopMusic) RR.audio.stopMusic();
    if (RR.entities) {
      RR.entities.clearAll();
      RR.entities.resetRocket();
      RR.entities.initStars();
    }
    if (RR.bosses) RR.bosses.reset();
    if (RR.ui.updateSessionControls) RR.ui.updateSessionControls();
    RR.ui.showMenu();
    return true;
  }

  function difficultyScale(kind) {
    const extra = Math.max(0, (RR.state.activePlayerCount || 1) - 1);
    const cfg = RR.config.MULTIPLAYER.difficulty;
    if (kind === "health") return 1 + extra * cfg.healthPerExtraPlayer;
    if (kind === "damage") return 1 + extra * cfg.damagePerExtraPlayer;
    if (kind === "spawn") return 1 + extra * cfg.spawnRatePerExtraPlayer;
    return 1 + extra * 0.25;
  }

  RR.multiplayer = {
    loadParties,
    saveParties,
    listParties,
    searchParties,
    findParty,
    networkAvailable,
    initRealtime,
    clientId,
    getPlayerName,
    setPlayerName,
    hasPlayerName,
    setLastJoinSearch: (value) => { lastJoinSearch = String(value || ""); },
    isPartyNameUnique,
    createParty,
    joinParty,
    enterLobby,
    activeParty,
    selectColor,
    canStart,
    addLocalGuest,
    startGameFromLobby,
    setupGameplayPlayers,
    positionPlayers,
    markOldestSurvivorDead,
    reviveFirstDead,
    hasDeadPlayer,
    recalculateActivePlayers,
    leaveActiveSession,
    deleteParty,
    deletePartyByHost,
    canDeleteParty,
    difficultyScale,
  };
})(typeof window !== "undefined" ? window : this);
console.log("[multiplayer.js] IIFE complete, RR.multiplayer assigned:", typeof window.RR.multiplayer);
