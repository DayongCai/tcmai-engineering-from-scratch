# -*- coding: utf-8 -*-
"""把某课章节 slug 里的大写改成小写，并同步 chapters.json / code / test / docs 里的路径。

用法: python scripts/lower_slugs.py departments/07-zhineng/15-zhongyi-ai-lunli-zhili
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, sys.argv[1])
CH = os.path.join(D, "chapters")
mapping = {}
for name in sorted(os.listdir(CH)):
    low = name.lower()
    if low != name:
        mapping[name] = low
for old, new in mapping.items():
    os.rename(os.path.join(CH, old), os.path.join(CH, new))
    print("rename", old, "→", new)

cm = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))
for c in cm["chapters"]:
    c["slug"] = c["slug"].lower()
    c["docs"] = f"chapters/{c['slug']}/docs/zh.md"
    c["code"] = f"chapters/{c['slug']}/code/main.js"
json.dump(cm, io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

n = 0
for name in os.listdir(CH):
    for rel in ("code/main.js", "code/main.test.js", "docs/zh.md", "outputs", "skill"):
        p = os.path.join(CH, name, rel)
        paths = []
        if os.path.isdir(p):
            for r, _, fs in os.walk(p):
                paths += [os.path.join(r, f) for f in fs]
        elif os.path.exists(p):
            paths = [p]
        for f in paths:
            try:
                s = io.open(f, encoding="utf-8").read()
            except Exception:
                continue
            t = s
            for old, new in mapping.items():
                t = t.replace(old, new)
            if t != s:
                io.open(f, "w", encoding="utf-8").write(t)
                n += 1
print("改写文件", n, "· 重命名", len(mapping))
