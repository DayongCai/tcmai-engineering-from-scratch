# -*- coding: utf-8 -*-
"""图 10 十二门 × 六族：危候长在哪一格

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「失守／郁／虚／火／陷逆／脱绝」
  「候（亚目级）」
  「非零格」

口径：格子值 = 该门下该族候的条数（一门 1866 条里的份额）。族的归属取自
语素-态.json 的 族 字段，不重新分类；空格就是 0，不填假值。
读法：热的是「这一门最容易走到哪一步」。脱绝一列只要不为 0，这一门就必须有
危候直通就医的通道 —— 这是 APP 分流的硬条件。
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas, save, INK, MUTED, ACCENT

STD = ROOT / "standards" / "zhenghou-cidian"
STRUCT = json.loads((STD / "结构.json").read_text(encoding="utf-8"))
TAI = json.loads((STD / "语素-态.json").read_text(encoding="utf-8"))

steps = [
    ("失守／郁／虚／火／陷逆／脱绝", "fam"),
    ("候（亚目级）", "n"),
    ("非零格", "cells"),
]

ORDER = ["失守", "郁", "虚", "火", "陷逆", "脱绝"]   # 从左到右＝恶化方向，与图 7 同一顺序
FAMS = [f for f in ORDER if any(x["id"] == f for x in TAI["族"])]
FAM_ZH = {f["id"]: f["id"] for f in TAI["族"]}
BY_TAI = {t["zh"]: t.get("族") for t in TAI["态"] if t.get("族")}

men = STRUCT["men"]
grid = np.zeros((len(men), len(FAMS)), dtype=int)
for i, m in enumerate(men):
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                fam = BY_TAI.get(h.get("tai") or "")
                if fam in FAMS:
                    grid[i, FAMS.index(fam)] += 1

fig, ax = canvas(12.4, 7.4)   # canvas(w, h, dpi)：第三个参数是 dpi，不是标题
im = ax.imshow(grid, cmap="Oranges", aspect="auto")
ax.set_xticks(range(len(FAMS)))
ax.set_xticklabels(FAMS, fontsize=11)
ax.set_yticks(range(len(men)))
ax.set_yticklabels(["%s %s" % (m["code"], m["zh"]) for m in men], fontsize=9)
for i in range(grid.shape[0]):
    for j in range(grid.shape[1]):
        v = grid[i, j]
        if v:
            ax.text(j, i, str(v), ha="center", va="center", fontsize=8.5,
                    color="#ffffff" if v > grid.max() * 0.62 else INK)
ax.set_xlabel("开关族（越往右越危）", fontsize=11, color=INK)
ax.set_ylabel("门", fontsize=11, color=INK)
ax.set_title("十二门 × 六族：危候长在哪一格", fontsize=15, color=INK, pad=12)
cb = fig.colorbar(im, ax=ax, shrink=0.8)
cb.set_label("该门该族的候数", fontsize=10)
ax.text(0.0, -0.13, "内容依据：00-凡例与使用.md §3「失守／郁／虚／火／陷逆／脱绝」｜"
        "格子=该门该族候数，空格即 0（与结构.json 的 候条目 同口径）",
        transform=ax.transAxes, fontsize=8.5, color=MUTED)

save(fig)   # 输出路径由 render.js 从 argv[1] 传入
