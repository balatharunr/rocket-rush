/* Rocket Rush — Boss System Helpers
 * Shared zone helpers for boss runtime modules.
 */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const shared = (RR.bossSystemShared = RR.bossSystemShared || {});

  function getZoneMeta(zoneId) {
    if (RR.getBossZone) return RR.getBossZone(zoneId);
    return RR.config.BOSS_ZONES[Number(zoneId)] || null;
  }

  function getZoneEntryLevel(zoneId) {
    const zone = getZoneMeta(zoneId);
    if (zone && zone.entryLevel) return zone.entryLevel;
    return (Math.max(1, Number(zoneId) || 1) - 1) * 20 + 1;
  }

  function getZoneWormholeColor(zoneId) {
    const zone = getZoneMeta(zoneId);
    if (zone && zone.wormholeColor) return zone.wormholeColor;
    return zoneId === 2 ? RR.config.PALETTE.cyan : RR.config.PALETTE.purple;
  }

  shared.getZoneMeta = getZoneMeta;
  shared.getZoneEntryLevel = getZoneEntryLevel;
  shared.getZoneWormholeColor = getZoneWormholeColor;
})(typeof window !== "undefined" ? window : this);
