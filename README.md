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

- `src/config.js` - the `CONFIG` object at the top of the file: player speed/health/lives, **spray range / damage / cooldown / speed / pierce per tier**, particle behaviour (`particlesPerHit`, `particleSpeed`, `particleGravity`, `particleLife`, `vaporizeSeconds`), the **enemy table (points, hp, speed, damage, scale)**, wave ramp, collectible values / spawn rates, audio volume. Edit and `npm run build`.
- `public/assets/manifest.json` (and `dist/assets/manifest.json`) - **character IDs and sprites**. Editable on the built game without rebuilding.

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
source_assets/  the 8 supplied PNGs (renamed copies)
tools/          extract_assets.py, make_splashes.py, make_manifest_md.py, browser test scripts (playwright)
ASSET_MANIFEST.md
```

Regenerate art: `pip install pillow numpy scipy opencv-python-headless && python3 tools/extract_assets.py && python3 tools/make_splashes.py`.
