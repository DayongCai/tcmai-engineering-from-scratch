#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""八十宫殿 · 数学作图实验（matplotlib，含自定义可回调函数）

图的用途不是好看，是把「记忆规律」画成可操作的东西：
  F1  总图      10×8 宫格蛇形 + 宫内五桩 + 条号 + 视频证据点 + 行向箭头    —— 空间组块
  F1b 前 20 宫  视频覆盖区放大（条号可读，供逐条跟练）                      —— 证据集中区
  F2  一宫四型  5 条 / 6 条（回廊5）/ 4 条 / 回宫二轮：方位如何复用          —— 一条一桩
  F3  定位曲线  条→宫 分段线性 + 9 个断点                                   —— 不查表定位
  F4  经络条带  任脉 24→督脉 28→十二经 309→回宫 37（红）                     —— 按经走
  F5  交互      自定义回调：点击查宫 / n,p 走宫 / t 抽背 / 滑条跳转

用法:
  python scripts/plot_palace_map.py static     # F1-F4 的 PNG
  python scripts/plot_palace_map.py pdf        # 合成 PDF（5 页，含图注）
  python scripts/plot_palace_map.py gif        # 沿路线行走动画
  python scripts/plot_palace_map.py gui        # 交互窗口（需桌面环境）
"""
import json
import math
import os
import re
import sys

import matplotlib
import numpy as np

if "gui" not in sys.argv:
    matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
OUTD = os.path.join(ROOT, "assets", "shanghan-palace", "plots")
INK = "#1F1B16"
PAPER = "#FBF6EA"
ACCENT = "#8A6A2F"
MUTED = "#B9A98C"
RED = "#C4553B"

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "SimSun"]
plt.rcParams["axes.unicode_minus"] = False

# 五方桩位 → 房间内归一化坐标（东厢=右，南窗=下，西壁=左，北案=上，中庭=中）
POS = {"东厢": (0.82, 0.50), "南窗": (0.32, 0.14), "西壁": (0.18, 0.50),
       "北案": (0.50, 0.84), "中庭": (0.50, 0.50), "回廊5": (0.88, 0.12)}
LABEL = {"东厢": "东厢（门）", "南窗": "南窗（窗台）", "西壁": "西壁（挂）",
         "北案": "北案（桌）", "中庭": "中庭（旋）", "回廊5": "回廊（第6位）"}


def pos_of(z):
    if z in POS:
        return POS[z]
    return (0.5, 0.5)


def load():
    route = json.load(open(os.path.join(MAT, "palace-route.json"), encoding="utf-8"))
    pres = json.load(open(os.path.join(MAT, "palace-presence.json"), encoding="utf-8"))
    sem = {r["no"]: r for r in json.load(open(os.path.join(ROOT, "standards", "shanghan", "semtensor-398.json"),
                                              encoding="utf-8"))["rows"]}
    auth = {}
    ad = os.path.join(MAT, "authoring")
    for fn in sorted(os.listdir(ad)):
        if fn.startswith("out-") and fn.endswith(".json"):
            for r in json.load(open(os.path.join(ad, fn), encoding="utf-8"))["rows"]:
                auth[int(r["no"])] = r
    tiao = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                              encoding="utf-8"))["tiao"]}
    return route, pres, sem, auth, tiao


def jing_colors(route):
    jings = []
    for p in route["palaces"]:
        if p["jing"] not in jings:
            jings.append(p["jing"])
    cmap = plt.get_cmap("tab20")
    return {j: cmap(i % 20) for i, j in enumerate(jings)}


def cell_xy(idx, cols=10):
    """宫序 → 蛇行格坐标（第 0 行左→右，第 1 行右→左…），让「走宫」是一条连续的路。"""
    row, col = divmod(idx, cols)
    if row % 2 == 1:
        col = cols - 1 - col
    return col, -row


def first_xue(palace):
    return palace["xue"][0] if isinstance(palace["xue"], list) else palace["xue"]


def _text_on(color):
    """浅色底（督脉/任脉）用深字，否则白字看不清。"""
    r, g, b = matplotlib.colors.to_rgb(color)
    return INK if (r * 0.299 + g * 0.587 + b * 0.114) > 0.62 else "white"


def draw_gong(ax, cx, cy, palace, color, hl=False, note=True, s=1.0, xue_label=True):
    w, h = 0.92 * s, 0.92 * s
    tc = _text_on(color)
    ax.add_patch(Rectangle((cx - w / 2, cy - h / 2), w, h, facecolor="white", edgecolor=color,
                           lw=2.6 if hl else 1.1, zorder=2, alpha=0.97))
    ax.add_patch(Rectangle((cx - w / 2 + 0.05 * s, cy - h / 2 + 0.05 * s), w - 0.10 * s, h - 0.10 * s,
                           facecolor="none", edgecolor="#E6DCC8", lw=0.8, zorder=2))
    for z, t in zip(palace["zhuang"], palace["tiao"]):
        px, py = pos_of(z)
        x = cx - w / 2 + 0.05 * s + px * (w - 0.10 * s)
        y = cy - h / 2 + 0.05 * s + py * (h - 0.10 * s)
        nd = len(str(t))
        # 三位数必须撑大色点：直径按 s² 缩放，字号按 s 缩放，
        # 否则 100+ 的条号会溢出成「0¤」。
        ax.scatter([x], [y], s=(150 if hl else 95) * s ** 2 * (1.0 if nd <= 2 else 1.37),
                   color=color, edgecolor="white", lw=0.9, zorder=4)
        ax.text(x, y, str(t), fontsize=(7.2 if nd <= 2 else 6.0) * s, ha="center", va="center",
                color=tc, zorder=5)
    if note:
        ax.text(cx - w / 2 + 0.05 * s, cy + h / 2 - 0.05 * s, f"{palace['gong']:02d}",
                fontsize=7.4 * s, ha="left", va="top", color=INK, zorder=6, fontweight="bold")
        if xue_label:
            ax.text(cx, cy - h / 2 + 0.045 * s, first_xue(palace), fontsize=7.4 * s, ha="center",
                    va="bottom", color=INK, zorder=6)


def fig_overview(route, pres, colors, path):
    palaces = route["palaces"]
    vid = {r["gong"]: r["videoN"] for r in pres["palaces"]}
    cols = 10
    rows = math.ceil(len(palaces) / cols)
    fig, ax = plt.subplots(figsize=(13.6, 11.4), dpi=200)
    ax.set_facecolor(PAPER)
    for i, p in enumerate(palaces):
        cx, cy = cell_xy(i, cols)
        draw_gong(ax, cx, cy, p, colors[p["jing"]])
        if vid.get(p["gong"], 0) >= 3:
            ax.scatter([cx + 0.36], [cy + 0.35], s=30, color=RED, zorder=8)
    for r_ in range(rows):
        y = -r_
        ax.text(-0.45 if r_ % 2 == 0 else cols - 0.55, y, "→" if r_ % 2 == 0 else "←",
                fontsize=15, color=ACCENT, ha="center", va="center", alpha=0.9)
    ax.set_xlim(-0.8, cols - 0.2)
    ax.set_ylim(-rows + 0.2, 1.0)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("F1 八十宫殿总图 · 10×8 宫格（蛇形，行首箭头示走向）\n"
                 "格内五点＝五桩（东厢/南窗/西壁/北案/中庭），点内数字＝条号；左上＝宫号，格底＝首穴；右上红点＝该宫有视频证据",
                 fontsize=13.5, color=INK, pad=12, linespacing=1.6)
    handles = [Line2D([], [], marker="s", ls="", markersize=7, color=colors[j], label=j)
               for j in jing_colors(route)]
    handles.append(Line2D([], [], marker="o", ls="", markersize=5, color=RED, label="有视频证据（≥3 条）"))
    ax.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, -0.005), ncol=8,
              frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_zoom20(route, pres, colors, path, n=20):
    """前 20 宫放大：视频证据全在这里，条号要能直接读。"""
    palaces = route["palaces"][:n]
    cols = 5
    rows = math.ceil(n / cols)
    fig, ax = plt.subplots(figsize=(13.0, 10.6), dpi=200)
    ax.set_facecolor(PAPER)
    for i, p in enumerate(palaces):
        row, col = divmod(i, cols)
        cx, cy = col * 2.0, -row * 2.0
        draw_gong(ax, cx, cy, p, colors[p["jing"]], s=1.85, xue_label=False)
        v = [x for x in pres["palaces"] if x["gong"] == p["gong"]][0]
        if v["firstP"]:
            ax.text(cx, cy + 0.88, f"首见 P{v['firstP']:02d} {v['firstSec'] // 60}:{v['firstSec'] % 60:02d}"
                                   f" · 证据 {v['videoN']}/{len(p['tiao'])} 条",
                    fontsize=7.4, ha="center", va="bottom", color=ACCENT)
        used = set(p["zhuang"])
        for z0, lab0 in POS.items():
            if z0 in used or z0.startswith("回廊"):
                continue
            ax.text(POS[z0][0], POS[z0][1], "（空）", fontsize=7.2, ha="center", va="center",
                    color="#C9BCA4", zorder=4)
            ax.text(POS[z0][0], POS[z0][1] - 0.09, LABEL[z0], fontsize=7.4, ha="center",
                    va="top", color="#C9BCA4")
        for z, t in zip(p["zhuang"], p["tiao"]):
            px, py = pos_of(z)
            x = cx - 0.85 + 0.09 + px * 1.62
            y = cy - 0.85 + 0.09 + py * 1.62
            ax.text(x, y - 0.20, LABEL.get(z, z).split("（")[0], fontsize=6.4, ha="center",
                    va="top", color="#6B5B45")
    ax.set_xlim(-1.3, cols * 2.0 - 0.4)
    ax.set_ylim(-rows * 2.0 + 0.3, 1.0)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("F1b 前 20 宫放大（＝条 1-100，源视频覆盖区）\n"
                 "每格六位数＝条号，格底＝首穴，上方＝该宫在源视频里的首见时刻与证据条数",
                 fontsize=13, color=INK, pad=10, linespacing=1.5)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_zone4(route, colors, path):
    """一宫四型：5 条 / 6 条（回廊5）/ 4 条 / 回宫二轮——说明「方位复用」。"""
    palaces = route["palaces"]
    pick = [palaces[0]]
    pick.append([p for p in palaces if len(p["tiao"]) == 6][0])
    pick.append([p for p in palaces if len(p["tiao"]) == 4 and p["tiao"][0] < 361][0])
    pick.append([p for p in palaces if any(r == 2 for r in p["round"])][0])
    fig, axes = plt.subplots(2, 2, figsize=(12.4, 11.2), dpi=190)
    fig.patch.set_facecolor(PAPER)
    for ax, p in zip(axes.ravel(), pick):
        ax.set_facecolor(PAPER)
        ax.add_patch(Rectangle((0, 0), 1, 1, facecolor="white", edgecolor=INK, lw=2))
        ax.plot([0, 1], [0.10, 0.10], color="#D9C9A8", lw=6)
        ax.plot([0.90, 0.90], [0, 1], color="#E3D3B2", lw=6)
        ax.plot([0.10, 0.10], [0, 1], color="#DCCDB0", lw=4)
        ax.add_patch(Rectangle((0.22, 0.74), 0.56, 0.16, facecolor="#F3EAD6", edgecolor=ACCENT, lw=1))
        used = set(p["zhuang"])
        for z0, lab0 in POS.items():
            if z0 in used or z0.startswith("回廊"):
                continue
            ax.text(POS[z0][0], POS[z0][1], "（空）", fontsize=7.2, ha="center", va="center",
                    color="#C9BCA4", zorder=4)
            ax.text(POS[z0][0], POS[z0][1] - 0.09, LABEL[z0], fontsize=7.4, ha="center",
                    va="top", color="#C9BCA4")
        for z, t in zip(p["zhuang"], p["tiao"]):
            x, y = pos_of(z)
            if z.startswith("回廊"):
                x, y = 1.03, 0.12          # 第 6 位放在门槛外
            ax.scatter([x], [y], s=560, color=ACCENT, edgecolor="white", lw=2, zorder=5)
            ax.text(x, y, str(t), fontsize=11.5, color="white", ha="center", va="center", zorder=6)
            labz = ("回廊\n（第6位）" if z.startswith("回廊") else LABEL.get(z, z))
            ax.text(x, y - 0.09, labz, fontsize=7.4, ha="center", va="top", color=INK,
                    linespacing=1.15)
        ax.set_xlim(-0.08, 1.34)
        ax.set_ylim(-0.08, 1.08)
        ax.set_aspect("equal")
        ax.axis("off")
        rnd = "回宫二轮" if any(r == 2 for r in p["round"]) else "首轮"
        ax.set_title(f"G{p['gong']:02d} {first_xue(p)}宫（{p['jing']}）· {len(p['tiao'])} 条 · {rnd}",
                     fontsize=11.5, color=INK)
    fig.suptitle("F2 一宫四型：方位如何复用（5 条=五方各一；6 条=回廊加一位；4 条=中庭空着；回宫=同一桩第二层）",
                 fontsize=12.5, color=INK, y=0.985)
    fig.tight_layout(rect=(0, 0, 1, 0.965))
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_locate(route, path):
    nos = np.arange(1, 399)
    gong = np.array([int(route["assign"][str(n)]["gong"]) for n in nos])
    sizes = {p["gong"]: len(p["tiao"]) for p in route["palaces"]}
    first = {p["gong"]: p["tiao"][0] for p in route["palaces"]}
    fig, ax = plt.subplots(figsize=(9.6, 4.6), dpi=200)
    ax.set_facecolor(PAPER)
    ax.plot(nos, gong, color=INK, lw=1.7, label="实际宫号（阶梯）")
    ax.plot(nos, nos / 5.0, color=MUTED, lw=1.1, ls="--", label="条 / 5（理想均分）")
    k = 0
    for g, s in sizes.items():
        if s == 5:
            continue
        n0 = first[g]
        ax.axvline(n0 - 0.5, color=RED, lw=0.8, ls=":", alpha=0.85)
        # 末尾两个断点（G79/G80）挤在右上角，标签改放左侧，否则叠在一起
        dx, ha = (-12, "right") if n0 > 370 else (6, "left")
        ax.annotate(f"G{g:02d}\n{'6' if s == 6 else ('4' if s == 4 else '3')}条@{n0}",
                    (n0, g), xytext=(dx, -26 if k % 2 == 0 else 14), textcoords="offset points",
                    fontsize=6.6, color=RED, ha=ha,
                    arrowprops=dict(arrowstyle="-", color=RED, lw=0.6, alpha=0.7))
        k += 1
    ax.set_xlabel("条文号", fontsize=9.5)
    ax.set_ylabel("宫号", fontsize=9.5)
    ax.set_title("F3 条→宫 定位曲线：宫≈条/5，仅 9 处断点（篇界处，各宫 4/6/3 条）", fontsize=12,
                 color=INK)
    ax.legend(fontsize=8.6, frameon=False, loc="upper left")
    ax.grid(alpha=0.15)
    for s_ in ("top", "right"):
        ax.spines[s_].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_band(route, path):
    """经络条带：按 xue-route 的真实条段画（不能按宫名统计——回宫二轮的 37 条会重复记到任督）。"""
    xr = json.load(open(os.path.join(MAT, "xue-route.json"), encoding="utf-8"))["rows"]
    runs = []
    for r in xr:
        key = (r["jing"], r["round"])
        if runs and runs[-1][0] == key:
            runs[-1][1] += 1
        else:
            runs.append([key, 1])
    colors = jing_colors(route)
    fig, ax = plt.subplots(figsize=(13.0, 3.9), dpi=200)
    ax.set_facecolor(PAPER)
    left = 0
    for (jing, rnd), n in runs:
        col = RED if rnd == 2 else colors.get(jing, "#999999")
        ax.barh([0], [n], left=left, color=col, edgecolor="white", height=0.55)
        lab = f"{jing[:3]}{'二轮' if rnd == 2 else ''}\n{n}"
        if n >= 18:
            ax.text(left + n / 2, 0, lab, ha="center", va="center", fontsize=7.4, color="white")
        else:
            ax.annotate(lab, (left + n / 2, 0.29), xytext=(left + n / 2, 0.66), fontsize=6.8,
                        ha="center", color=INK,
                        arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.7))
        left += n
    ax.text(398, -0.42, "合计 398", fontsize=9, color=INK, ha="right")
    ax.set_xlim(0, 398)
    ax.set_ylim(-0.55, 1.05)
    ax.set_yticks([])
    ax.set_xlabel("条文号累计（1-398）", fontsize=9.5)
    ax.set_title("F4 经络条带：任脉逆序 24 → 督脉 28 → 十二经流注 309（1-361）→ 回宫二轮 37（362-398，红色）",
                 fontsize=11.5, color=INK)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.grid(axis="x", alpha=0.15)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_checkin(route, path):
    """80 宫打卡表：一宫一行，四格对应 4 次复习（当天/3 天/7 天/21 天）。"""
    palaces = route["palaces"]
    fig, ax = plt.subplots(figsize=(8.27, 11.69), dpi=170)
    fig.patch.set_facecolor("white")
    ax.axis("off")
    ax.text(0.5, 0.975, "八十宫殿 · 80 宫打卡表", ha="center", fontsize=15, color=INK,
            transform=ax.transAxes)
    ax.text(0.5, 0.955, "四格＝当天 / +3 天 / +7 天 / +21 天各复述一遍；能不看图说出五条大意再打勾",
            ha="center", fontsize=8.4, color="#5C4B33", transform=ax.transAxes)
    half = 40
    for blk in range(2):
        x0 = 0.04 + blk * 0.48
        ax.text(x0, 0.925, "宫 / 首穴", fontsize=7.6, color=INK, transform=ax.transAxes)
        ax.text(x0 + 0.20, 0.925, "条段", fontsize=7.6, color=INK, transform=ax.transAxes)
        ax.text(x0 + 0.31, 0.925, "复习（4 次）", fontsize=7.6, color=INK, transform=ax.transAxes)
        for i in range(half):
            p = palaces[blk * half + i]
            y = 0.905 - i * 0.0218
            tag2 = "（二轮）" if any(r == 2 for r in p["round"]) else ""
            ax.text(x0, y, f"{p['gong']:02d} {first_xue(p)}{tag2}", fontsize=7.2, color=INK,
                    transform=ax.transAxes)
            nos = p["tiao"]
            ax.text(x0 + 0.20, y, f"{nos[0]}-{nos[-1]}", fontsize=6.8, color="#5C4B33",
                    transform=ax.transAxes)
            for j in range(4):
                ax.add_patch(Rectangle((x0 + 0.305 + j * 0.030, y - 0.004), 0.020, 0.013,
                                       transform=ax.transAxes, facecolor="none", edgecolor="#8C7B60",
                                       lw=0.6, clip_on=False))
    fig.savefig(path, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    return path



CLOSERS = "，。；：、）」』】？！…"


def _wrap_cn(text, n):
    """按字数折行（中文按全角算，n＝每行字数）；右括号/句读不留到下一行开头。"""
    out, line, i = [], "", 0
    while i < len(text):
        line += text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if len(line) >= n and text[i] not in CLOSERS:
            while nxt and nxt in CLOSERS:      # 把紧跟的收尾符号一起带过来
                line += nxt
                i += 1
                nxt = text[i + 1] if i + 1 < len(text) else ""
            out.append(line)
            line = ""
        i += 1
    if line:
        out.append(line)
    return out


CAT_COLOR = {"灵魂之心": "#8C3B2E", "肉体之心": "#3E5C7A", "条文·证候": "#8A6A2F"}


def _cat_of(term):
    if any(k in term for k in ("灵魂", "君主", "不受病", "五脏六腑", "心之坐标")):
        return "灵魂之心"
    if any(k in term for k in ("心包", "虚里", "胸痹")):
        return "肉体之心"
    return "条文·证候"


def fig_concept_cards(path, cols=3, rows=6):
    """F1c · P29《心与心包》18 张概念卡（附在 F1b 之后）。

    一卡四块：术语（校订后）／时间戳／识别要点／与条文·宫殿的挂点；
    卡框颜色按三层分：灵魂之心（红）／肉体之心（蓝）／条文·证候（金）。
    """
    con = json.load(open(os.path.join(MAT, "p29-concepts.json"), encoding="utf-8"))["rows"]
    fig, ax = plt.subplots(figsize=(13.8, 11.6), dpi=190)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)
    ax.set_xlim(0, cols)
    ax.set_ylim(0, rows)
    ax.axis("off")
    for i, c in enumerate(con):
        r, col = divmod(i, cols)
        x, y = col, rows - 1 - r
        cat = _cat_of(c["term"])
        colr = CAT_COLOR[cat]
        ax.add_patch(Rectangle((x + 0.03, y + 0.05), 0.94, 0.90, facecolor="white",
                               edgecolor=colr, lw=1.6, zorder=2))
        ax.add_patch(Rectangle((x + 0.03, y + 0.84), 0.94, 0.11, facecolor=colr, alpha=0.13, zorder=3))
        ax.text(x + 0.07, y + 0.855, f"{c['no']:02d}", fontsize=8.5, color=colr, va="bottom",
                fontweight="bold", zorder=4)
        ax.text(x + 0.14, y + 0.852, c["term"], fontsize=10.2, color=INK, va="bottom",
                fontweight="bold", zorder=4)
        ax.text(x + 0.93, y + 0.855, f"[{c['t']}]", fontsize=7.6, color=ACCENT, va="bottom",
                ha="right", zorder=4)
        yy = y + 0.785
        for line in _wrap_cn(c["point"], 21)[:3]:
            ax.text(x + 0.07, yy, line, fontsize=7.6, color="#3A2E1E", va="top", zorder=4)
            yy -= 0.086
        ax.plot([x + 0.07, x + 0.93], [yy - 0.012, yy - 0.012], color="#E8DCC4", lw=0.8, zorder=4)
        yy -= 0.040
        ax.text(x + 0.07, yy, "挂点", fontsize=6.8, color=colr, va="top", fontweight="bold", zorder=4)
        for line in _wrap_cn(c["link"], 22)[:3]:   # 最长 62 字 → 3 行，之前只给 2 行被截
            ax.text(x + 0.16, yy, line, fontsize=6.9, color="#5C4B33", va="top", zorder=4)
            yy -= 0.075
    handles = [Rectangle((0, 0), 1, 1, facecolor="white", edgecolor=v, lw=1.6, label=k)
               for k, v in CAT_COLOR.items()]
    ax.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.5, -0.035), ncol=3,
              frameon=False, fontsize=8.6, title="三层：灵魂之心／肉体之心／条文·证候",
              title_fontsize=8.6)
    ax.set_title("F1c · P29《图说中医·心与心包》概念卡 18 张（接在 F1b 之后看：宫是「地方」，这 18 张是「为什么这么放」）\n"
                 "每卡＝校订术语＋时间戳（可回查原话）＋识别要点＋挂点（条文号或宫殿宫位）",
                 fontsize=12.6, color=INK, pad=14, linespacing=1.6)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def _grid_xy(g, x0=5.15, ytop=8.75, step=0.77):
    """宫号 → 80 宫小格中心（与 F1/F1b 同一蛇形）。"""
    i = g - 1
    row, col = divmod(i, 10)
    if row % 2 == 1:
        col = 9 - col
    return x0 + col * step + 0.35, ytop - row * step - 0.35


def fig_concept_pins(route, path):
    """F1d · 把 P29 的 18 张概念卡用连线钉到八十宫。

    左 9 张、右 9 张，中间是 10×8 的 80 宫缩略图；每张卡画一条线到它的宫位
    （卡里的 gong 字段，多宫就多线），线上颜色＝三层归类；虚里两张属诊法层，不钉宫，
    虚线连到底部说明框。
    """
    con = json.load(open(os.path.join(MAT, "p29-concepts.json"), encoding="utf-8"))["rows"]
    colors = jing_colors(route)
    palaces = route["palaces"]
    fig, ax = plt.subplots(figsize=(16.2, 11.2), dpi=190)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 12)
    ax.axis("off")

    # ---- 中间：80 宫缩略图
    count = {}
    for c in con:
        for g in c.get("gong", []):
            count[g] = count.get(g, 0) + 1
    for p in palaces:
        g = p["gong"]
        x, y = _grid_xy(g)
        hit = count.get(g, 0)
        ax.add_patch(Rectangle((x - 0.33, y - 0.33), 0.66, 0.66, facecolor="white",
                               edgecolor=(ACCENT if hit else "#DCD1BB"),
                               lw=1.8 if hit else 0.7, zorder=5))
        ax.text(x - 0.30, y + 0.29, f"{g:02d}", fontsize=5.4, color=(INK if hit else "#A99C84"),
                va="top", ha="left", zorder=6, fontweight="bold" if hit else "normal")
        ax.text(x, y - 0.24, first_xue(p), fontsize=4.9, color=("#5C4B33" if hit else "#B7AB94"),
                va="bottom", ha="center", zorder=6)
        if hit:
            ax.scatter([x + 0.26], [y + 0.24], s=42, color=RED, zorder=7)
            ax.text(x + 0.26, y + 0.24, str(hit), fontsize=5.2, color="white", ha="center",
                    va="center", zorder=8)
    ax.text(9.0, 9.05, "八十宫（10×8，蛇形）· 红点＝被几张概念卡钉住", fontsize=9.5, color=INK,
            ha="center")

    # ---- 左右两张卡列
    rows = 9
    note_box = (8.9, 1.15)
    for i, c in enumerate(con):
        left = i < rows
        col = 0 if left else 1
        r = i if left else i - rows
        x0 = 0.18 if left else 13.28
        ytop_c = 11.62 - r * 1.26
        h, w = 1.10, 4.54
        cat = _cat_of(c["term"])
        colr = CAT_COLOR[cat] if c.get("gong") else "#7A6A55"
        ax.add_patch(Rectangle((x0, ytop_c - h), w, h, facecolor="white", edgecolor=colr,
                               lw=1.4, zorder=6))
        ax.add_patch(Rectangle((x0, ytop_c - 0.20), w, 0.20, facecolor=colr, alpha=0.12, zorder=7))
        ax.text(x0 + 0.10, ytop_c - 0.16, f"{c['no']:02d}", fontsize=7.2, color=colr,
                fontweight="bold", va="bottom", zorder=8)
        ax.text(x0 + 0.42, ytop_c - 0.155, c["term"], fontsize=8.8, color=INK,
                fontweight="bold", va="bottom", zorder=8)
        ax.text(x0 + w - 0.10, ytop_c - 0.155, f"[{c['t']}]", fontsize=6.6, color=ACCENT,
                ha="right", va="bottom", zorder=8)
        yy = ytop_c - 0.26
        for line in _wrap_cn(c["point"], 27)[:2]:
            ax.text(x0 + 0.10, yy, line, fontsize=6.6, color="#3A2E1E", va="top", zorder=8)
            yy -= 0.145
        for line in _wrap_cn(c["link"], 32)[:2]:
            ax.text(x0 + 0.10, yy - 0.03, line, fontsize=6.2, color="#6B5B45", va="top", zorder=8)
            yy -= 0.132
        badge = "、".join(f"G{g:02d}" for g in c.get("gong", [])) or "诊法层"
        ax.text(x0 + 0.10, ytop_c - h + 0.09, badge, fontsize=7.2, color=colr,
                fontweight="bold", va="bottom", zorder=8)
        # 连线：卡内侧 → 宫格
        xs = x0 + w if left else x0
        ymid = ytop_c - h / 2
        if c.get("gong"):
            for g in c["gong"]:
                gx, gy = _grid_xy(g)
                ax.annotate("", xy=(gx, gy), xytext=(xs, ymid), zorder=3,
                            arrowprops=dict(arrowstyle="-", color=colr, lw=1.1, alpha=0.5,
                                            connectionstyle="arc3,rad=0.12" if left else "arc3,rad=-0.12"))
        else:
            ax.annotate("", xy=note_box, xytext=(xs, ymid), zorder=3,
                        arrowprops=dict(arrowstyle="-", color="#7A6A55", lw=1.0, alpha=0.55,
                                        linestyle=(0, (4, 3)),
                                        connectionstyle="arc3,rad=0.1" if left else "arc3,rad=-0.1"))

    ax.add_patch(Rectangle((6.6, 0.72), 4.8, 0.78, facecolor="white", edgecolor="#7A6A55",
                           lw=1.2, linestyle=(0, (4, 3)), zorder=6))
    ax.text(9.0, 1.10, "诊法层：虚里（左乳下）", fontsize=8.4, color="#5C4B33", ha="center",
            va="bottom", zorder=7)
    ax.text(9.0, 0.86, "「胃之大络，名曰虚里，其动应衣」— 他觉诊位，不占八十宫桩位",
            fontsize=6.8, color="#7A6A55", ha="center", va="bottom", zorder=7)

    handles = [Rectangle((0, 0), 1, 1, facecolor="white", edgecolor=v, lw=1.4, label=k)
               for k, v in list(CAT_COLOR.items()) + [("诊法层（不钉宫）", "#7A6A55")]]
    ax.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.5, -0.015), ncol=4,
              frameon=False, fontsize=8.4)
    ax.set_title("F1d · 18 张概念卡钉到八十宫（左边 9 张、右边 9 张，线＝挂点）\n"
                 "钉法：条文号 → 宫号（route.assign），一卡多宫就画多条线；虚里两张属诊法层，"
                 "虚线连到底部说明框而不是硬塞进宫",
                 fontsize=12.2, color=INK, pad=10, linespacing=1.6)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_g15(route, path):
    """F1e · G15 样板宫剖析：一宫五桩，其中「北案·条76」一桩扛住 5 张概念卡。

    左＝房间俯视（五桩各就各位，条 76 高亮为概念枢纽）；右＝钉在这宫的 5 张卡；
    下＝条 73-77 五条原文与桩位对照（含口播桩）。用来示范「一桩多义」怎么用：
    概念不必另建空间，全挂在一个已有的桩上。
    """
    palaces = route["palaces"]
    p = [x for x in palaces if x["gong"] == 15][0]
    tj = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                             encoding="utf-8"))["tiao"]}
    vz = {r["no"]: r for r in json.load(open(os.path.join(MAT, "video-zhuang.json"),
                                             encoding="utf-8"))["rows"]}
    con = [c for c in json.load(open(os.path.join(MAT, "p29-concepts.json"),
                                     encoding="utf-8"))["rows"] if 15 in c.get("gong", [])]
    hub = 76

    fig, ax = plt.subplots(figsize=(15.6, 11.0), dpi=190)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 11)
    ax.axis("off")

    # ---- 左：房间
    rx, ry, rw = 0.7, 4.95, 5.3
    ax.add_patch(Rectangle((rx, ry), rw, rw, facecolor="white", edgecolor=INK, lw=2.2, zorder=3))
    ax.plot([rx, rx + rw], [ry + 0.42, ry + 0.42], color="#D9C9A8", lw=7, zorder=2)   # 南窗
    ax.plot([rx + rw * 0.88, rx + rw * 0.88], [ry, ry + rw], color="#E3D3B2", lw=7, zorder=2)  # 东厢
    ax.plot([rx + rw * 0.10, rx + rw * 0.10], [ry, ry + rw], color="#DCCDB0", lw=5, zorder=2)  # 西壁
    ax.add_patch(Rectangle((rx + 0.22 * rw, ry + 0.74 * rw), 0.56 * rw, 0.17 * rw,
                           facecolor="#F3EAD6", edgecolor=ACCENT, lw=1.2, zorder=4))
    ax.text(rx + rw / 2, ry + rw + 0.18, "G15 手三里宫（手阳明大肠经）· 条 73-77",
            fontsize=11.8, color=INK, ha="center", fontweight="bold")
    hub_xy = None
    for z, t in zip(p["zhuang"], p["tiao"]):
        px, py = pos_of(z)
        x, y = rx + px * rw, ry + py * rw
        if t == hub:
            hub_xy = (x, y)
            ax.scatter([x], [y], s=1500, color=RED, alpha=0.16, zorder=5)
            ax.scatter([x], [y], s=410, color=RED, edgecolor="white", lw=2.2, zorder=6)
        else:
            ax.scatter([x], [y], s=330, color=ACCENT, edgecolor="white", lw=1.8, zorder=6)
        ax.text(x, y, str(t), fontsize=10.2 if t != hub else 12.2, color="white", ha="center",
                va="center", zorder=7, fontweight="bold")
        ax.text(x, y - 0.32, f"{z}·{p['xue'][p['tiao'].index(t)]}", fontsize=7.4,
                color=(RED if t == hub else "#5C4B33"), ha="center", va="top", zorder=7,
                fontweight="bold" if t == hub else "normal")

    # ---- 右：5 张卡
    cy0, cw, ch, gap = 10.72, 8.0, 1.10, 0.16
    for i, c in enumerate(con):
        cat = _cat_of(c["term"])
        colr = CAT_COLOR[cat]
        y = cy0 - i * (ch + gap) - ch
        ax.add_patch(Rectangle((7.4, y), cw, ch, facecolor="white", edgecolor=colr, lw=1.5, zorder=6))
        ax.add_patch(Rectangle((7.4, y + ch - 0.24), cw, 0.24, facecolor=colr, alpha=0.12, zorder=7))
        ax.text(7.52, y + ch - 0.19, f"{c['no']:02d}", fontsize=7.8, color=colr, fontweight="bold",
                va="bottom", zorder=8)
        ax.text(7.86, y + ch - 0.185, c["term"], fontsize=10.0, color=INK, fontweight="bold",
                va="bottom", zorder=8)
        ax.text(7.4 + cw - 0.10, y + ch - 0.185, f"[{c['t']}]", fontsize=7.0, color=ACCENT,
                ha="right", va="bottom", zorder=8)
        yy = y + ch - 0.30
        for line in _wrap_cn(c["point"], 41)[:2]:
            ax.text(7.52, yy, line, fontsize=7.2, color="#3A2E1E", va="top", zorder=8)
            yy -= 0.145
        ax.text(7.52, y + 0.09, "挂点｜" + _wrap_cn(c["link"], 46)[0], fontsize=6.5,
                color="#6B5B45", va="bottom", zorder=8)
        if hub_xy:
            ax.annotate("", xy=(7.4, y + ch / 2), xytext=hub_xy, zorder=4,
                        arrowprops=dict(arrowstyle="-", color=colr, lw=1.1, alpha=0.42,
                                        connectionstyle="arc3,rad=0.10"))

    # ---- 下：条文带（横跨全幅，不与房间/卡片抢空间）
    yb = 4.05
    ax.text(0.7, yb, "条 73-77 原文与桩位（★＝有口播桩；红＝概念枢纽条 76）", fontsize=10.4,
            color=INK, fontweight="bold")
    ax.plot([0.7, 15.4], [yb - 0.18, yb - 0.18], color="#E8DCC4", lw=1.0)
    ax.text(1.4, yb - 0.42, "条", fontsize=7.4, color="#8A7A62")
    ax.text(2.2, yb - 0.42, "原文（首句）", fontsize=7.4, color="#8A7A62")
    ax.text(10.3, yb - 0.42, "桩位·本桩穴", fontsize=7.4, color="#8A7A62")
    ax.text(12.5, yb - 0.42, "视频口播", fontsize=7.4, color="#8A7A62")
    for i, (n, z) in enumerate(zip(p["tiao"], p["zhuang"])):
        y = yb - 0.78 - i * 0.50
        hit = n in vz
        ax.text(0.7, y, f"{'★' if (n == hub or hit) else '　'}{n}", fontsize=8.6,
                color=(RED if n == hub else INK), fontweight="bold", va="center")
        ax.text(2.2, y, _wrap_cn(tj[n]["text"], 58)[0], fontsize=7.8, color=INK, va="center")
        ax.text(10.3, y, f"{z}·{p['xue'][i]}", fontsize=8.0,
                color=(RED if n == hub else "#5C4B33"), va="center",
                fontweight="bold" if n == hub else "normal")
        v = vz.get(n)
        ax.text(12.5, y, (f"「{v['raw']}」→ {v['xue']}" if v else "无口播（按规则延伸）"),
                fontsize=7.4, color=("#8A6A2F" if v else "#A99C84"), va="center")

    ax.text(0.7, 0.55, "样板宫的用法：① 先把五条按东厢→南窗→西壁→北案→中庭走一遍（空间组块）；"
                       "② 再回到北案，把 5 张概念卡挂在这一个桩上（一桩多义）；"
                       "③ 抽背时问「北案挂着哪几条概念」，能连出 5 张卡就算过。",
            fontsize=8.4, color="#5C4B33", va="center")

    ax.set_title("F1e · G15 样板宫剖析：一宫五桩，其中「北案·条76」一桩扛住 5 张概念卡\n"
                 "钉在这里的 5 张卡全因条 76「心中懊憹」——情绪、体感、神志、心包四个概念都从这一句长出来",
                 fontsize=12.6, color=INK, pad=12, linespacing=1.6)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


GONG8 = [3, 4, 8, 20, 31, 55, 56, 66]   # 心包经 272-280 在 G54-G56，故用 G55 而非 G47


def _gong_ctx(route, gong):
    """把一宫画小剖析需要的料一次取齐。"""
    p = [x for x in route["palaces"] if x["gong"] == gong][0]
    tj = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                             encoding="utf-8"))["tiao"]}
    vzv = json.load(open(os.path.join(MAT, "video-zhuang.json"), encoding="utf-8"))["rows"]
    vz = {r["no"]: r for r in vzv}
    pres = {x["gong"]: x for x in json.load(open(os.path.join(MAT, "palace-presence.json"),
                                                encoding="utf-8"))["palaces"]}
    con = [c for c in json.load(open(os.path.join(MAT, "p29-concepts.json"),
                                     encoding="utf-8"))["rows"] if gong in c.get("gong", [])]
    rng = set(p["tiao"])
    # 哪张卡直引了本宫的条号？（直引/推断分开，别把推断写成原文）
    for c in con:
        cited = [int(x) for x in re.findall(r"条\s*(\d{1,3})", c["link"])]
        c["_direct"] = [n for n in cited if n in rng]
    hub = None
    tally = {}
    for c in con:
        for n in c["_direct"]:
            tally[n] = tally.get(n, 0) + 1
    if tally:
        hub = max(tally, key=lambda k: tally[k])
    return {"p": p, "tj": tj, "vz": vz, "pres": pres, "con": con, "hub": hub, "tally": tally}


def fig_gong_panel(ax, route, gong, compact=False):
    """在给定 ax 上画一宫小剖析：左房间、右概念卡、下条文；枢纽条高亮。"""
    R = _gong_ctx(route, gong)
    p, hub = R["p"], R["hub"]
    ax.set_facecolor(PAPER)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.set_aspect("equal")   # 不设等比例时，全景图四格会被压成竖条，房间变形、文字互压
    ax.axis("off")
    cards = R["con"]

    # ---- 房间
    rx, ry, rw = 0.25, 1.75, 4.9
    ax.add_patch(Rectangle((rx, ry), rw, rw, facecolor="white", edgecolor=INK, lw=1.6, zorder=3))
    ax.plot([rx, rx + rw], [ry + 0.40, ry + 0.40], color="#D9C9A8", lw=5, zorder=2)
    ax.plot([rx + rw * 0.88, rx + rw * 0.88], [ry, ry + rw], color="#E3D3B2", lw=5, zorder=2)
    ax.plot([rx + rw * 0.10, rx + rw * 0.10], [ry, ry + rw], color="#DCCDB0", lw=3.5, zorder=2)
    ax.add_patch(Rectangle((rx + 0.22 * rw, ry + 0.76 * rw), 0.56 * rw, 0.15 * rw,
                           facecolor="#F3EAD6", edgecolor=ACCENT, lw=0.9, zorder=4))
    hub_xy = None
    for z, t in zip(p["zhuang"], p["tiao"]):
        px, py = pos_of(z)
        x, y = rx + px * rw, ry + py * rw
        if t == hub:
            hub_xy = (x, y)
            ax.scatter([x], [y], s=760, color=RED, alpha=0.18, zorder=5)
            ax.scatter([x], [y], s=210, color=RED, edgecolor="white", lw=1.6, zorder=6)
        else:
            ax.scatter([x], [y], s=165, color=ACCENT, edgecolor="white", lw=1.2, zorder=6)
        ax.text(x, y, str(t), fontsize=8.2 if t != hub else 9.4, color="white", ha="center",
                va="center", zorder=7, fontweight="bold")
        ax.text(x, y - 0.26, f"{z}·{p['xue'][p['tiao'].index(t)]}", fontsize=5.6,
                color=(RED if t == hub else "#5C4B33"), ha="center", va="top", zorder=7,
                fontweight="bold" if t == hub else "normal")
    v = R["pres"].get(gong, {})
    ax.text(rx, ry + rw + 0.10, f"G{gong:02d} {p['xue'][0]}宫（{p['jing']}）· 条 {p['tiao'][0]}-{p['tiao'][-1]}",
            fontsize=8.2, color=INK, fontweight="bold", va="bottom")
    ax.text(rx + rw, ry + rw + 0.10,
            f"卡 {len(cards)} 张" + (f" · 枢纽条 {hub}" if hub else " · 无直引条")
            + f" · 证据 {v.get('videoN', 0)}/{len(p['tiao'])}"
            + (f" · 首见 P{v['firstP']:02d}" if v.get("firstP") else " · 延伸"),
            fontsize=6.4, color=("#8A6A2F" if v.get("videoN") else "#A99C84"), ha="right", va="bottom")

    # ---- 右侧：概念卡
    if cards:
        cy, ch = 6.05, min(1.15, 4.9 / max(1, len(cards)))
        for i, c in enumerate(cards):
            cat = _cat_of(c["term"])
            colr = CAT_COLOR[cat]
            y = cy - i * (ch + 0.16) - ch
            ax.add_patch(Rectangle((5.6, y), 4.25, ch, facecolor="white", edgecolor=colr,
                                   lw=1.2, zorder=6))
            ax.add_patch(Rectangle((5.6, y + ch - 0.20), 4.25, 0.20, facecolor=colr, alpha=0.12,
                                   zorder=7))
            ax.text(5.68, y + ch - 0.165, f"{c['no']:02d} {c['term']}", fontsize=7.4, color=INK,
                    fontweight="bold", va="bottom", zorder=8)
            ax.text(9.78, y + ch - 0.165, f"[{c['t']}]", fontsize=6.0, color=ACCENT, ha="right",
                    va="bottom", zorder=8)
            yy = y + ch - 0.28
            for line in _wrap_cn(c["point"], 22 if compact else 26)[:2 if compact else 3]:
                ax.text(5.68, yy, line, fontsize=6.0, color="#3A2E1E", va="top", zorder=8)
                yy -= 0.125
            tag = ("直引条 " + "、".join(str(n) for n in c["_direct"])) if c["_direct"] else "按术语归属（推断）"
            ax.text(5.68, y + 0.07, tag, fontsize=5.6,
                    color=(ACCENT if c["_direct"] else "#A99C84"), va="bottom", zorder=8)
            src = hub_xy if hub_xy else (rx + rw / 2, ry + rw / 2)
            ax.annotate("", xy=(5.6, y + ch / 2), xytext=src, zorder=4,
                        arrowprops=dict(arrowstyle="-", color=colr, lw=0.9, alpha=0.40,
                                        connectionstyle="arc3,rad=0.10"))
    else:
        ax.text(7.7, 4.2, "本宫无概念卡", fontsize=7.4, color="#A99C84", ha="center")

    # ---- 底部：条文（不压缩版才画）
    if not compact:
        y0 = 1.45
        for i, n in enumerate(p["tiao"][:6]):
            y = y0 - i * 0.30
            ax.text(0.25, y, str(n), fontsize=6.6,
                    color=(RED if n == hub else INK), fontweight="bold", va="center")
            ax.text(0.85, y, _wrap_cn(R["tj"][n]["text"], 30)[0], fontsize=6.2, color=INK,
                    va="center")
            q = R["vz"].get(n)
            ax.text(6.4, y, (f"「{q['raw']}」→{q['xue']}" if q else "—"), fontsize=5.8,
                    color=("#8A6A2F" if q else "#B7AB94"), va="center")
    return R


def fig_gong8(route, outdir):
    """8 张单宫小剖析（每宫一张 PNG）。"""
    outs = []
    for g in GONG8:
        fig, ax = plt.subplots(figsize=(8.2, 6.4), dpi=200)
        fig.patch.set_facecolor(PAPER)
        R = fig_gong_panel(ax, route, g, compact=False)
        p = R["p"]
        ax.set_title(f"G{g:02d} {p['xue'][0]}宫 · 概念卡 {len(R['con'])} 张"
                     + (f"（枢纽条 {R['hub']}）" if R["hub"] else "（无直引条，按术语归属）"),
                     fontsize=10.5, color=INK, pad=8)
        fig.tight_layout()
        path = os.path.join(outdir, f"f1f-g{g:02d}.png")
        fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
        plt.close(fig)
        outs.append(path)
    return outs



def fig_gong_map_panel(ax, route, gong):
    """全景图用的极简面板：只画房间（枢纽高亮）＋房下列卡名，不放正文。"""
    R = _gong_ctx(route, gong)
    p, hub, cards = R["p"], R["hub"], R["con"]
    ax.set_facecolor(PAPER)
    ax.set_xlim(0, 7)
    ax.set_ylim(0, 7)
    ax.set_aspect("equal")
    ax.axis("off")
    rx, ry, rw = 0.5, 2.55, 5.0
    ax.add_patch(Rectangle((rx, ry), rw, rw, facecolor="white", edgecolor=INK, lw=1.5, zorder=3))
    ax.plot([rx, rx + rw], [ry + 0.40, ry + 0.40], color="#D9C9A8", lw=4.5, zorder=2)
    ax.plot([rx + rw * 0.88, rx + rw * 0.88], [ry, ry + rw], color="#E3D3B2", lw=4.5, zorder=2)
    ax.plot([rx + rw * 0.10, rx + rw * 0.10], [ry, ry + rw], color="#DCCDB0", lw=3.2, zorder=2)
    ax.add_patch(Rectangle((rx + 0.22 * rw, ry + 0.76 * rw), 0.56 * rw, 0.15 * rw,
                           facecolor="#F3EAD6", edgecolor=ACCENT, lw=0.8, zorder=4))
    for z, t in zip(p["zhuang"], p["tiao"]):
        px, py = pos_of(z)
        x, y = rx + px * rw, ry + py * rw
        if t == hub:
            ax.scatter([x], [y], s=520, color=RED, alpha=0.18, zorder=5)
            ax.scatter([x], [y], s=150, color=RED, edgecolor="white", lw=1.3, zorder=6)
        else:
            ax.scatter([x], [y], s=115, color=ACCENT, edgecolor="white", lw=1.0, zorder=6)
        ax.text(x, y, str(t), fontsize=7.0 if t != hub else 8.0, color="white", ha="center",
                va="center", zorder=7, fontweight="bold")
    v = R["pres"].get(gong, {})
    ax.text(3.5, 7.15, f"G{gong:02d} {p['xue'][0]}宫（{p['jing']}）", fontsize=8.4, color=INK,
            ha="center", fontweight="bold")
    ax.text(3.5, 6.85, f"条 {p['tiao'][0]}-{p['tiao'][-1]} · 视频证据 {v.get('videoN', 0)}/{len(p['tiao'])}",
            fontsize=6.6, color=("#8A6A2F" if v.get("videoN") else "#A99C84"), ha="center")
    names = [f"{c['no']:02d} {c['term']}" for c in cards]
    yy = 2.2
    for line in _wrap_cn("／".join(names), 24):
        ax.text(0.5, yy, line, fontsize=6.6, color="#3A2E1E", va="top")
        yy -= 0.34
    if not names:
        ax.text(0.5, 2.2, "本宫无概念卡", fontsize=6.6, color="#A99C84", va="top")
    if hub:
        ax.text(0.5, 0.55, f"枢纽：条 {hub}（卡内直引）", fontsize=6.2, color=RED, va="top")
    else:
        ax.text(0.5, 0.55, "无直引条，按术语归属", fontsize=6.2, color="#A99C84", va="top")
    return R


def fig_panorama(route, path):
    """8 宫拼成一张「概念与宫位」全景图（2×4）。"""
    fig = plt.figure(figsize=(17.0, 10.6), dpi=185)
    fig.patch.set_facecolor(PAPER)
    gs = fig.add_gridspec(2, 4, hspace=0.16, wspace=0.06,
                          left=0.01, right=0.99, top=0.90, bottom=0.05)
    for i, g in enumerate(GONG8):
        ax = fig.add_subplot(gs[i // 4, i % 4])
        fig_gong_map_panel(ax, route, g)
    handles = [Rectangle((0, 0), 1, 1, facecolor="white", edgecolor=v, lw=1.4, label=k)
               for k, v in CAT_COLOR.items()]
    fig.legend(handles=handles, loc="lower center", ncol=3, frameon=False, fontsize=8.2,
               bbox_to_anchor=(0.5, 0.005))
    fig.suptitle("F1g · 概念与宫位全景（其余 8 宫）：每格＝一宫的房间（五桩各就各位）＋房下列出钉在这宫的概念卡\n"
                 "红桩＝卡内直引的枢纽条；详细剖析见 plots/f1f-gNN.png（每宫一张 8.2×6.4 大图，含条文与口播）",
                 fontsize=11.4, color=INK, y=0.975, linespacing=1.6)
    fig.savefig(path, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_walk_gif(route, colors, path, frames=80, fps=6):
    from matplotlib.animation import FuncAnimation, PillowWriter
    palaces = route["palaces"]
    fig, ax = plt.subplots(figsize=(9.8, 8.0), dpi=110)
    ax.set_facecolor(PAPER)

    def render(i):
        ax.clear()
        ax.set_facecolor(PAPER)
        for k, p in enumerate(palaces):
            cx, cy = cell_xy(k)
            dim = k > i
            draw_gong(ax, cx, cy, p, colors[p["jing"]] if not dim else "#D8CDBA",
                      hl=(k == i), note=not dim)
        cx, cy = cell_xy(i)
        ax.add_patch(Rectangle((cx - 0.46, cy - 0.46), 0.92, 0.92, facecolor="none",
                               edgecolor=RED, lw=3, zorder=9))
        ax.set_xlim(-0.8, 9.8)
        ax.set_ylim(-7.9, 0.9)
        ax.set_aspect("equal")
        ax.axis("off")
        p = palaces[i]
        ax.set_title(f"第 {i + 1}/80 宫 · {p['name']} · 条 {p['tiao'][0]}-{p['tiao'][-1]}"
                     f" · {'／'.join(p['xue']) if isinstance(p['xue'], list) else p['xue']}",
                     fontsize=11, color=INK)

    ani = FuncAnimation(fig, render, frames=frames, interval=1000 // fps)
    ani.save(path, writer=PillowWriter(fps=fps))
    plt.close(fig)
    return path


# ---------------------------------------------------------------- 交互模式（自定义回调）
def gui(route, pres, sem, auth, colors):
    import matplotlib.widgets as mw
    palaces = route["palaces"]
    fig = plt.figure(figsize=(15.5, 9.4), dpi=110)
    fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0.01, 0.10, 0.70, 0.87])
    ax.set_facecolor(PAPER)
    ax.set_xlim(-0.8, 9.8)
    ax.set_ylim(-7.9, 0.9)
    ax.set_aspect("equal")
    ax.axis("off")

    state = {"cur": 0, "quiz": None, "hit": 0, "miss": 0}

    def draw_all(hl=None):
        ax.clear()
        ax.set_facecolor(PAPER)
        ax.set_xlim(-0.8, 9.8)
        ax.set_ylim(-7.9, 0.9)
        ax.set_aspect("equal")
        ax.axis("off")
        for k, p in enumerate(palaces):
            cx, cy = cell_xy(k)
            draw_gong(ax, cx, cy, p, colors[p["jing"]], hl=(k == hl))
            if k == hl:
                ax.add_patch(Rectangle((cx - 0.46, cy - 0.46), 0.92, 0.92, facecolor="none",
                                       edgecolor=RED, lw=2.6, zorder=9))
        fig.canvas.draw_idle()

    txt = fig.text(0.745, 0.86, "", fontsize=9.5, va="top", color=INK, wrap=True)
    info = fig.text(0.745, 0.20, "", fontsize=8.2, va="top", color="#5C4B33", wrap=True)

    def name_of(k):
        return first_xue(palaces[k])

    def label_of(k):
        """紫宫 → 紫宫穴（避免「紫宫宫」这种叠字）。"""
        n = name_of(k)
        return n + ("穴" if n.endswith("宫") else "宫")

    def show(k):
        p = palaces[k]
        v = pres["palaces"][k]
        state["cur"] = k
        draw_all(hl=k)
        nos = p["tiao"]
        txt.set_text(f"G{p['gong']:02d} {label_of(k)}（{p['jing']}）\n"
                     f"篇：{p['pian']}\n"
                     f"条文：{nos[0]}-{nos[-1]}（{len(nos)} 条）\n"
                     f"桩位：{'／'.join(p['zhuang'])}\n"
                     f"视频证据：{v['videoN']} 条"
                     + (f"（首见 P{v['firstP']:02d} {v['firstSec'] // 60}:{v['firstSec'] % 60:02d}）"
                        if v["firstP"] else "（本表延伸）"))
        lines = []
        for z, t in zip(p["zhuang"], nos):
            a = auth.get(t, {})
            lines.append(f"{z} ← 条{t}｜{a.get('tag', '')}\n    {(a.get('image', '') or '')[:30]}…")
        info.set_text("\n".join(lines))
        fig.canvas.draw_idle()

    def on_click(ev):
        if ev.inaxes is not ax or ev.xdata is None:
            return
        for k in range(80):
            cx, cy = cell_xy(k)
            if abs(ev.xdata - cx) <= 0.46 and abs(ev.ydata - cy) <= 0.46:
                if state["quiz"] is not None:
                    q = state["quiz"]
                    ok = (k == q)
                    state["hit" if ok else "miss"] += 1
                    info.set_text(("√ 正确" if ok else f"× 应为 G{palaces[q]['gong']:02d}")
                                  + f"｜命中 {state['hit']} / 错误 {state['miss']}"
                                  + (f"\n下一题：{label_of(state['quiz'])} 的五桩在哪？" if ok else ""))
                    if ok:
                        state["quiz"] = rx.randrange(80)
                        txt.set_text(f"抽背模式：找 {label_of(state['quiz'])}"
                                     f"（首条 {palaces[state['quiz']]['tiao'][0]}）")
                    fig.canvas.draw_idle()
                    return
                show(k)
                return
        show(state["cur"])

    def on_key(ev):
        if ev.key in ("n", "right"):
            show(min(79, state["cur"] + 1))
        elif ev.key in ("p", "left"):
            show(max(0, state["cur"] - 1))
        elif ev.key == "t":
            state["quiz"] = rx.randrange(80)
            txt.set_text(f"抽背模式：找 {label_of(state['quiz'])}"
                         f"（首条 {palaces[state['quiz']]['tiao'][0]}）")
            fig.canvas.draw_idle()
        elif ev.key == "r":
            state.update({"quiz": None, "hit": 0, "miss": 0})
            show(0)

    fig.canvas.mpl_connect("button_press_event", on_click)
    fig.canvas.mpl_connect("key_press_event", on_key)

    axs = fig.add_axes([0.745, 0.09, 0.235, 0.03])
    sl = mw.Slider(axs, "宫号", 1, 80, valinit=1, valstep=1, color=ACCENT)

    def on_slide(v):
        show(int(v) - 1)

    sl.on_changed(on_slide)
    fig.text(0.745, 0.035, "点击查宫 · n/p 走宫 · t 抽背 · r 重置 · 滑条跳转",
             fontsize=8, color=MUTED)
    show(0)
    plt.show()


import random as rx  # noqa: E402  （抽背取题；测试里可被 mock）

def _wj(lines):
    """把 _wrap_cn 的行列表拼成多行文本（用 chr(10) 避免转义问题）。"""
    return chr(10).join(lines)


def _bez_mid(p0, p1, rad, frac=0.5):
    """arc3 连接线上参数 t=frac 的点（控制点 = 中点 + rad × 垂直向量）。"""
    (x0, y0), (x1, y1) = p0, p1
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    cx, cy = mx - rad * dy, my + rad * dx
    t = frac
    x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1
    y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1
    return x, y


def fig_chuanbian(path):
    """F7 六经传变总图：节点＝六经＋坏病＋自愈；边＝传变类型，标注证据条号。"""
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

    g = json.load(open(os.path.join(MAT, "chuanbian-graph.json"), encoding="utf-8"))
    nodes = {n["key"]: n for n in g["nodes"]}
    edges = g["edges"]

    POSN = {"太阴": (1.42, 8.45), "太阳": (4.85, 8.75), "自愈": (8.30, 9.12),
            "少阳": (8.28, 6.15), "变证": (1.42, 5.15), "阳明": (8.62, 2.95),
            "少阴": (2.85, 2.75), "厥阴": (5.80, 0.95)}
    BOX = {"太阳": "#F3E3C8", "阳明": "#EFD9C2", "少阳": "#F5EAD2", "太阴": "#E7EEDF",
           "少阴": "#DDE5EE", "厥阴": "#E6DCEB", "变证": "#EADFEE", "自愈": "#DFEDE2"}
    EDGEC = {"太阳": "#8A6A2F", "阳明": "#A2503C", "少阳": "#9C7B32", "太阴": "#5C7A55",
             "少阴": "#3E5C7A", "厥阴": "#6B4A8A", "变证": "#6B4A8A", "自愈": "#3E7A5C"}
    HALF = 1.22                      # 节点半宽（用于把箭头顶到框外）
    VHALF = 0.72

    def edge_pts(p0, p1):
        """把端点从节点中心推到框外，避免箭头被框盖住。"""
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        L = max(1e-6, math.hypot(dx, dy))
        ux, uy = dx / L, dy / L
        t0 = min(HALF / max(abs(ux), 1e-6), VHALF / max(abs(uy), 1e-6))
        t1 = min(HALF / max(abs(ux), 1e-6), VHALF / max(abs(uy), 1e-6))
        return (p0[0] + ux * t0, p0[1] + uy * t0), (p1[0] - ux * t1, p1[1] - uy * t1)

    # 同一起终点多条 → 不同弧度；个别边单独指定弧度与标注位置
    RAD = {("太阳", "阳明"): [0.26, -0.34], ("太阳", "少阳"): [0.18, -0.32],
           ("变证", "少阴"): [0.40]}
    FRAC = {("太阳", "阳明"): [0.38, 0.62], ("太阳", "少阳"): [0.36, 0.64],
            ("太阳", "少阴"): 0.62, ("太阳", "变证"): 0.58, ("太阳", "自愈"): 0.58,
            ("变证", "少阴"): 0.72, ("太阴", "少阴"): 0.38, ("少阳", "阳明"): 0.45}

    fig = plt.figure(figsize=(16.2, 9.8))
    fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0.010, 0.030, 0.700, 0.900])
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10.4)
    ax.axis("off")
    ax.set_facecolor(PAPER)
    fig.text(0.355, 0.972, "F7 六经传变总图 · 29 讲传变特征的有向图", ha="center",
             fontsize=17, color=INK, fontweight="bold")
    fig.text(0.355, 0.942,
             "节点＝六经＋坏病变证＋自愈；边＝传变类型，线上数字为证据条号（原文首句见 chuanbian-graph.json）",
             ha="center", fontsize=9.5, color="#5C4B33")

    pair_seen = {}
    for e in edges:
        a, b = e["from"], e["to"]
        k = pair_seen.get((a, b), 0)
        pair_seen[(a, b)] = k + 1
        rads = RAD.get((a, b), [0.20])
        rad = rads[k] if k < len(rads) else 0.5
        q0, q1 = edge_pts(POSN[a], POSN[b])
        st = e["style"]
        ax.add_patch(FancyArrowPatch(q0, q1, connectionstyle=f"arc3,rad={rad}",
                                     arrowstyle="-|>", mutation_scale=19,
                                     linewidth=2.0, color=st["color"], linestyle=st["ls"],
                                     alpha=0.92, zorder=2))
        f = FRAC.get((a, b), 0.5)
        if isinstance(f, list):
            f = f[k] if k < len(f) else 0.5
        mx, my = _bez_mid(q0, q1, rad, f)
        for kk, (bx, by) in POSN.items():
            if abs(mx - bx) < 1.30 and abs(my - by) < 0.80:
                print(f"  [label-collide] {a}->{b} 条{e['tiao']} at ({mx:.2f},{my:.2f}) 压住 {kk}")
        ax.text(mx, my, "条 " + "·".join(str(n) for n in e["tiao"]), fontsize=6.9,
                color=st["color"], ha="center", va="center", zorder=5,
                bbox=dict(boxstyle="round,pad=0.16", fc=PAPER, ec=st["color"], lw=0.55, alpha=0.96))

    for key, (cx, cy) in POSN.items():
        nd = nodes[key]
        w, h = 2.30, 1.32
        ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                                    boxstyle="round,pad=0.10,rounding_size=0.16",
                                    facecolor=BOX.get(key, "#F1E6CE"),
                                    edgecolor=EDGEC.get(key, ACCENT), linewidth=1.6, zorder=6))
        ax.text(cx, cy + 0.42, nd["name"], ha="center", va="center", fontsize=13.5,
                color=INK, fontweight="bold", zorder=7)
        ax.text(cx, cy + 0.15, nd["sub"], ha="center", va="center", fontsize=7.8,
                color="#5C4B33", zorder=7)
        ax.text(cx, cy - 0.20, f"条{nd['tigang']}｜" + _wj(_wrap_cn(nd["tigangHead"], 11)),
                ha="center", va="top", fontsize=6.8, color="#6B5740", zorder=7, linespacing=1.35)

    # ---- 右栏
    ax1 = fig.add_axes([0.720, 0.560, 0.268, 0.360])
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)
    ax1.axis("off")
    ax1.text(0, 0.990, "① 十类边（14 条）", fontsize=10.5, color=ACCENT, fontweight="bold", va="top")
    types = []
    for e in edges:
        if e["type"] not in types:
            types.append(e["type"])
    y = 0.890
    for t in types:
        es = [e for e in edges if e["type"] == t]
        st = es[0]["style"]
        ax1.plot([0.01, 0.19], [y, y], color=st["color"], lw=2.0, ls=st["ls"], clip_on=False)
        ax1.text(0.24, y, t, fontsize=8.1, color=INK, va="center")
        ax1.text(0.995, y, f"{len(es)} 条·条{es[0]['tiao'][0]}", fontsize=7.2,
                 color="#6B5740", va="center", ha="right")
        y -= 0.079

    ax2 = fig.add_axes([0.720, 0.300, 0.268, 0.238])
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.axis("off")
    ax2.text(0, 0.995, "② 判传四件（条 4/5/61/8）", fontsize=10.5, color=ACCENT,
             fontweight="bold", va="top")
    y = 0.845
    for c in g["criteria"]:
        ax2.text(0.005, y, "· " + c["k"], fontsize=8.2, color=INK, fontweight="bold", va="top")
        y -= 0.068
        ax2.text(0.030, y, _wj(_wrap_cn(c["t"], 25)), fontsize=6.9, color="#5C4B33",
                 va="top", linespacing=1.42)
        y -= 0.170

    ax3 = fig.add_axes([0.720, 0.055, 0.268, 0.215])
    ax3.set_xlim(0, 1)
    ax3.set_ylim(0, 1)
    ax3.axis("off")
    ax3.text(0, 0.995, "③ 读法", fontsize=10.5, color=ACCENT, fontweight="bold", va="top")
    read = ["先看实线：六经按顺序走，这是自然史。",
            "再看虚线：误汗、误下、坏病——同一条经可被治疗推向另一条经。",
            "最后看绿线：自愈有三条出口（七日节律、冒家汗出、战汗），背到该条要能说出出口条件。",
            "标注「原文·视频未讲」的边（太阴→少阴、少阴→厥阴、厥阴欲愈）属宋本原文层，非作者口播。"]
    y = 0.855
    for t in read:
        ax3.text(0.005, y, _wj(_wrap_cn(t, 26)), fontsize=7.3, color="#4A3D2B",
                 va="top", linespacing=1.55)
        y -= 0.240

    fig.text(0.015, 0.010,
             "统计：8 节点 / 14 边；其中视频覆盖（条≤100）"
             f"{g['counts']['video_covered']} 条边，其余属宋本原文层。边不表示「必然发生」，只表示该条原文写出的可传方向。",
             fontsize=8.2, color="#6B5740")

    fig.savefig(path, dpi=150, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def fig_axis_heat(path):
    """F8 病机轴索引热图：51 个语义群 × 九轴（0-3），按主轴分块排序。"""
    AX = ["热势", "津伤", "阳衰", "水饮", "气滞", "血瘀", "神乱", "里实", "表郁"]
    AXC = {"热势": "#B4553C", "津伤": "#B08A2E", "阳衰": "#3E5C7A", "水饮": "#3E7A6E",
           "气滞": "#7A6A2E", "血瘀": "#6B4A8A", "神乱": "#8C3B2E", "里实": "#7A4A22",
           "表郁": "#8A6A2F"}
    d = json.load(open(os.path.join(MAT, "axis-index.json"), encoding="utf-8"))
    gs = [g for g in d["groups"] if g["main"] != "（无轴）"]
    gs.sort(key=lambda g: (AX.index(g["main"]), -g["vec"][g["main"]], g["sheet"], g["i"]))
    M = np.array([[g["vec"][a] for a in AX] for g in gs], dtype=float)

    fig = plt.figure(figsize=(13.6, 0.30 * len(gs) + 2.4))
    fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0.345, 0.085, 0.398, 0.855])
    im = ax.imshow(M, cmap="YlOrBr", vmin=0, vmax=3.4, aspect="auto")
    ax.set_xticks(range(len(AX)))
    ax.set_xticklabels(AX, fontsize=10.5, color=INK)
    ax.set_yticks(range(len(gs)))
    ax.set_yticklabels([f"{g['sheet']}·{_cut(g['name'], 20)}" for g in gs], fontsize=6.9)
    for tick, g in zip(ax.get_yticklabels(), gs):
        tick.set_color(AXC.get(g["main"], INK))
    for i in range(len(gs)):
        for j, a in enumerate(AX):
            v = M[i, j]
            if v <= 0:
                continue
            ax.text(j, i, (f"{v:g}"), ha="center", va="center", fontsize=6.4,
                    color="#FFFFFF" if v >= 2.0 else "#3A2E1E")
    # 主轴分块线
    prev = None
    for i, g in enumerate(gs):
        if prev is not None and g["main"] != prev:
            ax.axhline(i - 0.5, color="#7A6A55", lw=1.1)
            ax.text(-0.62, i - 0.5, "▲", fontsize=6.5, color=ACCENT, va="center", ha="right")
        prev = g["main"]
    ax.set_xticks(np.arange(-.5, len(AX), 1), minor=True)
    ax.set_yticks(np.arange(-.5, len(gs), 1), minor=True)
    ax.grid(which="minor", color="#EADFCB", lw=0.6)
    ax.tick_params(which="minor", length=0)
    for s in ax.spines.values():
        s.set_color("#C8B79A")
    # 不画色标：格内已写数值，避免与右栏图例抢位

    fig.text(0.335, 0.972, "F8 病机轴索引 · 51 个语义群 × 九轴", ha="center", fontsize=16.5,
             color=INK, fontweight="bold")
    fig.text(0.335, 0.947,
             "行＝语义群（按主轴分块，行首颜色即主轴）；列＝九轴；数值＝该组条目的轴均分，"
             "人工裁定组在该轴取 1 档。空白＝该组不涉此轴。",
             ha="center", fontsize=8.6, color="#5C4B33")

    # 右侧：九轴计数与代表方
    axr = fig.add_axes([0.788, 0.30, 0.200, 0.55])
    axr.set_xlim(0, 1)
    axr.set_ylim(0, 1)
    axr.axis("off")
    axr.text(0, 1.02, "按轴检索（组数 / 强档 / 代表方）", fontsize=9.2, color=ACCENT,
             fontweight="bold", va="top")
    axr.text(0, -0.035, "档：0＝不涉 / 1＝有 / 2＝显 / 3＝主", fontsize=7.2, color="#7A6A55", va="top")
    y = 0.905
    for t in d["axes"]:
        axr.plot([0.00, 0.06], [y + 0.018, y + 0.018], color=AXC[t["axis"]], lw=4.0, clip_on=False)
        axr.text(0.10, y, t["axis"], fontsize=8.6, color=INK, va="center", fontweight="bold")
        axr.text(0.985, y, f"{t['n_groups']} 组 / 强档 {t['n_strong']}", fontsize=7.4,
                 color="#5C4B33", va="center", ha="right")
        axr.text(0.10, y - 0.052, _cut("、".join(t["top_fang"][:4]) or "（无）", 26),
                 fontsize=6.6, color="#7A6A55", va="center")
        y -= 0.104

    c = d["counts"]
    fig.text(0.020, 0.012,
             f"口径：82 个语义群中 {c['with_axis']} 个归轴、{c['no_axis']} 个判为「无轴」（结构·数据表与方法组，不硬挂病机）；"
             f"归轴者中 {c['overridden']} 组为人工裁定（自动口径全 0 或与组名冲突，理由见 axis-overrides.json），其余取 semtensor 条向量均值。",
             fontsize=7.8, color="#6B5740")
    fig.text(0.020, 0.036,
             f"主轴分布：阳衰 {c['by_axis_main']['阳衰']}、表郁 {c['by_axis_main']['表郁']}、热势 {c['by_axis_main']['热势']}、"
             f"水饮 {c['by_axis_main']['水饮']}、气滞 {c['by_axis_main']['气滞']}、神乱 {c['by_axis_main']['神乱']}、"
             f"津伤 {c['by_axis_main']['津伤']}、里实 {c['by_axis_main']['里实']}、血瘀 {c['by_axis_main']['血瘀']}",
             fontsize=7.8, color="#6B5740")

    fig.savefig(path, dpi=150, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def _cut(s, n):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "…"

FIGSPEC = [
    ("f1-overview.png", "F1 总图", "10×8 宫格蛇形；格内五点＝五桩、点内数字＝条号；左上宫号、格底首穴；"
                                "右上红点＝该宫有视频证据；行首箭头＝该行走向（蛇形来回）。"),
    ("f1b-zoom20.png", "F1b 前 20 宫放大", "视频证据只落在 G01-G20（条 1-100）；此图放大了格内条号与方位名，"
                                        "每宫上方标该宫在源视频里的首见时刻与证据条数。"),
    ("f1c-concepts.png", "F1c P29 概念卡 18 张",
     "《心与心包》是概念讲、没有条文：18 张卡把「灵魂之心／肉体之心／条文·证候」三层分开，卡卡都有时间戳与挂点。"),
    ("f1d-pins.png", "F1d 18 张概念卡钉到八十宫",
     "左边 9 张、右边 9 张，中间 10×8 八十宫；线＝该卡的挂点宫位（一卡多宫就多条线），"
     "红点数字＝该宫被几张卡钉住；虚里两张属诊法层，虚线连到底部说明框，不硬塞进宫。"),
    ("f1e-g15.png", "F1e G15 样板宫剖析",
     "一宫五桩里「北案·条76」扛住 5 张概念卡：左房间、右五卡、下条文——示范「一桩多义」，"
     "概念不另建空间，全挂在已有桩上。"),
    ("f1g-panorama.png", "F1g 概念与宫位全景（其余 8 宫）",
     "G03/G04/G08/G20/G31/G47/G56/G66 各一格：房间＋钉住的概念卡；线标「直引条 N」或「按术语归属（推断）」，"
     "推断不冒充原文。单宫大图另存 plots/f1f-gNN.png。"),
    ("f2-zone4.png", "F2 一宫四型", "5 条＝五方各一（东厢=1、南窗=2、西壁=3、北案=4、中庭=5）；6 条＝加「回廊」第六位；"
                                 "4 条＝中庭空着；回宫二轮＝同一桩换第二层图像。"),
    ("f3-locate.png", "F3 条→宫定位曲线", "黑线实际宫号（阶梯），灰虚线＝条/5；红点线＝9 处断点，"
                                       "逐点标注「宫号 / 几条 / 断在第几条」。"),
    ("f4-band.png", "F4 经络条带", "任脉 24（逆序）→督脉 28→十二经 309→回宫二轮 37（红），合计 398。"),
    ("f7-chuanbian.png", "F7 六经传变总图",
     "节点＝太阳/阳明/少阳/太阴/少阴/厥阴＋坏病·变证＋自愈；边＝十类传变，线上数字为证据条号；"
     "虚线一律是「治疗塑造的路径」（误汗/误下/坏病），绿线是自愈出口。"),
    ("f8-axis.png", "F8 病机轴索引",
     "51 个语义群 × 九轴（0-3）：行按主轴分块，数值为该组条目的轴均分；右侧列九轴的组数、强档数与代表方。"),
    ("f6-checkin.png", "F5 打卡表（80 宫）", "一宫一行；四格＝当天／+3 天／+7 天／+21 天各复述一遍后打勾，"
                                          "用于间隔重复与提取练习的记录。"),
]


def make_pdf(path):
    from matplotlib.backends.backend_pdf import PdfPages
    with PdfPages(path) as pdf:
        for fn, title, cap in FIGSPEC:
            p = os.path.join(OUTD, fn)
            if not os.path.exists(p):
                continue
            from matplotlib.image import imread
            img = imread(p)
            fig = plt.figure(figsize=(img.shape[1] / 200, img.shape[0] / 200 + 1.2), dpi=150)
            fig.patch.set_facecolor(PAPER)
            ax = fig.add_axes([0.02, 0.10, 0.96, 0.80])
            ax.imshow(img)
            ax.axis("off")
            fig.text(0.5, 0.955, title, ha="center", fontsize=15, color=INK)
            fig.text(0.5, 0.045, cap, ha="center", fontsize=9.5, color="#5C4B33", wrap=True)
            pdf.savefig(fig, facecolor=PAPER)
            plt.close(fig)
        d = pdf.infodict()
        d["Title"] = "八十宫殿示意图 · 《伤寒论》398 条全脑记忆"
        d["Author"] = "tcmai · Hermes"
    return path


def main():
    route, pres, sem, auth, tiao = load()
    os.makedirs(OUTD, exist_ok=True)
    colors = jing_colors(route)
    mode = sys.argv[1] if len(sys.argv) > 1 else "static"
    if mode == "gui":
        gui(route, pres, sem, auth, colors)
        return
    if mode == "gif":
        p = fig_walk_gif(route, colors, os.path.join(OUTD, "palace-walk.gif"))
        print("saved", p, round(os.path.getsize(p) / 1024), "KB")
        return
    outs = [
        fig_overview(route, pres, colors, os.path.join(OUTD, "f1-overview.png")),
        fig_zoom20(route, pres, colors, os.path.join(OUTD, "f1b-zoom20.png")),
        fig_concept_cards(os.path.join(OUTD, "f1c-concepts.png")),
        fig_concept_pins(route, os.path.join(OUTD, "f1d-pins.png")),
        fig_g15(route, os.path.join(OUTD, "f1e-g15.png")),
        fig_panorama(route, os.path.join(OUTD, "f1g-panorama.png")),
        *fig_gong8(route, OUTD),
        fig_zone4(route, colors, os.path.join(OUTD, "f2-zone4.png")),
        fig_locate(route, os.path.join(OUTD, "f3-locate.png")),
        fig_band(route, os.path.join(OUTD, "f4-band.png")),
        fig_checkin(route, os.path.join(OUTD, "f6-checkin.png")),
        fig_chuanbian(os.path.join(OUTD, "f7-chuanbian.png")),
        fig_axis_heat(os.path.join(OUTD, "f8-axis.png")),
    ]
    for p in outs:
        print("saved", p, round(os.path.getsize(p) / 1024), "KB")
    if mode == "pdf":
        p = make_pdf(os.path.join(OUTD, "八十宫殿示意图.pdf"))
        print("saved", p, round(os.path.getsize(p) / 1024), "KB")


if __name__ == "__main__":
    main()
