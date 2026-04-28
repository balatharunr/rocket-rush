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

  RR.config = {
    W, H,
    PALETTE,
    TUNE,
    BOSSES,
    BOSS_ZONES,
    STORAGE_KEY: "retroRocketRushBestV2",
    LEVEL_FOR_VICTORY: 40,
    // Filled at runtime by render setup:
    scale: 1,
    cssWidth: W,
    cssHeight: H,
    lowDetail: false,
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
