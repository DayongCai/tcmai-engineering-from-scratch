# -*- coding: utf-8 -*-
"""把「如图所示 / 见上图 / 如上图」改成图号回指（按所在小节的节号定位图号）。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES = [
    ("renti-jiepou-xue", "departments/09-jichu/01-renti-jiepou-xue"),
    ("zuzhi-peitai-xue", "departments/09-jichu/02-zuzhi-peitai-xue"),
    ("shengli", "departments/09-jichu/06-shengli-xue"),
    ("shenghua-xue", "departments/09-jichu/07-shenghua-xue"),
    ("jubu-jiepou-xue", "departments/09-jichu/08-jubu-jiepou-xue"),
    ("bingli", "departments/09-jichu/10-bingli-xue"),
]
BAD = ["如图所示", "如下图所示", "见上图", "如上图", "见图所示"]
SEC = re.compile(r"^#{2,4}\s*(\d+\.\d+)\b")
SUB = re.compile(r"^#{2,4}\s*(\d+\.\d+\.\d+)\b")

n_files = n_hits = 0
for sub, dept_rel in COURSES:
    DEPT = os.path.join(ROOT, dept_rel)
    CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]
    for c in CH:
        d = os.path.join(DEPT, "chapters", c["slug"])
        fp = os.path.join(d, "figures.json")
        if not os.path.exists(fp):
            continue
        figs = json.load(io.open(fp, encoding="utf-8"))["figures"]
        fig_of = {f["sec"]: f["no"] for f in figs}
        p = os.path.join(d, "docs", "zh.md")
        t = io.open(p, encoding="utf-8").read()
        out, cur_sec, hits = [], None, 0
        for line in t.split("\n"):
            m = SEC.match(line) or SUB.match(line)
            if m:
                cur_sec = ".".join(m.group(1).split(".")[:2])
            if any(b in line for b in BAD):
                ref = fig_of.get(cur_sec)
                rep = f"见「{ref} 图注」" if ref else "见本节图注"
                for b in BAD:
                    if b in line:
                        line = line.replace(b, rep)
                        hits += 1
            out.append(line)
        if hits:
            io.open(p, "w", encoding="utf-8").write("\n".join(out))
            n_files += 1
            n_hits += hits
print(f"改写 {n_files} 个文件 · {n_hits} 处「如图/见上图」→ 图号回指")
