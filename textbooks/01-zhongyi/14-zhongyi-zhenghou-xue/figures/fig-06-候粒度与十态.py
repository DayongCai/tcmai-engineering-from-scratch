# -*- coding: utf-8 -*-
"""图 6 粒度：每证多少候，以及十个最高频的态

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「22 证位 + 71 候位」「12 门 + 45 类」「实测非零格」

口径：左＝「每证候数」的直方图（x 为候数，y 为证数），中位数与极值直接标注；
右＝全书 99 态里出现最多的十个（一次候条目计一次，含同一候号在不同证下的复用）。
两图合看回答一个问题：这本辞典的条目粗细是否一致 —— 答案是不一致，且原书就是这么切的。
"""

import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas_grid, save, INK, MUTED, ACCENT

STRUCT = json.loads((ROOT / "standards" / "zhenghou-cidian" / "结构.json").read_text(encoding="utf-8"))

steps = [
    ("22 证位 + 71 候位", "axes"),
    ("12 门 + 45 类", "lei"),
    ("实测非零格", "cells"),
]

per_zheng = [len(z["houList"]) for m in STRUCT["men"] for l in m["lei"] for z in l["zhengList"]]
tai = {}
for m in STRUCT["men"]:
    for l in m["lei"]:
        for z in l["zhengList"]:
            for h in z["houList"]:
                tai[h["tai"]] = tai.get(h["tai"], 0) + 1

med = statistics.median(per_zheng)
fig, (ax1, ax2) = canvas_grid(1, 2, w=10.6, h=4.2, gridspec_kw={"width_ratios": [1, 1.18]})

bins = np.arange(0.5, max(per_zheng) + 1.5, 1.0)
ax1.hist(per_zheng, bins=bins, color=ACCENT, alpha=0.72, edgecolor="#fbf8f2", linewidth=0.6, zorder=3)
ax1.axvline(med, color=INK, ls=(0, (4, 3)), lw=1.3, zorder=4)
ax1.text(med + 0.5, ax1.get_ylim()[1] * 0.86, "中位 %.1f 候" % med, fontsize=9, color=INK)
ax1.set_title("每证候数：%d 条证的粗细分布" % len(per_zheng), fontsize=11.2, pad=10)
ax1.set_xlabel("一个证下的候数", fontsize=9.4, color=MUTED)
ax1.set_ylabel("证数", fontsize=9.4, color=MUTED)
ax1.grid(axis="y", alpha=0.3, zorder=0)
ax1.set_axisbelow(True)
ax1.text(0.02, -0.22, "最多 %d 候，最少 %d 候｜共 %d 条候条目" % (
    max(per_zheng), min(per_zheng), sum(per_zheng)),
    transform=ax1.transAxes, fontsize=8, color=MUTED)

top = sorted(tai.items(), key=lambda kv: -kv[1])[:10][::-1]
names = [t for t, _ in top]
vals = [v for _, v in top]
ax2.barh(names, vals, color="#5f4f8f", alpha=0.78, height=0.58, zorder=3)
for i, v in enumerate(vals):
    ax2.text(v + 0.4, i, str(v), va="center", fontsize=8.6, color=INK)
ax2.set_title("十个最高频的态（全书 %d 态）" % len(tai), fontsize=11.2, pad=10)
ax2.set_xlabel("候条目数", fontsize=9.4, color=MUTED)
ax2.grid(axis="x", alpha=0.3, zorder=0)
ax2.set_axisbelow(True)
ax2.tick_params(axis="y", length=0)
ax2.set_xlim(0, max(vals) * 1.16)
ax2.text(0.0, -0.22, "前十态占全部候条目的 %.0f%%" % (100.0 * sum(vals) / sum(tai.values())),
         transform=ax2.transAxes, fontsize=8, color=MUTED)

fig.text(0.012, 0.005,
         "源：standards/zhenghou-cidian/结构.json · 粒度不齐不是缺陷：火门与虚门的证天然有更多子型",
         fontsize=7.4, color=MUTED)

save(fig)
