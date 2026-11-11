# -*- coding: utf-8 -*-
"""医学遗传学：写 chapters.json → 目录加 NN- 前缀 → 同步 path/SLUG 引用。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yixue-yichuan-xue", "departments/09-jichu/09-yixue-yichuan-xue"
D = os.path.join(ROOT, DEPT)
CM = json.load(io.open(os.path.join(ROOT, "standards", SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]

rows = [{"n": v["n"], "slug": f"{v['n']:02d}-{slug}", "title": v["title"], "status": "🚧",
         "docs": "docs/zh.md", "code": "code/main.js"} for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"])]
json.dump({"slug": "09-yixue-yichuan-xue", "title": "医学遗传学",
           "note": "派生课：12 课程章 ←《医学生物学》第 9–16 章（正文逐字不改）。", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

CHD = os.path.join(D, "chapters")
mapping = {}
for d in sorted(os.listdir(CHD)):
    if re.match(r"^\d{2}-", d):
        continue
    n = int(CM[d]["n"])
    mapping[d] = f"{n:02d}-{d}"
for old, new in mapping.items():
    os.rename(os.path.join(CHD, old), os.path.join(CHD, "_tmp_" + new))
for old, new in mapping.items():
    os.rename(os.path.join(CHD, "_tmp_" + new), os.path.join(CHD, new))

CM2 = {mapping.get(k, k): v for k, v in CM.items()}
json.dump({"note": "派生课：12 课程章 ←《医学生物学》第 9–16 章，正文逐字不改。", "chapters": CM2},
          io.open(os.path.join(ROOT, "standards", SUB, "chapter-map.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

n = 0
for base, _, fs in os.walk(D):
    for f in fs:
        if not f.endswith((".md", ".js", ".json")):
            continue
        p = os.path.join(base, f)
        s = io.open(p, encoding="utf-8").read()
        t = s
        for old, new in mapping.items():
            t = t.replace(f"chapters/{old}/", f"chapters/{new}/")
            t = re.sub(r"(SLUG\s*=\s*['\"])" + re.escape(old) + r"(['\"])", r"\g<1>" + new + r"\g<2>", t)
            t = t.replace(f'"slug": "{old}"', f'"slug": "{new}"')
        if t != s:
            io.open(p, "w", encoding="utf-8").write(t)
            n += 1
print(f"chapters.json 12 行 · 改名 {len(mapping)} 章 · 改写 {n} 文件")
