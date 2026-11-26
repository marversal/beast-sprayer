# BEAST SPRAYER - ASSET MANIFEST

All game art comes from the 8 supplied PNGs (copies live in `source_assets/`, renamed for readability; original UUID names are listed below).
Extraction is scripted and repeatable: `python3 tools/extract_assets.py` (needs `pillow numpy scipy opencv-python-headless`). Raw bounds: `tools/extraction_report.json`.

## 1. Source files

| Original file | Copy in `source_assets/` | Size | Contents / use |
|---|---|---|---|
| `8a792674-1eaa-483c-b540-ce523602ff9a.png` | same name | 435x941 | two player characters (top: brown bear-head, bottom: white head with black horns) -> sliced to sprites |
| `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | same name | 784x498 | six-enemy sheet, 3x2 grid -> sliced to 6 sprites |
| `ba7b1740-f0a6-4489-991f-46388c1a69d8.png` | same name | 488x424 | two gold collectibles -> sliced |
| `93961aa5-b2eb-44da-bf2c-470ad17a8b1e.png` | same name | 387x393 | three green spray lengths -> sliced |
| (supplied later, v1.1) | `smart_bomb_source.png` | 368x422 | Yellow pixel-art smart bomb with lit red fuse (RGBA, white background already removed; the extractor also flood-removes an opaque white background if present) -> `tools/extract_smart_bomb.py` |
| `1026cc59-e132-45d9-93d0-07d85f941e9d.png` | `hud_5761_example.png` | 1672x941 | HUD example, BEAST #5761. **Source of the gameplay backdrop** (HUD removed, see section 4); HUD layout/colours reference |
| `cb88d8d1-eae3-41b6-92b4-6feee18a51e7.png` | `hud_541_example.png` | 1672x941 | HUD example, BEAST #541 (layout reference only; identical backdrop) |
| `934bf5d2-da67-4d8b-8990-e53077f548b6.png` | `splash_example.png` | 1672x941 | Splash example: layout/colour/typography reference for the rebuilt splash screen (it is a flattened screenshot and is **not** used as UI) |
| `1f40bb36-8a89-47dc-b328-f5ffe1e3cf29.png` | `reference_composite_sheet.png` | 3456x2234 | Composite reference with captions (point values, enemy order, "BEAST #5167 / #541" caption (#5167 dismissed)). Reference only, not shipped in the game |

## 2. Extracted sprites (`public/assets/sprites/**`)

Method: alpha-channel connected components (the supplied sheets already carry transparency, solid alpha 250-255 with soft edges). Each component is cropped with a 2 px pad, pixels belonging to neighbouring artwork are cleared, alpha >= 200 is snapped to 255 and alpha < 40 to 0 (keeps the black pixel outlines crisp, removes haze). No resampling, no recolouring. A 2-pixel stray fleck in the spray sheet is discarded. Sprites are drawn with `imageSmoothingEnabled = false` (CSS `image-rendering: pixelated`) except the two illustrated player characters, which are down-scaled to 62 % with smoothing.

| Extracted file | Sprite | Source file | Source bounds (px, incl. 2 px pad) | Size | Notes |
|---|---|---|---|---|---|
| `assets/sprites/players/bear.png` | Player: brown bear-head | `8a792674-1eaa-483c-b540-ce523602ff9a.png` | x 56-374, y 36-438 | 318x402 | character key `bear`, ID **#5761** |
| `assets/sprites/players/white_horned.png` | Player: white head, black horns | `8a792674-1eaa-483c-b540-ce523602ff9a.png` | x 46-370, y 499-894 | 324x395 | character key `white_horned`, ID **#541** |
| `assets/sprites/enemies/heros.png` | Enemy: HEROS (hooded, red cape) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 21-217, y 38-240 | 196x202 | 5 pts |
| `assets/sprites/enemies/fents.png` | Enemy: FENTS (brown-haired, tan clothes) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 285-474, y 41-240 | 189x199 | 10 pts |
| `assets/sprites/enemies/bots.png` | Enemy: BOTS (blue armoured robot) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 547-731, y 41-239 | 184x198 | 20 pts |
| `assets/sprites/enemies/cops.png` | Enemy: COPS (blue police officer) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 26-204, y 297-459 | 178x162 | 50 pts |
| `assets/sprites/enemies/dogs.png` | Enemy: DOGS (dark robo-dog) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 285-477, y 310-459 | 192x149 | 10 pts |
| `assets/sprites/enemies/drones.png` | Enemy: DRONES (flying drone) | `c2b4d0e3-ad07-4198-840c-3886e6b197b5.png` | x 538-751, y 310-415 | 213x105 | 10 pts |
| `assets/sprites/collectibles/gold_can.png` | Gold spray can | `ba7b1740-f0a6-4489-991f-46388c1a69d8.png` | x 83-177, y 55-202 | 94x147 | 100 pts |
| `assets/sprites/collectibles/gold_mask.png` | Gold balaclava mask | `ba7b1740-f0a6-4489-991f-46388c1a69d8.png` | x 329-452, y 52-202 | 123x150 | 50 pts (special pickup effect) |
| `assets/sprites/collectibles/smart_bomb.png` | Smart bomb pickup (wave 13+) | `smart_bomb_source.png` | x 65-314, y 82-403 | 249x321 | no points; detonates on pickup (clears all on-screen enemies), listed under `collectibles` in `manifest.json`; drawn at 0.38 scale, pixelated |
| `assets/sprites/spray/spray_short.png` | Spray - short | `93961aa5-b2eb-44da-bf2c-470ad17a8b1e.png` | x 133-288, y 74-144 | 155x70 | tier `short` |
| `assets/sprites/spray/spray_medium.png` | Spray - medium | `93961aa5-b2eb-44da-bf2c-470ad17a8b1e.png` | x 85-335, y 173-255 | 250x82 | tier `medium` |
| `assets/sprites/spray/spray_long.png` | Spray - long | `93961aa5-b2eb-44da-bf2c-470ad17a8b1e.png` | x 29-383, y 281-377 | 354x96 | tier `long` |

Enemy-to-type mapping (confirmed correct by the user): the enemy sheet carries no captions, so the reading order (top row left-to-right, then bottom row) is mapped to the reference list order **HEROS, FENTS, BOTS / COPS, DOGS, DRONES**. This matches the artwork (cop uniform, robot, robo-dog, drone). Swap file names in `public/assets/sprites/enemies/` if any sprite should map differently.

Derived UI crops (cropped from the supplied player art, not redrawn): `public/assets/ui/head_bear.png` (sprite rows 0-152, cols 36-214) and `public/assets/ui/head_white_horned.png` (rows 0-156, cols 0-250), used as HUD life icons. Splash character frames use the full player sprites via CSS (cropped by the frame).

## 3. Configurable character IDs

`public/assets/manifest.json` (copied to `dist/assets/manifest.json`, **editable after build, no rebuild needed**; fallback copy in `src/config.js` -> `CONFIG.characters`):

```json
{ "key": "bear",         "id": "5761", ... }
{ "key": "white_horned", "id": "541",  ... }
```

Fields: `key` (internal), `id` (display label shown as `BEAST #<id>` on splash + HUD), `sprite`, `head` (life icon), `muzzle` (spray can nozzle in sprite pixels, facing right).

### ID discrepancy - RESOLVED (confirmed by the user)
Final IDs: bear **#5761**, white-horned **#541** (matches the splash and HUD example art). The earlier-spec value #0960 was superseded, and the "#5167" bear caption on the reference sheet was dismissed as a typo/outdated. IDs stay editable in `manifest.json` without a rebuild. The enemy order (HEROS, FENTS, BOTS, COPS, DOGS, DRONES) was also confirmed correct.

## 4. Backgrounds (`public/assets/backgrounds/alley_clean.png`, 1672x941)

Source: `hud_5761_example.png` (the HUD examples are the only full-frame alley art supplied). The baked-in HUD was removed so the HUD can be rebuilt live from DOM/canvas:
- **Bottom 748-941 px (all bottom HUD panels, instruction bar, credit stripe)**: *developer-repainted* - the wet-pavement rows 640-748 are mirror-extended downward (reflect tiling), slightly darkened toward the bottom edge. This reads as a puddle reflection (e.g. the hydrant reflection at lower right).
- **Top HUD panels** (rects [[14, 10, 386, 156], [1300, 10, 1664, 90], [1378, 90, 1644, 162]]): OpenCV Telea inpaint. The result is smeared, so the DOM HUD panels are positioned/sized to completely cover these rects during gameplay; on the splash screen the same corners are covered by developer-made green splash decals.
- Everything else (buildings, AKCB/MARVERSAL graffiti, dumpster, fence, hydrant, lamp, skyline) is untouched supplied art.

**Splash backdrop**: the splash example's centre is covered by UI and its alley is a different render than the HUD examples (a homography match failed), so the splash reuses the same cleaned alley backdrop, with the title, tagline, SELECT BEAST heading, frames and PRESS START rebuilt as live DOM (fonts: Permanent Marker, Chakra Petch, Bangers - open-licence, bundled via @fontsource, no network needed).

## 5. Developer-made art (not supplied)

| File | What | Why |
|---|---|---|
| `public/assets/ui/splash_green_{1,2,3}.png` | Pixel-style green paint-splash decals (generated by `tools/make_splashes.py`) | The splash example has green splashes but no separable splash sprite was supplied |
| In-code smart-bomb effects | Green vaporisation particles, white/green triple shockwave rings, green screen flash, shake, WebAudio explosion | Spec asks for them; no supplied art |
| `public/favicon.png` | Copy of `head_bear.png` | favicon |
| In-code effects | Green square-pixel particles (spray hit / vaporise dissolve), gold sparkle/ring effects, shadows, aura | Spec asks for these effects; no supplied art |
| HUD frames, fonts | CSS chamfered neon panels recreated from the HUD examples | HUD must be functional |
