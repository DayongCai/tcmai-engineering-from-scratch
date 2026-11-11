# -*- coding: utf-8 -*-
"""删除 units.json 中正文为空的单元（hanzi==0），重编号 sub，并同步 chapter-map。

用法: python scripts/drop_empty_units.py <sub>
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub = sys.argv[1]
up = os.path.join(ROOT, "standards", sub, "units.json")
U = json.load(io.open(up, encoding="utf-8"))
n0 = len(U["units"])
U["units"] = [u for u in U["units"] if (u.get("hanzi") or 0) > 0]
counter = {}
for u in U["units"]:
    counter[u["chapter"]] = counter.get(u["chapter"], 0) + 1
    u["sub"] = f"{u['chapter']}.{counter[u['chapter']]}"
U["counts"]["units"] = len(U["units"])
U["counts"]["hanzi"] = sum(u["hanzi"] for u in U["units"])
for c in U["chapters"]:
    c["units"] = sum(1 for u in U["units"] if int(u["chapter"]) == int(c["no"]))
tv = {k: sum(u["measure"]["view"][k] for u in U["units"]) for k in U["views"]}
U["probe"]["view"] = tv
U["ratio"]["view"] = round(max(tv.values()) / max(1, min(tv.values())), 1)
json.dump(U, io.open(up, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

cm_p = os.path.join(ROOT, "standards", sub, "chapter-map.json")
if os.path.exists(cm_p):
    CM = json.load(io.open(cm_p, encoding="utf-8"))
    for slug, v in CM["chapters"].items():
        v["units"] = [u["sub"] for u in U["units"] if int(u["chapter"]) == v["n"]]
    json.dump(CM, io.open(cm_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sub}: 单元 {n0} → {len(U['units'])}（删掉正文为空的 {n0 - len(U['units'])} 个）· {U['counts']['hanzi']:,} 汉字")
