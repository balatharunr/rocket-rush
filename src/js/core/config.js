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

  // Boss progression — Spread out every 4 levels for a longer build-up.
  // Diverse space themes: Rocks, Aliens, Tech, Cosmic Anomalies.
  const BOSSES = [
    { id: "bouldron",   type: "rock",      atLevel: 4,  name: "LORD BOULDRON",    title: "Patriarch Of The Belt",     taunt: "BOULDRON WILL CRUSH YOU!",         hp: 45,  color: PALETTE.orange },
    { id: "saucer",     type: "ufo",       atLevel: 8,  name: "ZETA SAUCER",      title: "Extraterrestrial Scout",    taunt: "PROBING INITIATED...",             hp: 75,  color: PALETTE.green },
    { id: "station",    type: "tech",      atLevel: 12, name: "ORBITAL BASTION",  title: "Automated Defense Matrix",  taunt: "UNAUTHORIZED VESSEL DETECTED.",    hp: 110, color: PALETTE.cyan },
    { id: "anomaly",    type: "cosmic",    atLevel: 16, name: "THE ANOMALY",      title: "Sentient Gravity Well",     taunt: "EMBRACE THE VOID.",                hp: 160, color: PALETTE.purple },
    { id: "mothership", type: "dread",     atLevel: 20, name: "XENON DREADNOUGHT",title: "The Final Threat",          taunt: "YOUR JOURNEY ENDS HERE.",          hp: 250, color: PALETTE.red, final: true },
  ];

  // Apply a map's palette into the live PALETTE so all renderers pick it up.
  function applyMapPalette(mapId) {
    const map = MAPS[mapId] || MAPS[0];
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

  RR.config = {
    W, H,
    PALETTE,
    TUNE,
    BOSSES,
    MAPS,
    STORAGE_KEY: "retroRocketRushBestV2",
    LEVEL_FOR_VICTORY: 20,
    // Filled at runtime by render setup:
    scale: 1,
    cssWidth: W,
    cssHeight: H,
    lowDetail: false,
    activeMapId: 0,
    applyMapPalette,
  };
})(typeof window !== "undefined" ? window : this);
