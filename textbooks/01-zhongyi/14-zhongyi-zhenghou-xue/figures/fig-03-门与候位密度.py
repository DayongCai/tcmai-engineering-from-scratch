# -*- coding: utf-8 -*-
"""图 3 十二门 × 候位：密度落在哪一层

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「位 locus」「22 证位 + 71 候位」
  「位 × 类 × 态」「实测非零格」
  「格子里是候数」

口径：格子值 = 该门下该候位出现的候条数（同一候号在不同证下出现，各计一次 —— 与
结构.json 的 houInstances 同口径）。只取出现次数前 18 的候位作列，其余归入「其他」，
避免 62 列挤成一条线。
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas, save, INK, MUTED, ACCENT, WUXING

STRUCT = json.loads((ROOT / "standards" / "zhenghou-cidian" / "结构.json").read_text(encoding="utf-8"))

steps = [
    ("位 locus", "locus"),
    ("22 证位 + 71 候位", "axes"),
    ("张量形状", "shape"),
    ("实测非零格", "cells"),
    ("实测非零格", "cells2"),
]

men = STRUCT["men"]
order = []
for m in men:
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                if h["wei"] not in order:
                    order.append(h["wei"])

count = {}
for m in men:
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                count[(m["code"], h["wei"])] = count.get((m["code"], h["wei"]), 0) + 1

rank = sorted(order, key=lambda w: -sum(v for (mc, ww), v in count.items() if ww == w))
TOP = 18
cols = rank[:TOP]
other = {m["code"]: 0 for m in men}
for (mc, w), v in count.items():
    if w not in cols:
        other[mc] += v

mat = np.zeros((len(men), TOP + 1))
for i, m in enumerate(men):
    for j, w in enumerate(cols):
        mat[i, j] = count.get((m["code"], w), 0)
    mat[i, TOP] = other[m["code"]]

fig, ax = canvas(w=9.6, h=5.4)
im = ax.imshow(mat, cmap="YlOrBr", aspect="auto", vmin=0, vmax=max(1.0, mat.max()))

ax.set_xticks(range(TOP + 1))
ax.set_xticklabels(cols + ["其他"], rotation=42, ha="right", fontsize=9)
ax.set_yticks(range(len(men)))
ax.set_yticklabels(["%s %s门" % (m["code"], m["zh"]) for m in men], fontsize=9.5)

for i in range(len(men)):
    for j in range(TOP + 1):
        v = int(mat[i, j])
        if v:
            ax.text(j, i, v, ha="center", va="center", fontsize=7.6,
                    color="#ffffff" if v > mat.max() * 0.55 else INK)

ax.set_title("十二门 × 候位：每一格是该门在该层收到的候数", fontsize=12, pad=12)
share = 100.0 * sum(other.values()) / max(1, sum(other.values()) + sum(count.values()) - sum(other.values()))
ax.set_xlabel("候位（位轴，取出现最多的 %d 个；其余 %d 位归「其他」，占 %.0f%%）"
              % (TOP, len(order) - TOP, share), fontsize=9.6, color=MUTED)
ax.set_ylabel("门（性轴的一级）", fontsize=10, color=MUTED)
ax.tick_params(length=0)
for s in ax.spines.values():
    s.set_visible(False)

cb = fig.colorbar(im, ax=ax, fraction=0.024, pad=0.015)
cb.set_label("候数", fontsize=9, color=MUTED)
cb.outline.set_visible(False)

fig.text(0.012, 0.012,
         "源：standards/zhenghou-cidian/结构.json（1866 条候条目现算）· 空格不是「不存在」，是这本书没收到",
         fontsize=7.6, color=MUTED)

save(fig)
