"""Extract the supplied smart-bomb art (source_assets/smart_bomb_source.png) with real transparency.

Same recipe as the other collectibles (tools/extract_assets.py): keep the largest alpha component,
crop with a 2 px pad, snap alpha >= 200 to 255 and < 40 to 0. No resampling, no recolouring.
If the source still has an opaque white background, it is first removed by flood-filling white from
the borders (the black pixel outline stops the fill, so the bomb's own highlights are kept).
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'source_assets/smart_bomb_source.png'
OUT = 'public/assets/sprites/collectibles/smart_bomb.png'

a = np.array(Image.open(SRC).convert('RGBA'))
if (a[..., 3] > 250).mean() > 0.9:
    white = (a[..., :3].min(axis=2) >= 235)
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    a[np.isin(lab, list(border)), 3] = 0

alpha = a[..., 3]
lab, n = ndimage.label(alpha >= 40, structure=np.ones((3, 3)))
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
keep = lab == (1 + int(np.argmax(sizes)))
alpha = np.where(keep, alpha, 0)
alpha = np.where(alpha >= 200, 255, np.where(alpha < 40, 0, alpha)).astype(np.uint8)
a[..., 3] = alpha
a[alpha == 0, :3] = 0

ys, xs = np.where(alpha > 0)
pad = 2
x0, x1 = max(0, xs.min() - pad), min(a.shape[1], xs.max() + 1 + pad)
y0, y1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + 1 + pad)
Image.fromarray(a[y0:y1, x0:x1]).save(OUT, optimize=True)
print(json.dumps({'file': OUT, 'source_bounds': [int(x0), int(y0), int(x1), int(y1)], 'size': [int(x1 - x0), int(y1 - y0)]}))
