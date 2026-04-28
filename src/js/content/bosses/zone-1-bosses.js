/* Rocket Rush — Zone 1 Boss Roster */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const P = RR.config.PALETTE;

  RR.registerBossZone(1, {
    key: "asteroid-belt",
    name: "Asteroid Belt",
    introToast: "ZONE 1: ASTEROID BELT",
    entryLevel: 1,
    wormholeColor: P.cyan,
    bosses: [
      { id: "bouldron", type: "rock", atLevel: 4, name: "LORD BOULDRON", title: "Patriarch Of The Belt", taunt: "BOULDRON WILL CRUSH YOU!", hp: 45, color: P.orange },
      { id: "saucer", type: "ufo", atLevel: 8, name: "ZETA SAUCER", title: "Extraterrestrial Scout", taunt: "PROBING INITIATED...", hp: 75, color: P.green },
      { id: "station", type: "tech", atLevel: 12, name: "ORBITAL BASTION", title: "Automated Defense Matrix", taunt: "UNAUTHORIZED VESSEL DETECTED.", hp: 110, color: P.cyan },
      { id: "anomaly", type: "cosmic", atLevel: 16, name: "THE ANOMALY", title: "Sentient Gravity Well", taunt: "EMBRACE THE VOID.", hp: 160, color: P.purple },
      { id: "mothership", type: "dread", atLevel: 20, name: "XENON DREADNOUGHT", title: "The Final Threat", taunt: "YOUR JOURNEY ENDS HERE.", hp: 250, color: P.red, final: true },
    ],
  });
})(typeof window !== "undefined" ? window : this);
