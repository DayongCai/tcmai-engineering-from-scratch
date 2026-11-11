# -*- coding: utf-8 -*-
"""通用：把 standards/<sub>/units.json 里正文过短的单元并入前一单元，并重编号。

用法: python scripts/merge_short_units.py <sub> [阈值汉字数，默认 150]
适用：教材表格单元格被误判成小节标题的情形（机器学习教材首版 32 个碎单元就是这么来的）。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub = sys.argv[1]
thr = int(sys.argv[2]) if len(sys.argv) > 2 else 150
P = os.path.join(ROOT, "standards", sub, "units.json")
U = json.load(io.open(P, encoding="utf-8"))
HANZI = re.compile(r"[\u4e00-\u9fff]")

n0 = len(U["units"])
clean = []
for u in U["units"]:
    body = u.get("body") or "\n".join(s.get("text", "") for s in u.get("segments", []))
    h = len(HANZI.findall(body))
    if h < thr and clean and clean[-1]["chapter"] == u["chapter"]:
        prev = clean[-1]
        prev.setdefault("segments", []).extend(u.get("segments", []))
        prev["title"] = prev["title"] + "／" + u["title"]
    else:
        clean.append(u)

counter = {}
for u in clean:
    counter[u["chapter"]] = counter.get(u["chapter"], 0) + 1
    u["sub"] = f"{u['chapter']}.{counter[u['chapter']]}"
    u["locator"] = f"教材·第{u['chapter']}章·{u['sub']}"
    body = "\n".join(s.get("text", "") for s in u.get("segments", []))
    u["body"] = u["rawBody"] = u["prose"] = body
    u["hanzi"] = len(HANZI.findall(body))
    views = U["views"]
    u["measure"] = {"view": {k: sum(body.count(w) for w in ws) for k, ws in views.items()}}
    u["measure"]["views"] = dict(u["measure"]["view"])
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0)
                              for p, chs in U.get("_planes", {}).items()} or u["measure"].get("levels", {})

# 如果存在 axes.json，用它的 levelsA 重算位面
ax_p = os.path.join(ROOT, "standards", sub, "axes.json")
planes = {}
if os.path.exists(ax_p):
    planes = json.load(io.open(ax_p, encoding="utf-8")).get("levelsA") or {}
for u in clean:
    if planes:
        u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in planes.items()}
U["units"] = clean
U["counts"]["units"] = len(clean)
U["counts"]["hanzi"] = sum(u["hanzi"] for u in clean)
tv = {k: sum(u["measure"]["view"][k] for u in clean) for k in U["views"]}
tp = {p: sum(u["hanzi"] for u in clean if int(u["chapter"]) in chs) for p, chs in planes.items()} if planes else U["probe"]["A_part"]
U["probe"] = {"view": tv, "A_part": tp}
U["ratio"] = {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
              "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)}
U["chapters"] = [c for c in U["chapters"]]
for c in U["chapters"]:
    c["units"] = sum(1 for u in clean if int(u["chapter"]) == int(c["no"]))
json.dump(U, io.open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sub}: {n0} → {len(clean)} 单元 · {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
