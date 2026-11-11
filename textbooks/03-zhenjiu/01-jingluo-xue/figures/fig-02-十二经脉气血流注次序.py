# -*- coding: utf-8 -*-
"""图 1-2 十二经脉气血流注次序（如环无端）

内容依据：textbooks/03-zhenjiu/01-jingluo-xue/01-第1章-经络概述.md §1.2.2
  · 次序原文「始于手太阴肺经……再交足阳明胃经、足太阴脾经……手厥阴心包经、
    手少阳三焦经、足少阳胆经、足厥阴肝经，自肝经上注肺，再返回至肺经」
  · 十二个交接部位逐条取自 §1.2.2.1 交接规律三则（四肢末端 / 头面 / 胸中）
  · 走向规律取自同节《灵枢·逆顺肥瘦》引文

为什么用环形而不是流程图：流注是闭合循环，线性排列会把「复注于肺」这个关键事实
画成一条断掉的箭头。环上相邻两经之间的弧即一次交接，标注交接部位。
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch

from tcm_figure import canvas, save, INK, MUTED, LINE, WUXING

# (经名, 手足, 阴阳, 与下一经的交接部位)
MERIDIANS = [
    ("手太阴肺经", "手", "阴", "食指端"),
    ("手阳明大肠经", "手", "阳", "鼻旁"),
    ("足阳明胃经", "足", "阳", "足大趾内端"),
    ("足太阴脾经", "足", "阴", "心中"),
    ("手少阴心经", "手", "阴", "手小指端"),
    ("手太阳小肠经", "手", "阳", "目内眦"),
    ("足太阳膀胱经", "足", "阳", "足小趾端"),
    ("足少阴肾经", "足", "阴", "胸中"),
    ("手厥阴心包经", "手", "阴", "无名指端"),
    ("手少阳三焦经", "手", "阳", "目外眦"),
    ("足少阳胆经", "足", "阳", "足大趾外端"),
    ("足厥阴肝经", "足", "阴", "肺中"),
]

YIN = "#3f6f52"
YANG = "#b5443a"

fig, ax = canvas(9.6, 9.6)
ax.set_aspect("equal")
ax.axis("off")
ax.set_xlim(-1.62, 1.62)
ax.set_ylim(-1.62, 1.52)

R = 1.0
n = len(MERIDIANS)
angles = [np.pi / 2 - i * 2 * np.pi / n for i in range(n)]     # 自上而下顺时针
pts = [(R * np.cos(a), R * np.sin(a)) for a in angles]

# ── 环与节点 ──
ax.add_patch(Circle((0, 0), R, fill=False, edgecolor=LINE, lw=1.0, ls=(0, (4, 4))))

for i, (name, hand, yy, _) in enumerate(MERIDIANS):
    x, y = pts[i]
    color = YIN if yy == "阴" else YANG
    ax.add_patch(Circle((x, y), 0.055, facecolor=color, edgecolor="white", lw=1.2, zorder=4))

    # 经名向外排，按象限调整对齐，避免压到环上
    ca, sa = np.cos(angles[i]), np.sin(angles[i])
    if ca > 0.35:
        tx, ha = x + 0.075, "left"
    elif ca < -0.35:
        tx, ha = x - 0.075, "right"
    else:
        tx, ha = x, "center"
    ty = y + (0.075 if sa >= 0 else -0.075) if abs(ca) <= 0.35 else y
    va = "bottom" if (abs(ca) <= 0.35 and sa >= 0) else ("top" if abs(ca) <= 0.35 else "center")
    ax.text(tx, ty, name, ha=ha, va=va, fontsize=10.5, color=INK, zorder=5)

# ── 相邻两经之间的流注弧与交接部位 ──
for i in range(n):
    j = (i + 1) % n
    mid = (angles[i] + angles[j]) / 2 if i != n - 1 else (angles[i] + angles[0] - 2 * np.pi) / 2
    # 弧线
    arr = FancyArrowPatch(
        pts[i], pts[j],
        connectionstyle=f"arc3,rad=0.14",
        arrowstyle="-|>,head_length=5,head_width=3",
        color=WUXING["土"], lw=1.4, zorder=2,
        shrinkA=7, shrinkB=8,
    )
    ax.add_patch(arr)
    # 交接部位写在环内
    lx, ly = 0.735 * np.cos(mid), 0.735 * np.sin(mid)
    ax.text(lx, ly, MERIDIANS[i][3], ha="center", va="center", fontsize=8.2, color=MUTED, zorder=3)

# ── 环心说明 ──
ax.text(0, 0.20, "气血流注 · 如环无端", ha="center", va="center", fontsize=15, color=INK)
ax.text(0, 0.02, "始于手太阴肺经　终于足厥阴肝经", ha="center", va="center", fontsize=10, color=WUXING["土"])
ax.text(0, -0.14, "自肝经上注肺，复注于肺经", ha="center", va="center", fontsize=10, color=WUXING["土"])
ax.text(0, -0.34, "中焦受纳腐熟水谷化生气血\n赖肺气输布以行周身", ha="center", va="center", fontsize=8.8, color=MUTED)

# ── 图例与走向规律 ──
ax.add_patch(Circle((-1.46, 1.36), 0.032, facecolor=YIN, edgecolor="white", lw=1))
ax.text(-1.41, 1.36, "阴经", va="center", fontsize=9.5, color=INK)
ax.add_patch(Circle((-1.06, 1.36), 0.032, facecolor=YANG, edgecolor="white", lw=1))
ax.text(-1.01, 1.36, "阳经", va="center", fontsize=9.5, color=INK)

ax.text(0, -1.50,
        "走向规律：手三阴从胸走手　手三阳从手走头　足三阳从头走足　足三阴从足走腹（胸）",
        ha="center", va="center", fontsize=9.2, color=MUTED)

save(fig)
