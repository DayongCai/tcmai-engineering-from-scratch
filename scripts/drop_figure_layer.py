# -*- coding: utf-8 -*-
"""删除某课的图注层（纲要型底本不灌水）：去掉 docs 的「图注」节、删 figures.json 与 图示缺口.md。

用法: python scripts/drop_figure_layer.py departments/07-zhineng/05-zhongyi-zhishi-tupu
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, sys.argv[1])
MARK = "## 图注（可独立阅读）"
CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]

for c in CH:
    d = os.path.join(DEPT, "chapters", c["slug"])
    p = os.path.join(d, "docs", "zh.md")
    if os.path.exists(p):
        t = io.open(p, encoding="utf-8").read()
        if MARK in t:
            t = re.split(r"\n" + re.escape(MARK), t)[0].rstrip() + "\n"
            io.open(p, "w", encoding="utf-8").write(t)
    for f in ("figures.json", "图示缺口.md"):
        fp = os.path.join(d, f)
        if os.path.exists(fp):
            os.remove(fp)
for f in ("图示缺口.md",):
    fp = os.path.join(DEPT, f)
    if os.path.exists(fp):
        os.remove(fp)
print(f"{sys.argv[1]}: 图注层已移除")
