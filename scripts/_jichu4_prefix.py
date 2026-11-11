# -*- coding: utf-8 -*-
"""给四门新课的章节目录加数字前缀（audit L1 要求 NN-slug），并同步所有路径引用。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES = [("renti-jiepou-xue", "departments/09-jichu/01-renti-jiepou-xue"),
           ("zuzhi-peitai-xue", "departments/09-jichu/02-zuzhi-peitai-xue"),
           ("shenghua-xue", "departments/09-jichu/07-shenghua-xue"),
           ("jubu-jiepou-xue", "departments/09-jichu/08-jubu-jiepou-xue")]

for sub, dept_rel in COURSES:
    DEPT = os.path.join(ROOT, dept_rel)
    CHD = os.path.join(DEPT, "chapters")
    CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))
    mapping = {}
    for c in CH["chapters"]:
        old = c["slug"]
        if re.match(r"^\d{2}-", old):
            continue
        new = f"{int(c['n']):02d}-{old}"
        mapping[old] = new
    if not mapping:
        print(sub, "已带前缀")
        continue
    for old, new in mapping.items():
        os.rename(os.path.join(CHD, old), os.path.join(CHD, "_tmp_" + new))
    for old, new in mapping.items():
        os.rename(os.path.join(CHD, "_tmp_" + new), os.path.join(CHD, new))
    for c in CH["chapters"]:
        c["slug"] = mapping.get(c["slug"], c["slug"])
    json.dump(CH, io.open(os.path.join(DEPT, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    cm_p = os.path.join(ROOT, "standards", sub, "chapter-map.json")
    CM = json.load(io.open(cm_p, encoding="utf-8"))
    CM["chapters"] = {mapping.get(k, k): v for k, v in CM["chapters"].items()}
    json.dump(CM, io.open(cm_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    files = 0
    for base, _, fs in os.walk(DEPT):
        for f in fs:
            if not f.endswith((".md", ".js", ".json")):
                continue
            p = os.path.join(base, f)
            s = io.open(p, encoding="utf-8").read()
            t = s
            for old, new in mapping.items():
                t = t.replace(f"chapters/{old}/", f"chapters/{new}/")
                t = t.replace(f'"slug": "{old}"', f'"slug": "{new}"')
            if t != s:
                io.open(p, "w", encoding="utf-8").write(t)
                files += 1
    print(f"{sub}: 改名 {len(mapping)} 章 · 改写 {files} 文件")
