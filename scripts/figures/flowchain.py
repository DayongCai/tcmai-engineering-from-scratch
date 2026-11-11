# -*- coding: utf-8 -*-
"""scripts/figures/flowchain.py —— 教材用的「分段流程链」绘制器

为什么需要它（而不是直接用 mermaid）：
    经络、经脉、病机这类内容是**线性步骤序列**，动辄十几个节点。mermaid 的 dagre
    自动布局不接受子图方向约束（subgraph 内写 direction 会被外层 graph 方向覆盖），
    实测同一条 13 步的链只能排成 468×1360 的竖条或 2245×280 的横条 ——
    前者在 46rem 的书页里占两屏半，后者缩放后字只有 6px。两种都不能用。

    教材页宽是固定的，所以排版必须由我们控制：这个模块按「每行 N 个、蛇形折返」
    排布方框，宽度锁在给定英寸内，行数随节点数增长。同一份数据换个 per_row 就能
    从横条变成方块，不必改内容。

用法：
    from flowchain import chain

    chain(
        title="手太阴肺经 · 循行路线与属络",
        steps=[
            ("起于中焦（胃脘部）", "inner"),
            ("下络大肠", "inner"),
            ...
        ],
        per_row=4,
        legend={"inner": "体内联系", "outer": "体表路线", "branch": "支脉"},
    )

    save(fig)     # 或在 chain(..., out=...) 里直接给输出路径

分组（第三个字段之外的那个 tag）决定框的描边颜色，图例自动生成。
"""

import math
import textwrap

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

from tcm_figure import canvas, save, INK, MUTED, LINE, WUXING, PAPER

# 分组 → (描边色, 底色)
GROUP_STYLE = {
    "inner": ("#8a5a2b", "#f3ede2"),
    "outer": ("#b9a992", "#fbf8f2"),
    "branch": ("#4a7c59", "#eef2e8"),
    "joint": ("#b5443a", "#fdf1ef"),
}

BOX_H = 0.62          # 英寸
GAP_X = 0.20
GAP_Y = 0.52          # 行间留白（放折返箭头）
MARGIN = 0.28


_LEAD_NO = "，。、；：？！）」』》”"      # 不能出现在行首的标点
_BREAK_AT = "，。、；：？！"               # 优先在此类标点之后断行


def _wrap(text, per_line):
    """中文折行：按行数均分，断点优先落在标点之后，并修掉行首标点。

    旧版用 text[i:i+per_line] 硬切，13 字的条目会切成 11+1，
    方框里出现孤零零一个「中」「方」。现在先算该行目标宽度，再在
    目标附近 ±2 字内找一个标点作为断点，找不到才硬断。
    """
    if "\n" in text:
        # 作者已手工断行（时间轴的「朝代／书名／年代」三行结构）就不再二次折行，
        # 自动折行会把语义断到错误的位置。
        return text.split("\n")
    if len(text) <= per_line:
        return [text]
    lines, rest = [], text
    while rest:
        n = math.ceil(len(rest) / per_line)
        if n <= 1:
            lines.append(rest)
            break
        w = math.ceil(len(rest) / n)                 # 本行目标宽度
        cut = w
        for k in range(w, min(len(rest), w + 2) + 1):        # 先在目标之后找
            if rest[k - 1] in _BREAK_AT:
                cut = k
                break
        else:
            for k in range(w - 1, max(4, w - 2) - 1, -1):    # 再往前找
                if rest[k - 1] in _BREAK_AT:
                    cut = k
                    break
        lines.append(rest[:cut])
        rest = rest[cut:]
    # 避免标点落在行首：把标点上提到上一行末（上一行因此可能长 1 字）
    for k in range(1, len(lines)):
        while lines[k] and lines[k][0] in _LEAD_NO:
            lines[k - 1] += lines[k][0]
            lines[k] = lines[k][1:]
    return [ln for ln in lines if ln]



