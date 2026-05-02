/* Rocket Rush — Spawn manager
 * Spawns asteroids, pickups, and "star gems" with level-based pacing.
 * Boss fights pause regular asteroid spawning.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { rand, TWO_PI } = RR.utils;

  let spawnTimer = 0.4;
  let pickupTimer = 1.8;
  let starTimer = 0;
  let lifeAssistTimer = -1;
  let lifeAssistCooldown = 0;

  function reset() {
    spawnTimer = 0.4;
    pickupTimer = 1.6;
    starTimer = 0;
    lifeAssistTimer = -1;
    lifeAssistCooldown = 0;
  }

  function hasLifePickupOnScreen() {
    return RR.entities.pickups.some((p) => p.type === "life");
  }

  function onLifeLost(livesNow) {
    const cfg = RR.config.TUNE.spawn.lifeAssist;
    if (!cfg) return;
    if (livesNow <= 0 || livesNow > cfg.triggerLivesAtOrBelow) return;
    if (lifeAssistCooldown > 0 || lifeAssistTimer >= 0 || hasLifePickupOnScreen()) return;

    const chance = livesNow <= 1 ? cfg.chanceAtOneLife : cfg.chanceAtTwoLives;
    if (Math.random() > chance) return;

    const delay = livesNow <= 1
      ? rand(cfg.delayOneLifeMin, cfg.delayOneLifeMax)
      : rand(cfg.delayTwoLivesMin, cfg.delayTwoLivesMax);

    lifeAssistTimer = delay;
    lifeAssistCooldown = Math.max(0, cfg.minCooldown || 0);
  }

  function spawnLifePickup() {
    const { W, H } = RR.config;
    const lvl = RR.state.level;
    RR.entities.pickups.push({
      type: "life",
      x: W + 35,
      y: rand(52, H - 52),
      r: 18,
      vx: -(110 + lvl * 9),
      bob: rand(0, TWO_PI),
      value: 0,
    });
  }

  function spawnAsteroid() {
    const { W, H } = RR.config;
    const lvl = RR.state.level;
    const healthScale = RR.multiplayer && RR.state.mode !== "lobby" && RR.state.mode !== "lobbyStart"
      ? RR.multiplayer.difficultyScale("health")
      : 1;
    const radius = rand(14, 42) + lvl * 0.6;
    const fast = Math.random() < 0.10 + lvl * 0.012;
    const splitter = Math.random() < 0.07 + lvl * 0.006;
    RR.entities.asteroids.push({
      x: W + radius + rand(0, 80),
      y: rand(radius + 14, H - radius - 14),
      r: radius,
      vx: -(rand(110, 210) + lvl * 16 + (fast ? 130 : 0)),
      vy: rand(-46, 46),
      spin: rand(-2.6, 2.6),
      rot: rand(0, TWO_PI),
      hp: Math.max(1, Math.ceil((radius > 30 ? 2 : 1) * healthScale)),
      fast, splitter,
      seed: Math.random() * 999,
    });
  }

  function spawnPickup() {
    const { W, H } = RR.config;
    const st = RR.state;
    const lvl = st.level;
    // Weighted random pick. Rarer types appear more often at higher levels.
    const r = Math.random();
    let type;
    if (RR.multiplayer && RR.multiplayer.hasDeadPlayer && RR.multiplayer.hasDeadPlayer() && r < 0.16) type = "revive";
    else if (r < 0.22) type = "shield";
    else if (r < 0.40) type = "slow";
    else if (r < 0.55) type = "bomb";
    else if (r < 0.70) type = "magnet";
    else if (r < 0.82) type = "multishot";
    else if (r < 0.92 && lvl >= 3) type = "phase";
    else type = "gem";

    RR.entities.pickups.push({
      type,
      x: W + 35,
      y: rand(52, H - 52),
      r: type === "gem" ? 14 : (type === "life" ? 18 : 16),
      vx: -(110 + lvl * 9),
      bob: rand(0, TWO_PI),
      value: type === "gem" ? 250 + lvl * 50 : 0,
    });
  }

  function spawnStarGem() {
    const { W, H } = RR.config;
    const lvl = RR.state.level;
    RR.entities.pickups.push({
      type: "star",
      x: W + 25,
      y: rand(35, H - 35),
      r: 9,
      vx: -(170 + lvl * 12),
      bob: rand(0, TWO_PI),
      value: 70 + lvl * 8,
    });
  }

  function update(dt, gdt) {
    const st = RR.state;
    const TUNE = RR.config.TUNE.spawn;
    const lifeCfg = TUNE.lifeAssist;
    const turbo = RR.entities.rocket.turbo;
    const inBoss = st.mode === "bossFight" || st.mode === "bossIntro" || st.mode === "bossDefeated";

    // Asteroids — paused during boss fight.
    if (!inBoss) {
      spawnTimer -= gdt;
      const scale = RR.multiplayer ? RR.multiplayer.difficultyScale("spawn") : 1;
      const baseRate = Math.max(0.24, (TUNE.asteroidBase - st.level * TUNE.asteroidPerLevel - (turbo ? TUNE.asteroidTurboBoost : 0)) / scale);
      while (spawnTimer <= 0) {
        spawnAsteroid();
        spawnTimer += baseRate * rand(0.7, 1.18);
      }
    }

    // Delayed life-assist: appears shortly after life loss, not instantly.
    if (lifeAssistTimer >= 0) {
      if (!lifeCfg || st.lives <= 0 || st.lives > lifeCfg.triggerLivesAtOrBelow) {
        lifeAssistTimer = -1;
      } else {
        lifeAssistTimer -= gdt;
        if (lifeAssistTimer <= 0) {
          if (!hasLifePickupOnScreen()) {
            spawnLifePickup();
            lifeAssistTimer = -1;
          } else {
            // Keep waiting if a life pickup is still active.
            lifeAssistTimer = 0.8;
          }
        }
      }
    }

    if (lifeAssistCooldown > 0) {
      lifeAssistCooldown = Math.max(0, lifeAssistCooldown - gdt);
    }

    // Pickups (always — players need power-ups during boss too).
    pickupTimer -= gdt;
    if (pickupTimer <= 0) {
      spawnPickup();
      pickupTimer = rand(TUNE.pickupMin, TUNE.pickupMax) - Math.min(1.0, st.level * 0.04);
      if (inBoss) pickupTimer *= 0.7; // a bit more frequent during boss
    }

    // Star gems
    starTimer -= gdt;
    if (starTimer <= 0) {
      if (Math.random() < 0.78) spawnStarGem();
      starTimer = rand(TUNE.starMin, TUNE.starMax);
    }
  }

  function updateLobby(dt, gdt) {
    spawnTimer -= gdt;
    if (spawnTimer <= 0) {
      spawnAsteroid();
      spawnTimer = rand(0.8, 1.4);
    }
    if (lifeAssistCooldown > 0) lifeAssistCooldown = Math.max(0, lifeAssistCooldown - gdt);
  }

  RR.spawn = { reset, update, updateLobby, spawnAsteroid, spawnPickup, spawnStarGem, onLifeLost };
})(typeof window !== "undefined" ? window : this);
