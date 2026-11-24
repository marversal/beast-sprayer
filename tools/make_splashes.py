#!/usr/bin/env python3
"""Developer-made green paint-splash decals for the splash screen (not supplied art).
Pixel-style: drawn at low resolution, upscaled with nearest-neighbour."""
import math
import os
import random
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets", "ui")
SCALE = 5


def splash(seed, w=120, h=80):
    rnd = random.Random(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx, cy = w / 2, h / 2
    ang = np.arctan2((yy - cy) / (h / w), xx - cx)
    dist = np.hypot(xx - cx, (yy - cy) / (h / w))
    spikes = rnd.randint(9, 13)
    ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    prof = 0.50 + 0.22 * np.maximum(0, np.sin(ang * spikes + ph[0])) ** 3 \
        + 0.10 * np.sin(ang * 5 + ph[1]) + 0.05 * np.sin(ang * 13 + ph[2])
    m = dist < prof * (w * 0.5)
    for _ in range(14):  # satellite droplets
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(0.55, 0.95) * w * 0.5
        bx, by = cx + math.cos(a) * d, cy + math.sin(a) * d * (h / w)
        r = rnd.uniform(1.2, 3.6)
        m |= (xx - bx) ** 2 + (yy - by) ** 2 < r * r
    for _ in range(5):  # drips
        bx = cx + rnd.uniform(-w * .3, w * .3)
        by = cy + rnd.uniform(0, h * .2)
        ln = rnd.randint(8, 20)
        m |= (np.abs(xx - bx) < 1.6) & (yy > by) & (yy < by + ln)
        m |= (xx - bx) ** 2 + (yy - by - ln) ** 2 < 4.5
    inner = ndi.binary_erosion(m, iterations=2)
    hi = ndi.binary_erosion(m, iterations=4) & (np.hypot(xx - cx * 0.8, yy - cy * 0.7) < w * 0.16)
    hi |= ndi.binary_erosion(m, iterations=3) & (np.hypot(xx - cx * 1.25, yy - cy * 1.3) < w * 0.05)
    edge = m & ~ndi.binary_erosion(m, iterations=1)
    img = np.zeros((h, w, 4), np.uint8)
    img[m] = (46, 150, 20, 255)
    img[inner] = (110, 235, 40, 255)
    img[hi] = (190, 255, 70, 255)
    img[edge] = (12, 40, 8, 255)
    return Image.fromarray(img).resize((w * SCALE, h * SCALE), Image.NEAREST)


for i, seed in enumerate([3, 11, 27]):
    splash(seed).save(os.path.join(OUT, f"splash_green_{i + 1}.png"))
print("ok")
