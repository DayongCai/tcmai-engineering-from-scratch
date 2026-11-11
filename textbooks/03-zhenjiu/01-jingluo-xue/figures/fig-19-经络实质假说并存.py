# -*- coding: utf-8 -*-
"""图 19-1 经络实质研究：两类假说并存

内容依据：textbooks/03-zhenjiu/01-jingluo-xue/17-第19章-经络腧穴现代研究.md §19.1.2.1
  「经络现象的大量存在提示经脉循行路线可能具有相应的生物学基础，但数十年来对其物质基础
   的认识仍处于假说并存的阶段」「目前……经络实质假说已逾100种，但尚未达成一致」
  「长期研究的结果被概括为『有进展，无突破』」

  功能调节系统说（原文「此类假说认为经络并非独立的形态结构，而是人体神经、体液等调节
  系统功能联系的整合体现」）：
    ① 神经-体液调节综合说  ② 神经-内分泌-免疫网络说
    ③ 中枢神经功能说        ④ 第三平衡系统说
  形态结构说（原文「此类假说致力于在形态学上寻找经脉的对应结构」）：
    ① 结缔组织筋膜说  ② 低阻通道缝隙连接说  ③ 血管神经束说  ④ 肥大细胞说

为什么画成左右并列而不是树状分支：原文的立场是「假说林立、两说并存」「尚无一种假说能
获得公认」。画成从「经络是什么」分叉出去的树，等于暗示答案就在这两支里；左右并置 +
中间的问号才能表达「两种取向同时存在、都未定论」。项目规则：不美化未定论。
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "scripts" / "figures"))

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle

from tcm_figure import canvas, save, INK, MUTED, LINE, WUXING, PAPER

LEFT_ITEMS = [
    ("① 神经-体液调节综合说", "经穴效应经神经反射与体液调节两条途径实现"),
    ("② 神经-内分泌-免疫网络说", "神经、内分泌、免疫三系相互协调的网络效应"),
    ("③ 中枢神经功能说", "循经感传可能是皮层内兴奋扩散的反映"),
    ("④ 第三平衡系统说", "传导以秒计，介于神经与内分泌之间"),
]
RIGHT_ITEMS = [
    ("① 结缔组织筋膜说", "穴位多在筋膜结缔组织富集处，牵拉产生机械信号"),
    ("② 低阻通道缝隙连接说", "细胞间缝隙连接构成低电阻扩散通路"),
    ("③ 血管神经束说", "以血管、神经干的复合结构为基础"),
    ("④ 肥大细胞说", "穴位区肥大细胞密集，脱颗粒释放活性物质"),
]

W, H = 10.6, 6.4
fig, ax = canvas(W, H)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")

TOP = 5.86
BOX_H = 0.92
GAP = 0.26
COL_W = 4.55
LX = 0.30
RX = W - 0.30 - COL_W
CX = W / 2

# ── 中心：问题，而不是答案 ──
ax.add_patch(Circle((CX, 3.26), 0.46, facecolor="#eef2e8",
                    edgecolor=WUXING["木"] if "木" in WUXING else "#4a7c59", lw=1.6, zorder=3))
ax.text(CX, 3.34, "经络实质", ha="center", va="center", fontsize=10.5, color=INK, zorder=4)
ax.text(CX, 3.08, "是什么？", ha="center", va="center", fontsize=10.5, color=INK, zorder=4)

# ── 左：功能调节系统说 ──
ax.text(LX + COL_W / 2, TOP + 0.30, "功能调节系统说", ha="center", va="center",
        fontsize=12.5, color=WUXING["土"])
ax.text(LX + COL_W / 2, TOP + 0.04, "经络并非独立形态结构，是功能联系的整合体现",
        ha="center", va="center", fontsize=8.6, color=MUTED)

# ── 右：形态结构说 ──
ax.text(RX + COL_W / 2, TOP + 0.30, "形态结构说", ha="center", va="center",
        fontsize=12.5, color="#4a7c59")
ax.text(RX + COL_W / 2, TOP + 0.04, "致力于在形态学上寻找经脉的对应结构",
        ha="center", va="center", fontsize=8.6, color=MUTED)

for idx, (heading, desc) in enumerate(LEFT_ITEMS):
    y = TOP - 0.34 - (idx + 1) * BOX_H - idx * GAP
    ax.add_patch(FancyBboxPatch((LX, y), COL_W, BOX_H,
                                boxstyle="round,pad=0.02,rounding_size=0.08",
                                linewidth=1.2, edgecolor="#8a5a2b", facecolor="#f3ede2", zorder=2))
    ax.text(LX + 0.16, y + BOX_H - 0.24, heading, ha="left", va="center",
            fontsize=9.6, color=INK, zorder=3)
    ax.text(LX + 0.16, y + 0.26, desc, ha="left", va="center",
            fontsize=8.4, color=MUTED, zorder=3)
    ax.plot([LX + COL_W, CX - 0.52], [y + BOX_H / 2, 3.26],
            color=LINE, lw=1.0, ls=(0, (3, 3)), zorder=1)

for idx, (heading, desc) in enumerate(RIGHT_ITEMS):
    y = TOP - 0.34 - (idx + 1) * BOX_H - idx * GAP
    ax.add_patch(FancyBboxPatch((RX, y), COL_W, BOX_H,
                                boxstyle="round,pad=0.02,rounding_size=0.08",
                                linewidth=1.2, edgecolor="#4a7c59", facecolor="#eef2e8", zorder=2))
    ax.text(RX + 0.16, y + BOX_H - 0.24, heading, ha="left", va="center",
            fontsize=9.6, color=INK, zorder=3)
    ax.text(RX + 0.16, y + 0.26, desc, ha="left", va="center",
            fontsize=8.4, color=MUTED, zorder=3)
    ax.plot([RX, CX + 0.52], [y + BOX_H / 2, 3.26],
            color=LINE, lw=1.0, ls=(0, (3, 3)), zorder=1)

# ── 结论条：写未定论，不写答案 ──
ax.text(CX, 0.52, "假说已逾 100 种，尚无一种获得公认", ha="center", va="center",
        fontsize=10.5, color="#b5443a")
ax.text(CX, 0.24, "长期研究的概括：有进展，无突破　·　实质问题尚待科学进一步揭示",
        ha="center", va="center", fontsize=8.8, color=MUTED)

save(fig)
