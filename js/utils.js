/* Rocket Rush — Utilities
 * Math helpers, RNG, simple object pool, geometry helpers.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});

  const TWO_PI = Math.PI * 2;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function lerp(a, b, t)  { return a + (b - a) * t; }
  function rand(a, b)     { return Math.random() * (b - a) + a; }
  function randi(a, b)    { return Math.floor(rand(a, b)); }
  function choose(arr)    { return arr[(Math.random() * arr.length) | 0]; }

  function circleHit(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const rr = (a.r || 1) + (b.r || 1);
    return dx * dx + dy * dy <= rr * rr;
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  // Tiny pooling helper. Items get reset via fn() and recycled.
  function makePool(factory) {
    const free = [];
    const live = [];
    return {
      live,
      acquire(initFn) {
        const o = free.pop() || factory();
        if (initFn) initFn(o);
        live.push(o);
        return o;
      },
      release(idx) {
        const o = live[idx];
        const last = live.pop();
        if (idx < live.length) live[idx] = last;
        free.push(o);
      },
      clear() {
        while (live.length) free.push(live.pop());
      },
      get count() { return live.length; },
    };
  }

  // Pad number with leading zeroes for HUD.
  function pad(n, len = 6) {
    return String(Math.floor(n)).padStart(len, "0").slice(-len);
  }

  RR.utils = {
    TWO_PI, clamp, lerp, rand, randi, choose,
    circleHit, dist2, makePool, pad,
  };
})(typeof window !== "undefined" ? window : this);
