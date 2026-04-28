/* Rocket Rush — Boss System Constants
 * Shared constants and basic config-derived helpers.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const shared = (RR.bossSystemShared = RR.bossSystemShared || {});

  shared.NEON_RENDER_TYPES = new Set(["serpent", "mirror", "crystal", "glitch", "chrono"]);
  shared.bossRadius = function bossRadius(cfg) {
    if (cfg.r) return cfg.r;
    if (cfg.type === "dread") return 85;
    if (cfg.type === "cosmic") return 60;
    if (cfg.type === "tech") return 70;
    if (cfg.type === "serpent") return 62;
    if (cfg.type === "mirror") return 64;
    if (cfg.type === "crystal") return 66;
    if (cfg.type === "glitch") return 58;
    if (cfg.type === "chrono") return 88;
    return 54;
  };
})(typeof window !== "undefined" ? window : this);
