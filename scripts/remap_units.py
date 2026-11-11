# -*- coding: utf-8 -*-
"""把 units.json 的教材章按分组重映射为课程章（用于 12→10 这类压章），并重算三辨/四位面。

用法: python scripts/remap_units.py <sub> "1-2,3,4,5,6,7,8,9,10,11-12" "章名1|章名2|..."
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub, groups_s, titles_s = sys.argv[1], sys.argv[2], sys.argv[3]
p = os.path.join(ROOT, "standards", sub, "units.json")
U = json.load(io.open(p, encoding="utf-8"))

groups = []
for g in groups_s.split(","):
    g = g.strip()
    groups.append(list(range(int(g.split("-")[0]), int(g.split("-")[1]) + 1)) if "-" in g else [int(g)])
titles = titles_s.split("|")
assert len(groups) == len(titles), f"分组 {len(groups)} ≠ 章名 {len(titles)}"
old = sorted({int(u["chapter"]) for u in U["units"]})
flat = [c for g in groups for c in g]
assert sorted(flat) == old, f"分组未覆盖教材章：{sorted(flat)} vs {old}"

m = {}
for ci, g in enumerate(groups, 1):
    for c in g:
        m[c] = ci
units, cnt = [], {}
for u in U["units"]:
    ci = m[int(u["chapter"])]
    cnt[ci] = cnt.get(ci, 0) + 1
    nu = dict(u)
    nu["chapter"] = str(ci)
    nu["sub"] = f"{ci}.{cnt[ci]}"
    nu["chapterTitle"] = titles[ci - 1]
    nu["secNo"] = f"{ci}.{u.get('secNo', cnt[ci]).split('.')[-1]}"
    units.append(nu)

VIEWS, LEVELS = U["views"], U["levels"]
first = list(LEVELS.values())[0] if LEVELS else []
if first and isinstance(first[0], str):
    # 词表型四位面：按词重算
    for u in units:
        u["measure"]["levels"] = {k: sum(u["body"].count(w) for w in ws) for k, ws in LEVELS.items()}
    tl = {k: sum(u["measure"]["levels"][k] for u in units) for k in LEVELS}
    LV = LEVELS
else:
    tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
    LV = LEVELS

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
U["units"] = units
U["chapters"] = [{"no": i, "title": titles[i - 1], "units": sum(1 for u in units if int(u["chapter"]) == i)}
                 for i in range(1, len(titles) + 1)]
U["counts"] = {"chapters": len(titles), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
               "valueLike": sum(u["measure"].get("valueLike", 0) for u in units)}
U["probe"] = {"view": tv, "A_part": tl}
U["ratio"] = {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
              "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)}
json.dump(U, io.open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for c in U["chapters"]:
    h = sum(u["hanzi"] for u in units if int(u["chapter"]) == c["no"])
    print(f"  ch{c['no']} {c['title'][:20]} · {c['units']} 单元 · {h:,} 汉字")
print(f"{sub}: {len(titles)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
