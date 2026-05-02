/* Rocket Rush — Config
 * Constants, palette, game tuning, and boss roster.
 * Attaches to global RR namespace (loaded via <script>).
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});

  // Logical render resolution. Real canvas may be larger (DPR/scaling).
  const W = 960;
  const H = 540;

  // Active palette — swapped when map changes. Derived from MAPS[mapId].palette.
  const PALETTE = {
    skyTop:  "#050316",
    skyMid:  "#09062b",
    skyBot:  "#130d3f",
    cyan:    "#36f5ff",
    pink:    "#ff4fd8",
    yellow:  "#ffe45c",
    green:   "#78ff7a",
    orange:  "#ff9a3c",
    red:     "#ff375f",
    purple:  "#b562ff",
    white:   "#fff7e8",
    muted:   "#9da2ff",
    rock:    "#6f6b85",
    rockEdge:"#b8b5c7",
    boss:    "#ff8a3c",
    bossDk:  "#7a2b00",
  };

  // ─── Space Maps ───────────────────────────────────────────────────────────
  // Each map defines its own visual personality. The active map's palette
  // is copied into RR.config.PALETTE at runtime so all renderers see it.
  const MAPS = [
    {
      id: "asteroid-belt",
      name: "Asteroid Belt",
      desc: "The classical frontier — scattered rocks, swirling nebula, timeless.",
      // Visual identity
      palette: {
        skyTop:  "#050316",
        skyMid:  "#09062b",
        skyBot:  "#130d3f",
        nebulaColors: ["#ff4fd8", "#36f5ff", "#b562ff"],
        nebulaCount: 3,
        nebulaBrightness: 0.22,
        starHue: "#fff7e8",   // warm white
        starAccent: "#36f5ff", // cyan tint on close stars
        special: "none",
        auroraColor: null,
        dustColor: null,
        starCountMult: 1.0,
        starTwinkleMult: 1.0,
      },
    },
    {
      id: "nebula-storm",
      name: "Nebula Storm",
      desc: "A plasma tempest — vivid aurora curtains, solar dust, electromagnetic chaos.",
      palette: {
        skyTop:  "#0b0228",
        skyMid:  "#1a0545",
        skyBot:  "#2d0a5e",
        nebulaColors: ["#ff2d78", "#9b59ff", "#00d4ff", "#ff8c00"],
        nebulaCount: 6,
        nebulaBrightness: 0.38,
        starHue: "#e8d4ff",   // lavender white
        starAccent: "#00d4ff", // electric blue accent
        special: "aurora",
        auroraColor: "#00d4ff",
        dustColor: "#ff8c0044",
        starCountMult: 0.7,
        starTwinkleMult: 1.4,
      },
    },
    {
      id: "dark-void",
      name: "Dark Void",
      desc: "The cosmic depths — ancient star nurseries, eerie silence, hidden threats.",
      palette: {
        skyTop:  "#020108",
        skyMid:  "#040215",
        skyBot:  "#080428",
        nebulaColors: ["#1a0038", "#002244", "#001a33"],
        nebulaCount: 1,
        nebulaBrightness: 0.08,
        starHue: "#c8e8ff",   // icy blue-white
        starAccent: "#36f5ff", // teal
        special: "void",
        auroraColor: null,
        dustColor: null,
        starCountMult: 1.8,
        starTwinkleMult: 0.5,
      },
    },
  ];

  // Tunable gameplay values. Centralized so balance is easy.
  const TUNE = {
    rocket: {
      startX: 132,
      homeX: 0.32,               // fraction of W: where rocket gently drifts back to without input
      thrust: 2400,
      thrustTurbo: 3600,
      drag: 0.850,
      dragTurbo: 0.880,
      maxV: 400,
      maxVTurbo: 650,
      forwardBoost: 600,         // forward shove during turbo
      // Boost is a hard-limited meter (0..1). Spend → recharge.
      heatGainTurbo: 0.35,       // ~2.8s of full boost on a fresh tank
      heatCool: 0.32,            // ~3.1s to fully recharge
      heatLockoutBelow: 0.25,    // when overheated, must cool down to this before turbo re-engages
      shieldDecay: 0.2,          // much slower shield decay so it feels like a lasting powerup
      bulletCooldown: 0.18,
      bulletSpeed: 760,
      restoringForce: 1.6,       // soft pull-back to homeX when not boosting (no snap)
    },
    world: {
      // Distance per level. Lower = faster level up.
      distPerLevel: 1100,
      baseScroll: 70,
      scrollPerLevel: 8,
      turboScrollMul: 1.75,      // world appears faster on turbo
    },
    spawn: {
      asteroidBase: 1.05,
      asteroidPerLevel: 0.06,
      asteroidTurboBoost: 0.14,
      pickupMin: 3.4,
      pickupMax: 5.2,
      starMin: 0.55,
      starMax: 1.15,
      lifeAssist: {
        triggerLivesAtOrBelow: 2,
        chanceAtTwoLives: 0.35,
        chanceAtOneLife: 0.65,
        delayTwoLivesMin: 4.2,
        delayTwoLivesMax: 6.2,
        delayOneLifeMin: 2.8,
        delayOneLifeMax: 4.4,
        minCooldown: 13,
      },
    },
    perf: {
      maxParticles: 220,         // hard cap to protect low-end devices
      maxFloatTexts: 24,
      starCount: 96,
      autoLowAtFps: 42,          // auto-enable low-detail under this fps
    },
  };

  // Bosses are loaded by zone content files via RR.registerBossZone(...).
  const BOSSES = [];
  const BOSS_ZONES = {};

  function registerBossZone(zoneId, zoneDef) {
    const id = Number(zoneId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error("registerBossZone requires a positive numeric zoneId");
    }
    if (!zoneDef || !Array.isArray(zoneDef.bosses)) {
      throw new Error("registerBossZone requires a zoneDef with a bosses array");
    }

    const normalizedBosses = zoneDef.bosses
      .slice()
      .sort((a, b) => a.atLevel - b.atLevel)
      .map((boss, idx) => ({
        ...boss,
        zone: boss.zone || id,
        orderInZone: idx + 1,
      }));

    BOSS_ZONES[id] = {
      id,
      key: zoneDef.key || `zone-${id}`,
      name: zoneDef.name || `Zone ${id}`,
      introToast: zoneDef.introToast || "",
      entryLevel: zoneDef.entryLevel || ((id - 1) * 20 + 1),
      wormholeColor: zoneDef.wormholeColor || "",
      bosses: normalizedBosses,
    };
  }

  function rebuildBossRoster() {
    BOSSES.length = 0;
    Object.keys(BOSS_ZONES)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((zoneId) => {
        const zone = BOSS_ZONES[zoneId];
        zone.bosses.forEach((boss) => {
          BOSSES.push({
            ...boss,
            zone: boss.zone || zoneId,
            zoneKey: zone.key,
            zoneName: zone.name,
          });
        });
      });
  }

  // Apply a map's palette into the live PALETTE so all renderers pick it up.
  function applyMapPalette(mapId) {
    const normalizedMapId = Number.isInteger(mapId) && mapId >= 0 && mapId < MAPS.length ? mapId : 0;
    const map = MAPS[normalizedMapId] || MAPS[0];
    RR.config.activeMapId = normalizedMapId;
    const p = map.palette;
    PALETTE.skyTop = p.skyTop;
    PALETTE.skyMid = p.skyMid;
    PALETTE.skyBot = p.skyBot;
    PALETTE._nebulaColors = p.nebulaColors;
    PALETTE._nebulaCount = p.nebulaCount;
    PALETTE._nebulaBrightness = p.nebulaBrightness;
    PALETTE._starHue = p.starHue;
    PALETTE._starAccent = p.starAccent;
    PALETTE._special = p.special;
    PALETTE._auroraColor = p.auroraColor;
    PALETTE._dustColor = p.dustColor;
    PALETTE._starCountMult = p.starCountMult;
    PALETTE._starTwinkleMult = p.starTwinkleMult;
  }

  const BASE_W = W;
  const BASE_H = H;
  const MULTIPLAYER = {
    colors: [
      { id: "cyan", label: "Comet Cyan", value: "#36f5ff" },
      { id: "pink", label: "Nova Pink", value: "#ff4fd8" },
      { id: "green", label: "Ion Green", value: "#78ff7a" },
      { id: "yellow", label: "Solar Yellow", value: "#ffe45c" },
    ],
    canvasByPlayers: {
      2: { w: 960, h: 540, label: "standard" },
      3: { w: 1120, h: 630, label: "medium" },
      4: { w: 1280, h: 720, label: "maximum" },
    },
    difficulty: {
      healthPerExtraPlayer: 0.42,
      damagePerExtraPlayer: 0.22,
      spawnRatePerExtraPlayer: 0.16,
      reviveScoreMultiplier: 2.5,
    },
  };

  function setLogicalSize(width, height) {
    const w = Number(width) || BASE_W;
    const h = Number(height) || BASE_H;
    RR.config.W = w;
    RR.config.H = h;
    if (RR.render && RR.render.rebuildCaches) RR.render.rebuildCaches();
    if (RR.entities && RR.entities.initStars) RR.entities.initStars();
    if (RR.game && RR.game.resize) RR.game.resize();
  }

  function setLogicalSizeForPlayers(count) {
    const players = Math.min(4, Math.max(2, Number(count) || 2));
    const size = MULTIPLAYER.canvasByPlayers[players] || MULTIPLAYER.canvasByPlayers[2];
    setLogicalSize(size.w, size.h);
    return size;
  }

  function resetLogicalSize() {
    setLogicalSize(BASE_W, BASE_H);
  }

  RR.config = {
    W, H,
    BASE_W, BASE_H,
    PALETTE,
    MAPS,
    TUNE,
    MULTIPLAYER,
    BOSSES,
    BOSS_ZONES,
    STORAGE_KEY: "retroRocketRushBestV2",
    LEVEL_FOR_VICTORY: 40,
    // Filled at runtime by render setup:
    scale: 1,
    cssWidth: W,
    cssHeight: H,
    lowDetail: false,
    activeMapId: 0,
    applyMapPalette,
    setLogicalSize,
    setLogicalSizeForPlayers,
    resetLogicalSize,
  };

  RR.registerBossZone = function (zoneId, zoneDef) {
    registerBossZone(zoneId, zoneDef);
    rebuildBossRoster();
  };
  RR.rebuildBossRoster = rebuildBossRoster;
  RR.getBossZone = function (zoneId) {
    return RR.config.BOSS_ZONES[Number(zoneId)] || null;
  };
})(typeof window !== "undefined" ? window : this);
