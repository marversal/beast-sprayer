# BEAST SPRAYER

*Spraying dem haters daily.* A 2D HTML5-canvas arcade game (plain JavaScript + Vite). No server logic: the build in `dist/` is a fully static site.

Concept: MARGOOSE - Code: MARVERSAL [AKCB 2026]

## Run it

The game is a static site, but it loads images / the character manifest with `fetch`, so open it through any static web server (browsers block this on `file://`).

```bash
# play the prebuilt game
cd dist
python3 -m http.server 8080        # or: npx serve dist
# open http://localhost:8080/
```

Develop / rebuild:

```bash
npm install
npm run dev        # Vite dev server with hot reload
npm run build      # outputs ./dist  (relative paths: can be hosted in any sub-folder)
npm run preview
```

## Deploy

The game is a fully static Vite build (`base: './'`, output in `dist/`), so it runs on any static host.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmarversal%2Fbeast-sprayer&project-name=beast-sprayer&repository-name=beast-sprayer)

Or import manually at <https://vercel.com/new/import?s=https://github.com/marversal/beast-sprayer> with these settings:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

(`vercel.json` already pins these.) From the CLI: `npx vercel --prod`.

## Controls

| Action | Keys |
|---|---|
| Select Beast (menu) | `LEFT` / `RIGHT`, or click / tap a frame |
| Start | `ENTER` / `SPACE`, or click **PRESS START** |
| Move | `LEFT` / `RIGHT` arrows (`A` / `D` also work) |
| Spray | `[1]` (hold to keep spraying; `Numpad1` / `SPACE` also work) |
| Replay (restart current session) | HUD **REPLAY** button, or `R` |
| Pause | `P` / `ESC` (auto-pauses when the tab loses focus) |
| Sound on/off | `M` (tiny WebAudio beeps, on by default) |
| Touch | on-screen buttons appear on touch devices (move left / right / SPRAY) |

## How it plays

- Enemies walk in from both sides along the alley pavement; drones fly in at varied heights. Anything that reaches you hurts: health is a 10-segment bar; at 0 you lose a life (you get a short invulnerability and nearby enemies are vaporised). Lose all 3 lives -> **GAME OVER** with RESTART / CHANGE BEAST.
- **Spray tiers (automatic by distance)**: the can auto-aims at the nearest enemy in front of you (it tilts up toward drones). Close targets get the **short** spray (fast, weak), mid-range the **medium**, far targets the **long** spray (slow cooldown, strongest, pierces up to 3 enemies). All three supplied spray sprites are used.
- Hits flash green; kills trigger a pixel dissolve + green vaporisation particles.
- **Golden collectibles** appear on the pavement every ~7-12 s (and sometimes drop from kills): walk over them. Gold can = 100, gold mask = 50 (plus a gold shockwave/flash/aura special effect). They vanish on pickup and the HUD `GOLD:` counter updates.
- **Smart bomb** (wave 13 and up; "WAVE 13" in the HUD is the first wave that can have one): a smart bomb pickup (the supplied yellow bomb art, with a pulsing "SMART BOMB!" label and arrow) appears on the pavement a short walk away when you are under pressure: 3+ enemies within 500 px, or 2+ close on each side, or an enemy just hit you with 2+ more close. As a guarantee, every wave 13+ spawns one 8 s after it starts if 3+ enemies are alive. 15 s cooldown between spawns, at most one on screen. It blinks for the last 3 s and expires after 9 s. Walk over it to detonate: every enemy currently on screen (ground and drones) is vaporised with a green shockwave, flash, screen shake and sound. They award their normal points and count in the HUD `SPRAYED:` counters. The HUD `BOMB:` counter (top, next to WAVE) shows detonations this session and pulses while a pickup is waiting; REPLAY / restart clears the counter and any pending pickup. Enemies spawning afterwards are not affected.
- Waves: each wave has more enemies, faster spawns and faster walkers; new enemy types unlock (wave 2 dogs, wave 3 bots + drones, wave 4 cops).

### Points

| Enemy | Pts | Gold | Pts |
|---|---|---|---|
| HEROS | 5 | Gold spray can | 100 |
| FENTS | 10 | Gold balaclava mask | 50 |
| BOTS | 20 | | |
| COPS | 50 | | |
| DOGS | 10 | | |
| DRONES | 10 | | |

## Configuration

- `src/config.js` - the `CONFIG` object at the top of the file: player speed/health/lives, **spray range / damage / cooldown / speed / pierce per tier**, particle behaviour (`particlesPerHit`, `particleSpeed`, `particleGravity`, `particleLife`, `vaporizeSeconds`), the **enemy table (points, hp, speed, damage, scale)**, wave ramp (incl. the eased waves 8-12), collectible values / spawn rates, **smart bomb rules**, audio volume. Edit and `npm run build`.
- `public/assets/manifest.json` (and `dist/assets/manifest.json`) - **character IDs and sprites**. Editable on the built game without rebuilding.

