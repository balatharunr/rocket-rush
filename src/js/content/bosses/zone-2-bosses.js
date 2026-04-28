/* Rocket Rush — Zone 2 Boss Roster */
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const P = RR.config.PALETTE;

  RR.registerBossZone(2, {
    key: "neon-rift",
    name: "Neon Rift",
    introToast: "ZONE 2: NEON RIFT",
    entryLevel: 21,
    wormholeColor: P.purple,
    bosses: [
      { id: "pixel-python", type: "serpent", atLevel: 24, name: "PIXEL PYTHON", title: "Neon Data Serpent", taunt: "SSSYNTH SIGNAL LOCKED!", hp: 130, color: P.green, attackCadence: { min: 0.42, max: 0.88 } },
      { id: "disco-doppler", type: "mirror", atLevel: 28, name: "DISCO DOPPLER", title: "Mirrorball Menace", taunt: "DANCE OR DISINTEGRATE!", hp: 165, color: P.pink, attackCadence: { min: 0.42, max: 0.88 } },
      { id: "crystal-cobra", type: "crystal", atLevel: 32, name: "CRYSTAL COBRA", title: "Prismatic Fang Queen", taunt: "REFRACTION MEANS PAIN!", hp: 210, color: P.cyan, attackCadence: { min: 0.42, max: 0.88 } },
      { id: "glitch-goblin", type: "glitch", atLevel: 36, name: "GLITCH GOBLIN", title: "Corrupted Arcade Gremlin", taunt: "H4H4! HITBOX OPTIONAL!", hp: 255, color: P.purple, attackCadence: { min: 0.42, max: 0.88 } },
      { id: "chrono-kraken", type: "chrono", atLevel: 40, name: "CHRONO KRAKEN", title: "Time-Tangled Tentacle Titan", taunt: "YOUR SECONDS ARE MINE!", hp: 360, color: P.yellow, final: true, attackCadence: { min: 0.42, max: 0.88 } },
    ],
  });
})(typeof window !== "undefined" ? window : this);
