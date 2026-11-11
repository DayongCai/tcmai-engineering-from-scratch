# -*- coding: utf-8 -*-
"""把某课章节 slug 改成有意义的短名，并同步 chapters.json / chapter-map / code / test / docs / outputs。

用法: python scripts/rename_chapter_slugs.py <sub> <dept_rel> "01-old=01-new,02-old=02-new,..."
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub, dept_rel, pairs = sys.argv[1], sys.argv[2], sys.argv[3]
D = os.path.join(ROOT, dept_rel)
CH = os.path.join(D, "chapters")
S = os.path.join(ROOT, "standards", sub)
mapping = {}
for p in pairs.split(","):
    old, new = p.split("=")
    mapping[old.strip()] = new.strip()

for old, new in mapping.items():
    src, dst = os.path.join(CH, old), os.path.join(CH, new)
    if os.path.isdir(src):
        os.rename(src, dst)
        print("rename", old, "→", new)

cm_path = os.path.join(D, "chapters.json")
CM = json.load(io.open(cm_path, encoding="utf-8"))
for c in CM["chapters"]:
    if c["slug"] in mapping:
        c["slug"] = mapping[c["slug"]]
    c["docs"] = f"chapters/{c['slug']}/docs/zh.md"
    c["code"] = f"chapters/{c['slug']}/code/main.js"
json.dump(CM, io.open(cm_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

cmap_path = os.path.join(S, "chapter-map.json")
if os.path.exists(cmap_path):
    M = json.load(io.open(cmap_path, encoding="utf-8"))
    M["chapters"] = {mapping.get(k, k): v for k, v in M["chapters"].items()}
    json.dump(M, io.open(cmap_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

n = 0
for name in sorted(os.listdir(CH)):
    files = []
    for rel in ("code/main.js", "code/main.test.js", "docs/zh.md"):
        p = os.path.join(CH, name, rel)
        if os.path.exists(p):
            files.append(p)
    out = os.path.join(CH, name, "outputs")
    if os.path.isdir(out):
        for f in sorted(os.listdir(out)):
            old_name = f
            new_name = f
            for o, nw in mapping.items():
                if o in f:
                    new_name = f.replace(o, nw)
            if new_name != old_name:
                os.rename(os.path.join(out, old_name), os.path.join(out, new_name))
            files.append(os.path.join(out, new_name))
    for f in files:
        s = io.open(f, encoding="utf-8").read()
        t = s
        for o, nw in mapping.items():
            t = t.replace(o, nw)
        if t != s:
            io.open(f, "w", encoding="utf-8").write(t)
            n += 1
print("改写文件", n, "· 重命名", len(mapping))