### Difficulty ramp (eased waves 8-12)

So that a normal player can reach wave 13 (smart bomb), waves 8-12 use a gentler ramp via `CONFIG.waves.ease` (`src/config.js`). Waves 1-7 and 13+ keep the original, steeper values (`countPerWave 4`, `spawnIntervalStep 0.09`, `speedRampPerWave 0.09`, `maxAlive 18`), so wave 13+ resumes climbing at the original rate (from a slightly lower starting point). Changes for waves 8-12:

| Setting | Before | Waves 8-12 now |
|---|---|---|
| `countPerWave` (extra enemies per wave) | +4 | +2 |
| `speedRampPerWave` (walker speed growth per wave) | +9 % | +4 % |
| `spawnIntervalStep` (spawn interval shrink per wave) | 0.09 s | 0.06 s |
| `maxAlive` (concurrent enemy cap) | 18 | 14 |
| `healOnWaveStart` (new: health restored when an eased wave starts) | none | +40 |

Resulting numbers: wave 12 has 42 enemies (was 52) at 1.74x speed (was 1.99x); wave 13 has 46 (was 56) at 1.83x (was 2.08x). Set `ease.enabled: false` for the original curve. Measured with an imperfect bot (reaction delay, backs off, 3 lives): reaches wave 13 in 47 of 48 runs (was 19 of 48); median wave reached 16 (was 12).

### Smart bomb settings and debug hook

All values are in `CONFIG.smartBomb` (`src/config.js`): `startWave` (13), `surroundCount` / `surroundRadius` (3 / 500), `bothSidesCount` / `bothSidesRadius` (2 / 380), `contactWindowSeconds` / `contactNearCount` / `contactNearRadius` (3 / 2 / 450), `holdSeconds` (0.15), `cooldownSeconds` (15), `initialCooldownSeconds` (2), `fallbackSeconds` / `fallbackMinEnemies` (8 / 3), `maxOnScreen` (1), `lifetime` (9), `blinkSeconds` (3), `spawnOffset`, `pickupRadius`, `onScreenOnly`, `shakeSeconds`, `flashColor` / `flashAlpha`, `scale`, `sprite`. The sprite is also listed under `collectibles` in `public/assets/manifest.json` (a `sprite` path there overrides the default without a rebuild).

Test without playing 13 waves, via URL query parameters:

- `?startWave=13` - a session starts at wave 13 (works for any wave >= 1, also with REPLAY).
- `?smartBombStartWave=N` - override the wave from which smart bombs are available.
- Console / test hooks: `__beast.spawnSmartBomb(x)` (force a pickup), `__beast.detonateSmartBomb()`, `__beastConfig.smartBomb`.

**Assumption to confirm:** "after wave 13" was interpreted as **wave 13 and up** (`smartBombStartWave = 13`). If it should start from wave 14, set `startWave: 14`.

## Beast IDs (resolved)

Confirmed by the user: **bear = #5761**, **white-horned = #541** (as shown on the splash/HUD examples). The "#5167" on the reference sheet caption and the earlier "#0960" were dismissed. IDs live in `assets/manifest.json` (editable without a rebuild). The enemy order HEROS, FENTS, BOTS, COPS, DOGS, DRONES was also confirmed. See `ASSET_MANIFEST.md`.

## Other assumptions

- **Backgrounds**: the gameplay backdrop is the supplied HUD example with the baked-in HUD removed (bottom rows repainted by mirroring the wet pavement, top panels inpainted and re-covered by the live HUD). The splash screen reuses that backdrop because the splash example's own alley differs and its centre is hidden behind UI. The green splash decals are developer-made pixel art. See `ASSET_MANIFEST.md` section 4/5.
- **Enemy identities** (confirmed): the enemy sheet has no captions; sprites are mapped in reading order to HEROS, FENTS, BOTS, COPS, DOGS, DRONES.
- The reference sheet's original composite was not available; the 8 supplied files were used individually.
- The game logic runs on a fixed 1672x941 stage that is CSS-scaled to fit the window (art is pixel-snapped, `image-rendering: pixelated`).
- Debug hook: `window.__beast` exposes the live game object (`spawnEnemy(type, x)`, `spawnPickup(kind, x)`, ...), used by `tools/*.py` browser tests.

## Project layout

```
index.html, vite.config.js, package.json
src/            main.js (UI/input/HUD), game.js (engine), config.js, assets.js, audio.js, style.css
public/assets/  sprites/ backgrounds/ ui/ manifest.json   (extracted game art)
dist/           built static game
source_assets/  the 8 supplied PNGs (renamed copies) + smart_bomb_source.png
tools/          extract_assets.py, extract_smart_bomb.py, make_splashes.py, make_manifest_md.py, browser test scripts (playwright)
ASSET_MANIFEST.md
```

Regenerate art: `pip install pillow numpy scipy opencv-python-headless && python3 tools/extract_assets.py && python3 tools/make_splashes.py`.
