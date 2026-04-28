/* Rocket Rush — Pickup Abilities
 * Central ability registry for pickup effects.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const { clamp } = RR.utils;

  const handlers = {};

  function register(type, handler) {
    handlers[type] = handler;
  }

  function apply(pickup, ctx) {
    const type = pickup.type || "star";
    const handler = handlers[type] || handlers.star;
    if (handler) handler(pickup, ctx);
  }

  register("shield", (p, { state, rocket, palette }) => {
    rocket.shield = clamp(rocket.shield + 50, 0, 100);
    RR.game.addScore(120, "SHIELD", p.x, p.y, palette.green);
    RR.ui.toast("SHIELD ONLINE");
    RR.effects.boom(p.x, p.y, 14, palette.green);
    RR.audio.sfx.shield();
  });

  register("slow", (p, { palette }) => {
    RR.fx.slowMo = 4.4;
    RR.game.addScore(160, "SLOW-MO", p.x, p.y, palette.cyan);
    RR.ui.toast("TIME WARP");
    RR.effects.boom(p.x, p.y, 18, palette.cyan);
    RR.audio.sfx.slow();
  });

  register("bomb", (p, { state, palette }) => {
    state.bombs = Math.min(state.bombs + 1, 5);
    RR.game.addScore(140, "BOMB", p.x, p.y, palette.yellow);
    RR.ui.toast("BOMB ACQUIRED");
    RR.effects.boom(p.x, p.y, 14, palette.yellow);
    RR.audio.sfx.pickup();
  });

  register("life", (p, { state, palette }) => {
    state.lives = Math.min(state.lives + 1, 5);
    RR.game.addScore(220, "LIFE", p.x, p.y, palette.red);
    RR.ui.toast("EXTRA LIFE");
    RR.effects.boom(p.x, p.y, 18, palette.red);
    RR.audio.sfx.pickup();
  });

  register("magnet", (p, { state, palette }) => {
    state.magnetTime = Math.max(state.magnetTime, 9);
    RR.game.addScore(110, "MAGNET", p.x, p.y, palette.pink);
    RR.ui.toast("MAGNET ACTIVE");
    RR.effects.boom(p.x, p.y, 14, palette.pink);
    RR.audio.sfx.magnet();
  });

  register("phase", (p, { state, palette }) => {
    state.phaseTime = Math.max(state.phaseTime, 4.5);
    RR.game.addScore(180, "PHASE", p.x, p.y, palette.purple);
    RR.ui.toast("PHASE SHIFT");
    RR.effects.boom(p.x, p.y, 18, palette.purple);
    RR.audio.sfx.phase();
  });

  register("multishot", (p, { state, palette }) => {
    state.multishotTime = Math.max(state.multishotTime, 8);
    RR.game.addScore(150, "MULTI", p.x, p.y, palette.orange);
    RR.ui.toast("MULTI-SHOT");
    RR.effects.boom(p.x, p.y, 14, palette.orange);
    RR.audio.sfx.pickup();
  });

  register("gem", (p, { state, palette }) => {
    state.combo++;
    state.comboTimer = 2.8;
    RR.game.addScore(p.value, `x${Math.max(1, state.combo)}`, p.x, p.y, palette.yellow);
    RR.effects.boom(p.x, p.y, 10, palette.yellow);
    RR.audio.sfx.gem(state.combo);
  });

  register("star", (p, { state, palette }) => {
    state.combo++;
    state.comboTimer = 2.2;
    RR.game.addScore(p.value, "STAR", p.x, p.y, palette.white);
    RR.effects.boom(p.x, p.y, 6, palette.white);
    RR.audio.sfx.star();
  });

  RR.pickupAbilities = {
    apply,
    register,
    handlers,
  };
})(typeof window !== "undefined" ? window : this);
