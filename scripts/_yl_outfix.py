# -*- coding: utf-8 -*-
"""outputs/ 下 prompt-/skill- 文件名与 frontmatter 跟随章 slug。"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHD = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue", "chapters")

n_p = n_s = n_name = 0
for slug in sorted(os.listdir(CHD)):
    d = os.path.join(CHD, slug)
    if not os.path.isdir(d):
        continue
    for base, _, fs in os.walk(d):
        for f in fs:
            p = os.path.join(base, f)
            if f.startswith("prompt-") and f.endswith(".md") and f != f"prompt-{slug}.md":
                os.replace(p, os.path.join(base, f"prompt-{slug}.md"))
                n_p += 1
            elif f.startswith("skill-") and f.endswith(".md"):
                tgt = os.path.join(base, f"skill-{slug}.md")
                if p != tgt:
                    os.replace(p, tgt)
                    n_s += 1
                s = io.open(tgt, encoding="utf-8").read()
                t = re.sub(r"(?m)^name:\s*\S+\s*$", f"name: {slug}", s, count=1)
                if t != s:
                    io.open(tgt, "w", encoding="utf-8").write(t)
                    n_name += 1
print(f"prompt 改名 {n_p} · skill 改名 {n_s} · frontmatter {n_name}")
