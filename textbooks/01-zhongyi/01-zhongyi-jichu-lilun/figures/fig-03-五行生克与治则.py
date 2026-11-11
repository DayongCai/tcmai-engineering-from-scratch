# -*- coding: utf-8 -*-
"""图 3-1 五行生克与治则推演

内容依据：textbooks/01-zhongyi/01-zhongyi-jichu-lilun/03-第3章-哲学基础与思维方法.md §2.3.3
  §2.3.3.1「五行学说将自然界的五方、五季、五气、五味与人体的五脏、五体、五官等联系起来，
    构建了'天人相应'的大系统。例如，春季属木，风气主令，人体肝气随之升发，故春季养生重在疏肝」
  §2.3.3.2「诊断上，五行理论用于综合分析色、脉、症的内在联系，如面见青色、喜食酸味、脉弦多为肝病。
    治疗上，依据五行生克规律确立治则，如'培土生金'（健脾益肺）、'滋水涵木'（滋肾养肝）」

与站点动画图 wuxing-cycle 的分工：动画逐帧演示相生相克的流动方向；本图是静态的，
讲动画图讲不了的那一步 —— 生克关系怎么落成一条可执行的治则（土生金 → 培土生金）。

图上只出现正文点名的两个治则（培土生金、滋水涵木），不补充其他治则 ——
其余治则（如抑木扶土、泻南补北）本章未写，画上去就是替教材立论。
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "scripts" / "figures"))

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Circle

from tcm_figure import canvas, save, INK, MUTED, LINE, WUXING, PAPER, ACCENT

NAMES = ["木", "火", "土", "金", "水"]
R = 1.0
ANG = [np.pi / 2 - i * 2 * np.pi / 5 for i in range(5)]     # 顶部起顺时针
POS = [(R * np.cos(a), R * np.sin(a)) for a in ANG]

SHENG_C = "#4a7c59"     # 相生：青
KE_C = "#b5443a"        # 相克：赤
HILITE = "#b8860b"      # 治则高亮：土黄

fig, ax = canvas(8.4, 8.4)
ax.set_aspect("equal")
ax.axis("off")
ax.set_xlim(-1.78, 1.16)
ax.set_ylim(-1.78, 1.66)

# ── 相生：外圈顺时针弧 ──
for i in range(5):
    j = (i + 1) % 5
    a, b = POS[i], POS[j]
    rad = 0.22
    is_hilite = (i, j) in [(2, 3), (4, 0)]        # 土→金、水→木
    ax.add_patch(FancyArrowPatch(
        a, b, connectionstyle=f"arc3,rad={rad}",
        arrowstyle="-|>,head_length=10,head_width=6",
        color=HILITE if is_hilite else SHENG_C,
        lw=3.0 if is_hilite else 1.9,
        alpha=1.0 if is_hilite else 0.55,
        shrinkA=17, shrinkB=18, zorder=2,
    ))

# ── 相克：内五角星 ──
for i in range(5):
    j = (i + 2) % 5
    a, b = POS[i], POS[j]
    ax.plot([a[0], b[0]], [a[1], b[1]], color=KE_C, lw=1.3,
            ls=(0, (5, 4)), alpha=0.42, zorder=1)

# ── 五行节点 ──
for i, name in enumerate(NAMES):
    x, y = POS[i]
    ax.add_patch(Circle((x, y), 0.155, facecolor=PAPER, edgecolor=WUXING[name],
                        lw=2.2, zorder=4))
    ax.text(x, y + 0.02, name, ha="center", va="center", fontsize=21,
            color=WUXING[name], zorder=5)

# ── 治则标注（只用正文点名的两条）──
def edge_mid(i, j, off):
    a, b = POS[i], POS[j]
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    n = np.hypot(mx, my)
    return mx + off * mx / n, my + off * my / n

x1, y1 = edge_mid(2, 3, 0.46)
ax.annotate("土生金 →「培土生金」\n健脾益肺", xy=edge_mid(2, 3, 0.10), xytext=(x1 + 0.30, y1 - 0.10),
            fontsize=9.6, color=HILITE, ha="left", va="center", linespacing=1.7, zorder=6,
            arrowprops=dict(arrowstyle="-|>", color=HILITE, lw=1.3,
                            connectionstyle="arc3,rad=0.2"))

x2, y2 = edge_mid(4, 0, 0.46)
ax.annotate("水生木 →「滋水涵木」\n滋肾养肝", xy=edge_mid(4, 0, 0.10), xytext=(x2 - 0.34, y2 + 0.02),
            fontsize=9.6, color=HILITE, ha="right", va="center", linespacing=1.7, zorder=6,
            arrowprops=dict(arrowstyle="-|>", color=HILITE, lw=1.3,
                            connectionstyle="arc3,rad=-0.2"))

# ── 图例与说明 ──
ax.text(-1.64, 1.50, "外圈实线：相生（顺时针）　　内圈虚线：相克（五角星）",
        fontsize=9.2, color=MUTED, va="center")
ax.text(-1.64, -1.60,
        "生克是关系，「治则」是关系给出的动作 —— 本章只点了培土生金与滋水涵木两条。",
        fontsize=9.0, color=MUTED, va="center")
ax.text(-1.64, -1.74,
        "天人相应举例（§2.3.3.1）：春季属木，风气主令，肝气升发，故春季养生重在疏肝。",
        fontsize=9.0, color=MUTED, va="center")

save(fig)
