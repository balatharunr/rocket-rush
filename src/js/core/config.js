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

  // Tunable gameplay values. Centralized so balance is easy.
  const TUNE = {
    rocket: {
      startX: 132,
      homeX: 0.32,               // fraction of W: where rocket gently drifts back to without input
      thrust: 560,
      thrustTurbo: 900,
      drag: 0.960,
      dragTurbo: 0.982,
      maxV: 320,
      maxVTurbo: 540,
      forwardBoost: 420,         // forward shove during turbo
      // Boost is a hard-limited meter (0..1). Spend → recharge.
      heatGainTurbo: 0.42,       // ~2.4s of full boost on a fresh tank
      heatCool: 0.32,            // ~3.1s to fully recharge
      heatLockoutBelow: 0.25,    // when overheated, must cool down to this before turbo re-engages
      shieldDecay: 1.4,
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

  RR.config = {
    W, H,
    PALETTE,
    TUNE,
    BOSSES,
    STORAGE_KEY: "retroRocketRushBestV2",
    LEVEL_FOR_VICTORY: 20,
    // Filled at runtime by render setup:
    scale: 1,
    cssWidth: W,
    cssHeight: H,
    lowDetail: false,
  };
})(typeof window !== "undefined" ? window : this);
