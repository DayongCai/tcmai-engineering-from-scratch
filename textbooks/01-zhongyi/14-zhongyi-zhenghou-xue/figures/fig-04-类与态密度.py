# -*- coding: utf-8 -*-
"""图 4 四十五类 × 态：每一类的「错法」指纹

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「12 门 + 45 类」「态 property」「位 × 类 × 态」
  「实测非零格」「格子里是候数」

口径：行＝45 类（L01…L45，保持原书顺序），列＝出现最多的 12 个态，格值＝该类的候数。
一类若在某一态上明显高，就是这一类的「指纹」；指纹重叠太多的两类，读者就该怀疑它们是同一件事。
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas, save, INK, MUTED

STRUCT = json.loads((ROOT / "standards" / "zhenghou-cidian" / "结构.json").read_text(encoding="utf-8"))
XING = json.loads((ROOT / "standards" / "zhenghou-cidian" / "语素-性.json").read_text(encoding="utf-8"))

steps = [
    ("12 门 + 45 类", "lei"),
    ("态 property", "state"),
    ("张量形状", "shape"),
    ("实测非零格", "cells"),
    ("实测非零格", "cells2"),
]

rows = [l["code"] for l in XING["类"]]
lei_zh = {l["code"]: l["zh"] for l in XING["类"]}

count = {}
tai_total = {}
for m in STRUCT["men"]:
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                count[(l["code"], h["tai"])] = count.get((l["code"], h["tai"]), 0) + 1
                tai_total[h["tai"]] = tai_total.get(h["tai"], 0) + 1

TOP = 12
cols = [t for t, _ in sorted(tai_total.items(), key=lambda kv: -kv[1])[:TOP]]
mat = np.zeros((len(rows), TOP))
for i, lc in enumerate(rows):
    for j, t in enumerate(cols):
        mat[i, j] = count.get((lc, t), 0)

fig, ax = canvas(w=7.6, h=8.6)
im = ax.imshow(mat, cmap="BuPu", aspect="auto", vmin=0, vmax=max(1.0, mat.max()))
ax.set_xticks(range(TOP))
ax.set_xticklabels(cols, rotation=42, ha="right", fontsize=9)
ax.set_yticks(range(len(rows)))
ax.set_yticklabels(["%s %s" % (lc, lei_zh[lc]) for lc in rows], fontsize=7.6)
ax.tick_params(length=0)
for s in ax.spines.values():
    s.set_visible(False)

for i in range(len(rows)):
    for j in range(TOP):
        v = int(mat[i, j])
        if v >= 3:
            ax.text(j, i, v, ha="center", va="center", fontsize=6.6,
                    color="#ffffff" if v > mat.max() * 0.55 else INK)

ax.set_title("四十五类 × 十二态：一类的「指纹」就是它在哪几个态上亮", fontsize=11.5, pad=12)
ax.set_xlabel("态（出现最多的 12 个，按全书频次排序）", fontsize=9.5, color=MUTED)
ax.set_ylabel("类（L01…L45，原书顺序）", fontsize=9.5, color=MUTED)

cb = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
cb.set_label("候数", fontsize=9, color=MUTED)
cb.outline.set_visible(False)

fig.text(0.012, 0.008,
         "源：standards/zhenghou-cidian/结构.json + 语素-性.json · 只标 ≥3 的格，避免数字糊成一片",
         fontsize=7.4, color=MUTED)

save(fig)
