# -*- coding: utf-8 -*-
"""图 2-1 阴阳 → 二分类：权重符号与 sigmoid 的互补性

内容依据：textbooks/01-zhongyi/01-zhongyi-jichu-lilun/02-第2章-阴阳：从对立范畴到二分类.md §N.2
  「把输出写成硬标签（0 或 1）会立刻损失一个东西：程度」
  「p = σ(z) = 1/(1+e^{-z}),  z = w^Tx + b」
  「(1) 保留了强度。p = 0.55 与 p = 0.95 在临床上对应完全不同的处置思路」
  「(2) 强制了两类的互补关系……p + (1 - p) = 1 ……它恰好对应「阴阳互根」」
  「(3) 最不确定的地方被显式暴露出来。p ≈ 0.5 的病例，就是这个模型没有把握的病例」
  「本教材配套的课程代码在 8 例八纲典型证候上训练，得到：
    w = [ 畏寒: -7.60, 口渴: +5.19, 脉数: +5.85 ]  b = -2.10
    符号是符合中医常识的：畏寒为负（偏阴），口渴与脉数为正（偏阳）」

与站点动画图 yin-yang-sigmoid 的分工：动画逐帧扫阈值、演示样本归属翻转；本图是静态的，
讲两件动画图讲不了的事 —— 权重的符号就是阴阳倾向、以及 p 与 1-p 的互补对应阴阳互根。
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "scripts" / "figures"))

import numpy as np

from tcm_figure import canvas_grid, save, INK, MUTED, LINE, WUXING, PAPER, ACCENT

YIN = "#3f6f52"       # 青 —— 与站点 --jade 同系
YANG = "#b5443a"      # 赤 —— 与站点 --cinnabar 同系

fig, (ax1, ax2) = canvas_grid(1, 2, w=10.4, h=4.0, gridspec_kw={"width_ratios": [1, 1.25]})

# ── 左：权重的符号即阴阳倾向 ──
feats = ["畏寒", "口渴", "脉数"]
vals = [-7.60, 5.19, 5.85]
colors = [YIN if v < 0 else YANG for v in vals]
bars = ax1.barh(feats, vals, color=colors, height=0.52, zorder=3)
ax1.axvline(0, color=INK, lw=1.1, zorder=4)
for b, v in zip(bars, vals):
    off = -0.35 if v < 0 else 0.35
    ax1.text(v + off, b.get_y() + b.get_height() / 2, f"{v:+.2f}",
             va="center", ha="right" if v < 0 else "left", fontsize=9.4, color=INK, zorder=5)
ax1.set_xlim(-9.6, 7.6)
ax1.set_title("权重符号 = 阴阳倾向", fontsize=11.5, pad=10)
ax1.text(0.02, -0.20, "w = [畏寒 -7.60, 口渴 +5.19, 脉数 +5.85]　b = -2.10\n"
                      "8 例八纲典型证候训练所得；负偏阴，正偏阳",
         transform=ax1.transAxes, fontsize=7.8, color=MUTED, va="top", linespacing=1.6)
ax1.grid(axis="x", alpha=0.35, zorder=0)
ax1.set_axisbelow(True)
ax1.tick_params(axis="y", length=0)

# ── 右：sigmoid 与互补 ──
z = np.linspace(-6.5, 6.5, 400)
p = 1 / (1 + np.exp(-z))
ax2.plot(z, p, color=ACCENT, lw=2.2, zorder=4, label="p = σ(z)")
ax2.fill_between(z, 0, p, color=WUXING["土"], alpha=0.16, zorder=2)
ax2.fill_between(z, p, 1, color=YIN, alpha=0.10, zorder=2)
ax2.axhline(0.5, color=LINE, ls=(0, (4, 4)), lw=1.1, zorder=3)
ax2.axvline(0, color=LINE, ls=(0, (4, 4)), lw=1.1, zorder=3)

ax2.text(-6.1, 0.30, "p（阳证概率）", fontsize=9.2, color=ACCENT)
ax2.text(-6.1, 0.72, "1 - p（阴证概率）", fontsize=9.2, color=YIN)
ax2.annotate("p + (1 - p) = 1\n对应「阴阳互根」", xy=(3.4, 0.60), xytext=(3.1, 0.26),
             fontsize=8.6, color=INK, ha="left", va="center", linespacing=1.6,
             arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.0,
                             connectionstyle="arc3,rad=-0.25"))

for zz, lab, place in [(-3.2, "偏阴", "above"), (0.0, "p = 0.5\n最不确定", "above"), (3.2, "偏阳", "below")]:
    pp = 1 / (1 + np.exp(-zz))
    ax2.plot([zz], [pp], "o", ms=6.5, mfc="white", mec=INK, mew=1.4, zorder=6)
    if place == "above":
        # z=0 处曲线陡升，居中的标签右半会压到曲线上，改为右对齐并略左移
        if zz == 0.0:
            ax2.text(zz - 0.12, pp + 0.075, lab, ha="right", va="bottom",
                     fontsize=8.8, color=INK, linespacing=1.5)
        else:
            ax2.text(zz, pp + 0.075, lab, ha="center", va="bottom", fontsize=8.8, color=INK, linespacing=1.5)
    else:
        ax2.text(zz, pp - 0.075, lab, ha="center", va="top", fontsize=8.8, color=INK, linespacing=1.5)

ax2.set_xlim(-6.5, 6.5)
ax2.set_ylim(-0.04, 1.06)
ax2.set_xlabel("z = w^Tx + b（阳证倾向的线性打分）", fontsize=9.4)
ax2.set_ylabel("概率", fontsize=9.4)
ax2.set_title("概率输出而非硬标签：强度、互补、不确定可见", fontsize=11.5, pad=10)
ax2.set_yticks([0, 0.5, 1])
ax2.grid(alpha=0.30, zorder=0)
ax2.set_axisbelow(True)

save(fig)
