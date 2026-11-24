#!/usr/bin/env python3
"""Slice the supplied sprite sheets into individual transparent PNGs and build
the cleaned alley backdrop. Re-runnable: python3 tools/extract_assets.py

Writes public/assets/** and tools/extraction_report.json (bounds used by
ASSET_MANIFEST.md)."""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source_assets")
OUT = os.path.join(ROOT, "public", "assets")
PAD = 2
report = {}


def load(name):
    return np.array(Image.open(os.path.join(SRC, name)).convert("RGBA"))


def components(a, min_px=200, dilate=6):
    m = a[..., 3] > 40
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=dilate))
    comps = []
    for i in range(1, n + 1):
        mm = m & (lab == i)
        if mm.sum() < min_px:
            continue  # stray specks (e.g. 2px fleck in the spray sheet)
        ys, xs = np.where(mm)
        comps.append(dict(x0=int(xs.min()), x1=int(xs.max()) + 1, y0=int(ys.min()), y1=int(ys.max()) + 1, mask=mm))
    return comps


def clean_alpha(rgba):
    """Source alpha is 250-255 in solid areas with soft anti-aliased edges.
    Snap near-opaque pixels to 255, drop faint haze, keep the rest untouched so
    the black outlines stay crisp."""
    rgba = rgba.copy()
    al = rgba[..., 3].astype(np.int32)
    al[al >= 200] = 255
    al[al < 40] = 0
    rgba[..., 3] = al.astype(np.uint8)
    rgba[al == 0, :3] = 0
    return rgba


def save_sprite(a, comp, path, key):
    h, w = a.shape[:2]
    x0, x1 = max(comp["x0"] - PAD, 0), min(comp["x1"] + PAD, w)
    y0, y1 = max(comp["y0"] - PAD, 0), min(comp["y1"] + PAD, h)
    crop = a[y0:y1, x0:x1].copy()
    keep = ndi.binary_dilation(comp["mask"][y0:y1, x0:x1], iterations=PAD + 3)
    crop[~keep, 3] = 0  # no neighbour artwork
    crop = clean_alpha(crop)
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    Image.fromarray(crop).save(full)
    report[key] = dict(file="assets/" + path, source_bounds=[x0, y0, x1, y1], size=[x1 - x0, y1 - y0])
    return crop


def sort_rows(comps, rows):
    comps = sorted(comps, key=lambda c: c["y0"])
    per = len(comps) // rows
    out = []
    for r in range(rows):
        out += sorted(comps[r * per:(r + 1) * per], key=lambda c: c["x0"])
    return out


# ---- players (2 comps, top = bear #5761, bottom = white horned) ----
a = load("8a792674-1eaa-483c-b540-ce523602ff9a.png")
pc = sorted(components(a), key=lambda c: c["y0"])
assert len(pc) == 2, len(pc)
bear = save_sprite(a, pc[0], "sprites/players/bear.png", "player_bear")
horn = save_sprite(a, pc[1], "sprites/players/white_horned.png", "player_white_horned")
# Life-icon heads: plain crops of the head region of the same artwork (no redraw).
Image.fromarray(bear[0:152, 36:214]).save(os.path.join(OUT, "ui/head_bear.png"))
Image.fromarray(horn[0:156, 0:250]).save(os.path.join(OUT, "ui/head_white_horned.png"))

# ---- enemies (reading order = HEROS, FENTS, BOTS / COPS, DOGS, DRONES) ----
a = load("c2b4d0e3-ad07-4198-840c-3886e6b197b5.png")
ec = sort_rows(components(a), 2)
assert len(ec) == 6, len(ec)
for c, nm in zip(ec, ["heros", "fents", "bots", "cops", "dogs", "drones"]):
    save_sprite(a, c, f"sprites/enemies/{nm}.png", "enemy_" + nm)

# ---- collectibles ----
a = load("ba7b1740-f0a6-4489-991f-46388c1a69d8.png")
cc = sorted(components(a), key=lambda c: c["x0"])
assert len(cc) == 2
save_sprite(a, cc[0], "sprites/collectibles/gold_can.png", "collectible_gold_can")
save_sprite(a, cc[1], "sprites/collectibles/gold_mask.png", "collectible_gold_mask")

# ---- spray lengths ----
a = load("93961aa5-b2eb-44da-bf2c-470ad17a8b1e.png")
sc = sorted(components(a), key=lambda c: c["y0"])
assert len(sc) == 3, len(sc)
for c, nm in zip(sc, ["short", "medium", "long"]):
    save_sprite(a, c, f"sprites/spray/spray_{nm}.png", "spray_" + nm)

# ---- gameplay backdrop: HUD example with baked-in HUD removed ----
bg = np.array(Image.open(os.path.join(SRC, "hud_5761_example.png")).convert("RGB"))
H, W = bg.shape[:2]
import cv2

# 1) bottom: everything below y=748 is HUD frame -> reflect-extend clean pavement rows
CUT = 748
band = bg[640:CUT]
need = H - CUT
rows = []
k = 0
while len(rows) < need:
    seg = band[::-1] if k % 2 == 0 else band
    rows.extend(list(seg))
    k += 1
ext = np.array(rows[:need])
bg2 = bg.copy()
bg2[CUT:] = ext
# soften the seam and darken slightly toward the bottom edge
seam = cv2.GaussianBlur(bg2, (0, 0), 3)
for y in range(CUT - 4, CUT + 5):
    t = (y - (CUT - 4)) / 8.0
    bg2[y] = (bg2[y] * (1 - t * 0) * 1.0).astype(np.uint8)
    bg2[y] = (seam[y] * 0.6 + bg2[y] * 0.4).astype(np.uint8)
grad = np.linspace(1.0, 0.72, need)[:, None, None]
bg2[CUT:] = (bg2[CUT:] * grad).astype(np.uint8)

# 2) top HUD panels: inpaint (the DOM HUD re-covers these areas)
mask = np.zeros((H, W), np.uint8)
for (x0, y0, x1, y1) in [(14, 10, 386, 156), (1300, 10, 1664, 90), (1378, 90, 1644, 162)]:
    mask[y0:y1, x0:x1] = 255
bg2 = cv2.inpaint(bg2, mask, 9, cv2.INPAINT_TELEA)
Image.fromarray(bg2).save(os.path.join(OUT, "backgrounds/alley_clean.png"))
report["background_alley_clean"] = dict(
    file="assets/backgrounds/alley_clean.png", size=[W, H],
    source="hud_5761_example.png",
    repainted=dict(bottom_rows=[CUT, H], top_inpaint_rects=[[14, 10, 386, 156], [1300, 10, 1664, 90], [1378, 90, 1644, 162]]))

with open(os.path.join(ROOT, "tools", "extraction_report.json"), "w") as f:
    json.dump(report, f, indent=1)
print(json.dumps({k: v.get("size") for k, v in report.items()}, indent=0))
