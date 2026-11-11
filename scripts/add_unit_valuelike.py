# -*- coding: utf-8 -*-
"""给 units.json 的每个单元补 measure.valueLike（数字＋计量单位命中数）。用法: <sub>"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub = sys.argv[1]
P = os.path.join(ROOT, "standards", sub, "units.json")
U = json.load(io.open(P, encoding="utf-8"))
VALUE = re.compile(r"\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|%|mg|ml|mL|kg|cm|mm|min|小时|分钟|倍|周|天|年|岁)")
n = 0
for u in U["units"]:
    body = u.get("body") or "\n".join(s.get("text", "") for s in u.get("segments", []))
    u.setdefault("measure", {})["valueLike"] = len(VALUE.findall(body))
    n += u["measure"]["valueLike"]
U["counts"]["valueLike"] = n
json.dump(U, io.open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{sub}: 逐单元 valueLike 已补 · 合计 {n} 处")
