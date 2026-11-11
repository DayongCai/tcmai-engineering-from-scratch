# -*- coding: utf-8 -*-
"""把 outputs/prompt-*.md 与 outputs/skill-*.md 里的大写章号改成 slug 小写，并同步 frontmatter name。

用法: python scripts/lower_output_names.py departments/07-zhineng/15-zhongyi-ai-lunli-zhili
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, sys.argv[1], "chapters")
n = 0
for name in sorted(os.listdir(D)):
    slug = name.split("-", 1)[1]
    out = os.path.join(D, name, "outputs")
    if not os.path.isdir(out):
        continue
    for f in sorted(os.listdir(out)):
        if not f.startswith(("prompt-", "skill-")):
            continue
        newf = re.sub(r"(prompt|skill)-.*$", lambda m: f"{m.group(1)}-{slug}.md", f)
        p = os.path.join(out, f)
        if newf != f:
            os.rename(p, os.path.join(out, newf))
            n += 1
        q = os.path.join(out, newf)
        s = io.open(q, encoding="utf-8").read()
        s2 = re.sub(r"(?m)^name:\s*.*$", f"name: {slug}", s) if f.startswith("skill-") else s
        s2 = re.sub(r"prompt-[0-9A-Za-z]+\.md", f"prompt-{slug}.md", s2)
        s2 = re.sub(r"skill-[0-9A-Za-z]+\.md", f"skill-{slug}.md", s2)
        if s2 != s:
            io.open(q, "w", encoding="utf-8").write(s2)
print("改名", n)
