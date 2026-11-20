#!/usr/bin/env python3
"""Trim white margins from the generated figures so widths map to real ink."""

import glob
from PIL import Image, ImageChops

PAD = 10
for f in sorted(glob.glob("/Users/venice/taa-app-fullstack/docs/capstone/fig_*.png")):
    im = Image.open(f).convert("RGB")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda p: 255 if p > 8 else 0)
    box = diff.getbbox()
    if not box:
        continue
    box = (max(box[0] - PAD, 0), max(box[1] - PAD, 0),
           min(box[2] + PAD, im.width), min(box[3] + PAD, im.height))
    out = im.crop(box)
    out.save(f)
    print(f.split("/")[-1], out.size, round(out.width / out.height, 3))
