/* Rocket Rush — State
 * Game-wide mutable state and DOM refs (lazy-bound).
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});

  const state = {
    mode: "menu",       // menu | playing | paused | gameover | victory | bossIntro | bossFight | bossDefeated
    score: 0,
    lives: 3,
    level: 1,
    distance: 0,
    combo: 0,
    comboTimer: 0,
    invincible: 0,
    elapsed: 0,
    bombs: 1,
    magnetTime: 0,
    phaseTime: 0,
    multishotTime: 0,
    bossIndex: -1,      // index into RR.config.BOSSES, -1 if none active
    bossPhase: 0,
    bossIntroT: 0,
    bossDefeatedT: 0,
    fps: 60,
    best: 0,
  };

  // Effects / timers that aren't tied to a single entity.
  const fx = {
    shake: 0,
    flash: 0,
    flashColor: "#ff375f",
    slowMo: 0,
    levelToastCooldown: 0,
    motionLines: 0,    // 0..1, increases with turbo
  };

  const dom = {};
  function bindDom() {
    dom.canvas   = document.getElementById("game");
    dom.ctx      = dom.canvas.getContext("2d");
    dom.score    = document.getElementById("score");
    dom.best     = document.getElementById("best");
    dom.lives    = document.getElementById("lives");
    dom.level    = document.getElementById("level");
    dom.shield   = document.getElementById("shield");
    dom.bombs    = document.getElementById("bombs");
    dom.overlay  = document.getElementById("overlay");
    dom.modal    = document.getElementById("modal");
    dom.toast    = document.getElementById("toast");
    dom.wrap     = document.getElementById("game-wrap");
    dom.touch    = document.getElementById("touch");
  }

  RR.state = state;
  RR.fx = fx;
  RR.dom = dom;
  RR.bindDom = bindDom;

  // Persistence
  RR.loadBest = function () {
    state.best = Number(localStorage.getItem(RR.config.STORAGE_KEY) || 0) | 0;
    return state.best;
  };
  RR.saveBest = function () {
    localStorage.setItem(RR.config.STORAGE_KEY, String(state.best | 0));
  };
})(typeof window !== "undefined" ? window : this);
