# -*- coding: utf-8 -*-
"""通用：把 docs 里的「如图所示/见上图」改成按节号定位的图号回指。用法: <dept_rel>"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, sys.argv[1])
BAD = ["如图所示", "如下图所示", "见上图", "如上图", "见图所示"]
SEC = re.compile(r"^#{2,4}\s*(\d+\.\d+)\b")
SUBR = re.compile(r"^#{2,4}\s*(\d+\.\d+\.\d+)\b")

CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]
nf = nh = 0
for c in CH:
    d = os.path.join(DEPT, "chapters", c["slug"])
    fp = os.path.join(d, "figures.json")
    if not os.path.exists(fp):
        continue
    fig_of = {f["sec"]: f["no"] for f in json.load(io.open(fp, encoding="utf-8"))["figures"]}
    p = os.path.join(d, "docs", "zh.md")
    t = io.open(p, encoding="utf-8").read()
    out, cur, hits = [], None, 0
    for line in t.split("\n"):
        m = SEC.match(line) or SUBR.match(line)
        if m:
            cur = ".".join(m.group(1).split(".")[:2])
        if any(b in line for b in BAD):
            ref = fig_of.get(cur)
            rep = f"见「{ref} 图注」" if ref else "见本节图注"
            for b in BAD:
                if b in line:
                    line = line.replace(b, rep)
                    hits += 1
        out.append(line)
    if hits:
        io.open(p, "w", encoding="utf-8").write("\n".join(out))
        nf += 1
        nh += hits
print(f"{sys.argv[1]}: 改写 {nf} 文件 · {nh} 处")
