# -*- coding: utf-8 -*-
"""图 9 症状反查覆盖：词项的「可落证数」分布与头部长尾

内容依据：textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/00-凡例与使用.md §3
  「位 locus」「22 证位 + 71 候位」「12 门 + 45 类」

口径：把 22 个证位与 45 个类目的「见症」字段全部拆成词项（顿号/逗号/分号切分），
去重后对每个词项统计它能落到多少条证（位命中或性命中）。左图是分布，
右图是可落证数最多的 12 个词项 —— 它们就是「一句话里最容易引起歧义的词」。
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "scripts" / "figures"))

from tcm_figure import canvas_grid, save, INK, MUTED, ACCENT

STRUCT = json.loads((ROOT / "standards" / "zhenghou-cidian" / "结构.json").read_text(encoding="utf-8"))
WEI = json.loads((ROOT / "standards" / "zhenghou-cidian" / "语素-位.json").read_text(encoding="utf-8"))
XING = json.loads((ROOT / "standards" / "zhenghou-cidian" / "语素-性.json").read_text(encoding="utf-8"))

steps = [
    ("位 locus", "locus"),
    ("22 证位 + 71 候位", "axes"),
    ("12 门 + 45 类", "lei"),
]


def terms(s):
    return [t.strip() for t in re.split(r"[、，；/]", s or "") if t.strip()]


cards = []
for m in STRUCT["men"]:
    for l in m["lei"]:
        for z in l["zhengList"]:
            cards.append((z["wei"], l["zh"], len(z["houList"])))

rev = {}
for w in WEI["证位"]:
    for t in terms(w.get("见症", "")):
        rev.setdefault(t, {"位": set(), "性": set()})["位"].add(w["zh"])
for y in XING["类"]:
    for t in terms(y.get("见症", "")):
        rev.setdefault(t, {"位": set(), "性": set()})["性"].add(y["zh"])

rows = []
for t, e in rev.items():
    n = sum(1 for w, lz, _ in cards if w in e["位"] or lz in e["性"])
    rows.append((t, n))

counts = [n for _, n in rows]
avg = sum(counts) / max(1, len(counts))
rows.sort(key=lambda r: (-r[1], r[0]))
top = rows[:12][::-1]

fig, (ax1, ax2) = canvas_grid(1, 2, w=10.4, h=4.3, gridspec_kw={"width_ratios": [1, 1.2]})

bins = range(0, max(counts) + 10, 10)
ax1.hist(counts, bins=bins, color=ACCENT, alpha=0.72, edgecolor="#fbf8f2", linewidth=0.6, zorder=3)
ax1.axvline(avg, color=INK, ls=(0, (4, 3)), lw=1.3, zorder=4)
ax1.text(avg + 2, ax1.get_ylim()[1] * 0.85, "均值 %.1f" % avg, fontsize=9, color=INK)
ax1.set_title("每个词项能落到多少条证（%d 个词项）" % len(rows), fontsize=11.2, pad=10)
ax1.set_xlabel("可落证数", fontsize=9.4, color=MUTED)
ax1.set_ylabel("词项数", fontsize=9.4, color=MUTED)
ax1.grid(axis="y", alpha=0.3, zorder=0)
ax1.set_axisbelow(True)
ax1.text(0.02, -0.22, "最少 %d 条 · 最多 %d 条：一个词能落 60 条，说明它几乎不携带鉴别信息"
         % (min(counts), max(counts)),
         transform=ax1.transAxes, fontsize=7.8, color=MUTED)

ax2.barh([t for t, _ in top], [n for _, n in top], color="#5f4f8f", alpha=0.8, height=0.6, zorder=3)
for i, (_, n) in enumerate(top):
    ax2.text(n + 1, i, str(n), va="center", fontsize=8.4, color=INK)
ax2.set_title("最「泛」的 12 个词项（可落证最多）", fontsize=11.2, pad=10)
ax2.set_xlabel("可落证数", fontsize=9.4, color=MUTED)
ax2.grid(axis="x", alpha=0.3, zorder=0)
ax2.set_axisbelow(True)
ax2.tick_params(axis="y", length=0)
ax2.set_xlim(0, max(counts) * 1.18)

fig.text(0.012, 0.005,
         "源：standards/zhenghou-cidian/语素-位.json + 语素-性.json · 词项只来自「见症」字段，未扩词",
         fontsize=7.4, color=MUTED)

save(fig)
