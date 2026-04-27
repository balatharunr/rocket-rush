/* Rocket Rush — Input
 * Keyboard + mouse + on-screen touch controls.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});

  const keys = new Set();
  // Virtual buttons (touch + mouse). Anything that maps to gameplay flips here.
  const virt = {
    up: false, down: false, left: false, right: false,
    turbo: false, shoot: false, bomb: false,
  };

  // Public action-state checks (used by entities/game.js).
  function action(name) {
    switch (name) {
      case "up":    return virt.up    || keys.has("ArrowUp")    || keys.has("KeyW");
      case "down":  return virt.down  || keys.has("ArrowDown")  || keys.has("KeyS");
      case "left":  return virt.left  || keys.has("ArrowLeft")  || keys.has("KeyA");
      case "right": return virt.right || keys.has("ArrowRight") || keys.has("KeyD");
      case "turbo": return virt.turbo || keys.has("Space")      || keys.has("ShiftLeft") || keys.has("ShiftRight");
      case "shoot": return virt.shoot || keys.has("KeyJ")       || keys.has("KeyZ");
      case "bomb":  return virt.bomb  || keys.has("KeyB")       || keys.has("KeyX");
    }
    return false;
  }

  function bind() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      keys.add(e.code);
      // Block default scroll for game keys.
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
           "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyZ", "KeyB", "KeyX"
          ].includes(e.code)) e.preventDefault();

      if (e.code === "KeyP") RR.game.togglePause();
      else if (e.code === "KeyM") RR.game.toggleMute();
      else if (e.code === "KeyR" && (RR.state.mode === "playing" || RR.state.mode === "paused" || RR.state.mode === "gameover" || RR.state.mode === "victory")) RR.game.reset();
      else if (e.code === "Enter" && (RR.state.mode === "menu" || RR.state.mode === "gameover" || RR.state.mode === "victory")) {
        RR.audio.ensure(); RR.game.reset();
      }
    });

    window.addEventListener("keyup", (e) => keys.delete(e.code));
    // Lose focus = release everything (prevents stuck keys after alt-tab).
    window.addEventListener("blur", () => { keys.clear(); for (const k in virt) virt[k] = false; });

    bindMouseControls();
    bindTouchControls();
  }

  function bindMouseControls() {
    const canvas = RR.dom.canvas;
    if (!canvas) return;

    const mouseAction = (button) => {
      if (button === 0) return "shoot";
      if (button === 2) return "bomb";
      return null;
    };

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("mousedown", (e) => {
      const k = mouseAction(e.button);
      if (!k) return;
      e.preventDefault();
      virt[k] = true;
    });

    window.addEventListener("mouseup", (e) => {
      const k = mouseAction(e.button);
      if (!k) return;
      virt[k] = false;
    });

    // If the mouse leaves the canvas while held, clear fire controls.
    canvas.addEventListener("mouseleave", () => {
      virt.shoot = false;
      virt.bomb = false;
    });
  }

  function bindTouchControls() {
    const pad = RR.dom.touch;
    if (!pad) return;
    const map = {
      "btn-up": "up", "btn-down": "down", "btn-left": "left", "btn-right": "right",
      "btn-turbo": "turbo", "btn-shoot": "shoot", "btn-bomb": "bomb",
    };
    Object.keys(map).forEach((id) => {
      const el = pad.querySelector("#" + id);
      if (!el) return;
      const k = map[id];
      const press = (ev) => { ev.preventDefault(); virt[k] = true; el.classList.add("active"); };
      const lift  = (ev) => { ev.preventDefault(); virt[k] = false; el.classList.remove("active"); };
      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("touchend",   lift,  { passive: false });
      el.addEventListener("touchcancel", lift, { passive: false });
      el.addEventListener("mousedown",  press);
      el.addEventListener("mouseup",    lift);
      el.addEventListener("mouseleave", lift);
    });
    // Show touch overlay on pointer:coarse devices.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    pad.style.display = isTouch ? "" : "none";
    // Allow toggle-show via long-press on canvas? Skip — keep clean.
  }

  RR.input = { bind, action, keys, virt };
})(typeof window !== "undefined" ? window : this);
