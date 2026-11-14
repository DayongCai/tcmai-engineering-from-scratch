# -*- coding: utf-8 -*-
"""图 5 二百九十一证在位 × 性平面上的分布

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「位 locus」「22 证位 + 71 候位」「12 门 + 45 类」「位 × 类 × 态」

口径：横轴 = 22 个证位（按证数降序），纵轴 = 45 个类（原书顺序 L01…L45 自下而上），
气泡面积 = 该证下的候数，颜色 = 所属门。空白的格子在书里不存在 —— 这张图的留白
就是「还没被命名的证候」的候选区。
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas, save, INK, MUTED, LINE

STRUCT = json.loads((ROOT / "standards" / "zhenghou-cidian" / "结构.json").read_text(encoding="utf-8"))
WEI = json.loads((ROOT / "standards" / "zhenghou-cidian" / "语素-位.json").read_text(encoding="utf-8"))
XING = json.loads((ROOT / "standards" / "zhenghou-cidian" / "语素-性.json").read_text(encoding="utf-8"))

steps = [
    ("位 locus", "locus"),
    ("22 证位 + 71 候位", "axes"),
    ("12 门 + 45 类", "lei"),
    ("张量形状", "shape"),
]

# 门 → 颜色（同门同色，一眼能看出火门/虚门的体量）
MEN_COLOR = {
    "M01": "#2f6f9f", "M02": "#1f4f7a", "M03": "#3f8f6f", "M04": "#6f8f3f",
    "M05": "#a08f4f", "M06": "#b5443a", "M07": "#8f5f3f", "M08": "#7a3f5f",
    "M09": "#5f4f8f", "M10": "#3f6f8f", "M11": "#8f7a3f", "M12": "#8a5a2b",
}

points = []
for m in STRUCT["men"]:
    for l in m["lei"]:
        for z in l["zhengList"]:
            points.append((z["wei"], l["code"], len(z["houList"]), m["code"]))

wei_count = {}
for w, _, n, _ in points:
    wei_count[w] = wei_count.get(w, 0) + 1
wei_order = [w["zh"] for w in WEI["证位"]]  # 语素表已按证数降序排列
lei_order = [l["code"] for l in XING["类"]]
lei_zh = {l["code"]: l["zh"] for l in XING["类"]}

fig, ax = canvas(w=9.0, h=9.4)
for i, lc in enumerate(lei_order):
    ax.axhline(i, color=LINE, lw=0.5, zorder=0, alpha=0.55)
for j, _ in enumerate(wei_order):
    ax.axvline(j, color=LINE, lw=0.5, zorder=0, alpha=0.35)

for w, lc, n, mc in points:
    if w not in wei_order or lc not in lei_order:
        continue
    x = wei_order.index(w)
    y = lei_order.index(lc)
    ax.scatter(x, y, s=26 + 21 * n, color=MEN_COLOR.get(mc, INK), alpha=0.62,
               edgecolors=MEN_COLOR.get(mc, INK), linewidths=0.7, zorder=3)

ax.set_xticks(range(len(wei_order)))
ax.set_xticklabels(wei_order, fontsize=8.6)
ax.set_yticks(range(len(lei_order)))
ax.set_yticklabels(["%s %s" % (c, lei_zh[c]) for c in lei_order], fontsize=7.2)
ax.set_xlim(-0.7, len(wei_order) - 0.3)
ax.set_ylim(-0.7, len(lei_order) - 0.3)
ax.tick_params(length=0)
for s in ax.spines.values():
    s.set_visible(False)

ax.set_title("二百九十一证 = 22 位 × 45 类的稀疏落点（气泡＝候数）", fontsize=12, pad=12)
ax.set_xlabel("证位（位轴；按证数降序）", fontsize=9.5, color=MUTED)
ax.set_ylabel("类（性轴二级；L01 在下，L45 在上）", fontsize=9.5, color=MUTED)

filled = len({(w, lc) for w, lc, _, _ in points})
fig.text(0.012, 0.008,
         "源：standards/zhenghou-cidian/结构.json · 已落点 %d 格 / 理论 22×45=990 格（%.1f%%）—— 留白即未命名区"
         % (filled, 100.0 * filled / 990.0),
         fontsize=7.6, color=MUTED)

save(fig)
