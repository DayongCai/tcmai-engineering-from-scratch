# -*- coding: utf-8 -*-
"""scripts/figures/panels.py —— 多列要点面板（分类体系型图的定版工具）

为什么需要它：
    「养生分三部分、康复分四法、体质分二十五人」这类图，本质是**并列的要点清单**。
    用 mermaid 的 graph TD 画，dagre 会把所有叶子压到同一层横排：3 个分支 × 3-4 个叶子
    就是 10 个方框并排，实测 viewBox 宽到 1929pt。书页宽只有 552pt，缩下去字高不到 4pt，
    等于印出来看不清。

    这个模块按「列」排版：每列一个标题 + 若干要点竖排。列内纵向排，列间横向分。
    总宽锁死，高度随最长的一列增长 —— 宽高比因此可控。

用法：
    from panels import panels

    panels(
        title="养生与康复",
        columns=[
            ("养生", ["形神共养", "顺应自然", "精神·饮食·运动"]),
            ("康复", ["形神兼养", "动静结合", "药物·针灸推拿·食疗"]),
            ("体质辨识", ["五形人 × 五音", "共二十五种人", "阳虚温补·阴虚滋润"]),
        ],
        out=None,     # 省略则取 sys.argv[1]
    )

返回值是 fig，可继续 add_artist；通常直接 save 即可。
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

from tcm_figure import canvas, save, INK, MUTED, LINE, WUXING, PAPER

HEAD_FACE = "#eef2e8"
HEAD_EDGE = "#4a7c59"
ITEM_FACE = "#fbf8f2"
ITEM_EDGE = "#b9a992"

MARGIN = 0.30
COL_GAP = 0.24
HEAD_H = 0.46
ITEM_H = 0.46
ITEM_GAP = 0.13


def panels(title, columns, width=10.0, out=None, footnote=None, max_chars=13):
    n = len(columns)
    max_items = max(len(items) for _, items in columns)

    body_h = max_items * ITEM_H + (max_items - 1) * ITEM_GAP
    height = MARGIN * 2 + (0.42 if title else 0) + HEAD_H + 0.16 + body_h + (0.34 if footnote else 0)

    col_w = (width - 2 * MARGIN - (n - 1) * COL_GAP) / n

    fig, ax = canvas(width, height)
    ax.set_xlim(0, width)
    ax.set_ylim(0, height)
    ax.axis("off")

    top = height - MARGIN
    if title:
        ax.text(MARGIN, top - 0.12, title, ha="left", va="center", fontsize=12.5, color=INK)
        top -= 0.42

    for ci, (head, items) in enumerate(columns):
        x = MARGIN + ci * (col_w + COL_GAP)

        ax.add_patch(FancyBboxPatch((x, top - HEAD_H), col_w, HEAD_H,
                                    boxstyle="round,pad=0.01,rounding_size=0.07",
                                    linewidth=1.5, edgecolor=HEAD_EDGE,
                                    facecolor=HEAD_FACE, zorder=3))
        ax.text(x + col_w / 2, top - HEAD_H / 2, head, ha="center", va="center",
                fontsize=11, color=INK, zorder=4)

        y = top - HEAD_H - 0.16 - ITEM_H
        for item in items:
            ax.add_patch(FancyBboxPatch((x, y), col_w, ITEM_H,
                                        boxstyle="round,pad=0.01,rounding_size=0.05",
                                        linewidth=1.0, edgecolor=ITEM_EDGE,
                                        facecolor=ITEM_FACE, zorder=2))
            ax.text(x + col_w / 2, y + ITEM_H / 2, item, ha="center", va="center",
                    fontsize=9.2, color=INK, zorder=3, linespacing=1.4)
            y -= ITEM_H + ITEM_GAP

    if footnote:
        ax.text(MARGIN, MARGIN - 0.14, footnote, ha="left", va="center",
                fontsize=8.4, color=MUTED)

    save(fig, out)