def chain(title, steps, out=None, per_row=4, width=10.4, legend=None,
          box_h=BOX_H, max_chars=11):
    """画分段流程链。steps = [(文字, 分组tag), ...]，蛇形折返排布。"""
    n = len(steps)
    rows = math.ceil(n / per_row)
    cols = min(per_row, n)

    box_w = (width - 2 * MARGIN - (cols - 1) * GAP_X) / cols
    height = MARGIN * 2 + 0.42 + rows * box_h + (rows - 1) * GAP_Y + (0.34 if legend else 0)

    fig, ax = canvas(width, height)
    ax.set_xlim(0, width)
    ax.set_ylim(0, height)
    ax.axis("off")

    if title:
        ax.text(MARGIN, height - 0.24, title, ha="left", va="center",
                fontsize=12.5, color=INK)

    top = height - 0.46
    pos = {}
    for i, (text, tag) in enumerate(steps):
        r = i // per_row
        c = i % per_row
        # 蛇形：奇数行从右往左排，折返箭头才不用横跨整行
        col = c if r % 2 == 0 else (per_row - 1 - c)
        x = MARGIN + col * (box_w + GAP_X)
        y = top - (r + 1) * box_h - r * GAP_Y
        pos[i] = (x, y)
        edge, face = GROUP_STYLE.get(tag, ("#b9a992", PAPER))

        ax.add_patch(FancyBboxPatch(
            (x, y), box_w, box_h,
            boxstyle="round,pad=0.02,rounding_size=0.07",
            linewidth=1.2, edgecolor=edge, facecolor=face, zorder=2,
        ))
        lines = _wrap(text, max_chars)
        fs = 9.4 if len(lines) <= 2 else 8.4
        ax.text(x + box_w / 2, y + box_h / 2, "\n".join(lines),
                ha="center", va="center", fontsize=fs, color=INK,
                linespacing=1.45, zorder=3)

    # 连线：同行为横向箭头，换行为折返箭头
    for i in range(n - 1):
        x1, y1 = pos[i]
        x2, y2 = pos[i + 1]
        if abs(y1 - y2) < 1e-6:                        # 同一行
            if x2 > x1:
                a, b = (x1 + box_w, y1 + box_h / 2), (x2, y2 + box_h / 2)
            else:
                a, b = (x1, y1 + box_h / 2), (x2 + box_w, y2 + box_h / 2)
            ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>,head_length=5,head_width=2.6",
                                         color=WUXING["土"], lw=1.35, zorder=1,
                                         shrinkA=0, shrinkB=0))
        else:                                          # 折返到下一行
            xm = x1 + box_w / 2
            y_mid = y1 - GAP_Y / 2
            a = (xm, y1)
            b = (x2 + box_w / 2, y2 + box_h)
            # 用两段折线（下 → 横 → 下）
            ax.plot([xm, xm], [y1, y_mid], color=WUXING["土"], lw=1.35, zorder=1)
            ax.plot([xm, b[0]], [y_mid, y_mid], color=WUXING["土"], lw=1.35, zorder=1)
            ax.add_patch(FancyArrowPatch((b[0], y_mid), b,
                                         arrowstyle="-|>,head_length=5,head_width=2.6",
                                         color=WUXING["土"], lw=1.35, zorder=1,
                                         shrinkA=0, shrinkB=0))

    if legend:
        x = MARGIN
        for tag, label in legend.items():
            edge, face = GROUP_STYLE.get(tag, ("#b9a992", PAPER))
            ax.add_patch(FancyBboxPatch((x, MARGIN - 0.16), 0.20, 0.14,
                                        boxstyle="round,pad=0.01,rounding_size=0.03",
                                        linewidth=1.1, edgecolor=edge, facecolor=face))
            ax.text(x + 0.26, MARGIN - 0.09, label, va="center", fontsize=9, color=MUTED)
            x += 0.30 + len(label) * 0.135 + 0.34

    save(fig, out)
