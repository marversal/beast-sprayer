// =====================================================================
//  BEAST SPRAYER - tweakable game configuration
//  Everything gameplay-related lives in this one object.
//  Character IDs (#5761 / #541) live in public/assets/manifest.json
//  (editable after build, no rebuild needed); CONFIG.characters below is
//  only the fallback used if the manifest cannot be fetched.
// =====================================================================
export const CONFIG = {
  stage: { width: 1672, height: 941 },

  // Fallback character table. KEEP IDs CONFIGURABLE - see README "ID discrepancy".
  characters: [
    { key: 'bear', id: '5761', sprite: 'assets/sprites/players/bear.png', head: 'assets/ui/head_bear.png', muzzle: [306, 128] },
    { key: 'white_horned', id: '541', sprite: 'assets/sprites/players/white_horned.png', head: 'assets/ui/head_white_horned.png', muzzle: [308, 150] },
  ],

  player: {
    scale: 0.62,          // supplied art is ~318x402; drawn at 62%
    speed: 470,           // px / s
    minX: 110,
    maxX: 1562,
    groundY: 742,         // y of the player's feet
    maxHealth: 100,       // 10 HUD segments x 10
    lives: 3,
    hitInvulnSeconds: 0.9,
    respawnInvulnSeconds: 2.0,
    contactRadius: 52,    // horizontal distance at which ground enemies hit
    bodyHeight: 150,      // used for drone / pickup collision
  },

  // Spray tiers. The tier is picked automatically from the distance to the
  // nearest enemy in front of the player (short / medium / long art).
  spray: {
    key: 'Digit1',        // [1]  (also Numpad1)
    tiers: [
      // range = max travel (px), damage per hit, cooldown (s), pierce = enemies one blast can hit
      { id: 'short',  sprite: 'assets/sprites/spray/spray_short.png',  range: 340, damage: 1, cooldown: 0.20, speed: 1500, pierce: 1, hitRadius: 30 },
      { id: 'medium', sprite: 'assets/sprites/spray/spray_medium.png', range: 600, damage: 2, cooldown: 0.30, speed: 1650, pierce: 2, hitRadius: 34 },
      { id: 'long',   sprite: 'assets/sprites/spray/spray_long.png',   range: 920, damage: 3, cooldown: 0.42, speed: 1800, pierce: 3, hitRadius: 38 },
    ],
    autoAim: true,
    maxAimAngleDeg: 40,   // how far up the can may tilt toward drones
    particlesPerHit: 16,  // green vaporisation particles per hit
    particlesOnDeath: 34,
    particleSpeed: 260,
    particleGravity: -120, // negative = floats up
    particleLife: 0.7,
    vaporizeSeconds: 0.45,
  },

  // Points are exactly as specified: HEROS 5, FENTS 10, BOTS 20, COPS 50, DOGS 10, DRONES 10.
  enemies: {
    heros:  { label: 'HEROS',  points: 5,  hp: 1, speed: 120, damage: 8,  scale: 0.85, flying: false, minWave: 1, weight: 5 },
    fents:  { label: 'FENTS',  points: 10, hp: 2, speed: 100, damage: 10, scale: 0.85, flying: false, minWave: 1, weight: 4 },
    dogs:   { label: 'DOGS',   points: 10, hp: 2, speed: 215, damage: 12, scale: 0.85, flying: false, minWave: 2, weight: 3 },
    bots:   { label: 'BOTS',   points: 20, hp: 5, speed: 80,  damage: 15, scale: 0.9,  flying: false, minWave: 3, weight: 3 },
    drones: { label: 'DRONES', points: 10, hp: 2, speed: 165, damage: 10, scale: 0.75, flying: true,  minWave: 3, weight: 3, minAltitude: 330, maxAltitude: 540 },
    cops:   { label: 'COPS',   points: 50, hp: 7, speed: 90,  damage: 20, scale: 0.9,  flying: false, minWave: 4, weight: 2 },
  },
  // HUD "SPRAYED:" order
  hudKillOrder: ['bots', 'drones', 'cops', 'dogs', 'fents', 'heros'],

  waves: {
    firstWaveDelay: 1.2,
    betweenWaves: 2.6,
    baseCount: 8,          // enemies in wave 1
    countPerWave: 4,
    spawnIntervalStart: 1.1,
    spawnIntervalMin: 0.3,
    spawnIntervalStep: 0.09, // shorter each wave
    speedRampPerWave: 0.09,  // +7% enemy speed per wave
    spawnMargin: 120,
    maxAlive: 18,
  },

  collectibles: {
    gold_can:  { label: 'CAN',  points: 100, sprite: 'assets/sprites/collectibles/gold_can.png',  scale: 0.6, weight: 1 },
    gold_mask: { label: 'MASK', points: 50,  sprite: 'assets/sprites/collectibles/gold_mask.png', scale: 0.6, weight: 1.4 },
    spawnEverySeconds: [7, 12],
    dropChanceOnKill: 0.07,
    lifetime: 9,
    pickupRadius: 70,
  },

  audio: { enabled: true, volume: 0.12 },
};
