# Gameplay Structure Guide

This project now separates gameplay content from runtime systems so future updates are easier and safer.

## Folder Layout

- `src/js/core/`
  - Engine-level setup, config, and global state.
- `src/js/entities/`
  - Runtime entities and spawn logic (rocket, pickups, asteroids).
- `src/js/systems/`
  - Runtime systems (audio, input, render, boss system).
- `src/js/content/bosses/`
  - Zone-based boss data files.
- `src/js/content/abilities/`
  - Ability registries and pickup effects.

## Bosses and Zones

### How it works

1. Zone files call `RR.registerBossZone(zoneId, zoneDef)`.
2. `src/js/core/config.js` normalizes zone metadata and rebuilds `RR.config.BOSSES`.
3. `src/js/systems/boss-system/index.js` uses `RR.config.BOSSES` for encounters.
4. Shared helpers/constants live in `src/js/systems/boss-system/helpers.js` and `src/js/systems/boss-system/constants.js`.

### Zone file format

Create a file like `src/js/content/bosses/zone-3-bosses.js`:

```js
(function (root) {
  "use strict";
  const RR = (root.RR = root.RR || {});
  const P = RR.config.PALETTE;

  RR.registerBossZone(3, {
    key: "ion-depths",
    name: "Ion Depths",
    introToast: "ZONE 3: ION DEPTHS",
    entryLevel: 41,
    wormholeColor: P.orange,
    bosses: [
      {
        id: "ion-wyrm",
        type: "serpent",
        atLevel: 44,
        name: "ION WYRM",
        title: "Charged Leviathan",
        taunt: "THE VOID HUMS.",
        hp: 420,
        color: P.orange,
        attackCadence: { min: 0.45, max: 0.90 },
      },
    ],
  });
})(typeof window !== "undefined" ? window : this);
```

Then add one script tag in `index.html` near other boss content files.

## Pickup Abilities

`src/js/content/abilities/pickup-abilities.js` is the central registry.

- Existing ability effects are registered with `register(type, handler)`.
- Entity collection calls `RR.pickupAbilities.apply(pickup, ctx)`.

To add a new ability:

1. Add a new `register("your-type", handler)` entry in pickup abilities.
2. Spawn that type from `src/js/entities/spawn.js`.
3. Add its visual in `src/js/systems/render.js` pickup drawing switch.

## Naming Conventions

- Content data files: `zone-<number>-bosses.js`, `*-abilities.js`
- Runtime systems: `*-system.js` or `<feature>/index.js` for multi-file modules
- Keep filenames singular-purpose and explicit.
