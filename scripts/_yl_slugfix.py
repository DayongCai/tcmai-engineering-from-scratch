# -*- coding: utf-8 -*-
"""把 12-yaoli-xue 的章节 slug 对齐到 platform 侧（英文 slug，49 章已渲染）。

platform/courses/09-jichu/12-yaoli-xue/<slug>/video/lesson.mp4 是按英文 slug 落的，
departments 侧若用拼音 slug，course.yaml 的 state_of() 只会返回 planned，
`npm run check` 会因「yaml 与磁盘实况不一致」判红。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue")
PLAT = os.path.join(ROOT, "platform", "courses", "09-jichu", "12-yaoli-xue")
S = os.path.join(ROOT, "standards", "yaoli-xue")

plat = sorted(d for d in os.listdir(PLAT) if os.path.isdir(os.path.join(PLAT, d)))
mine = sorted(d for d in os.listdir(os.path.join(DEPT, "chapters")))
assert len(plat) == len(mine) == 49, (len(plat), len(mine))

mapping = dict(zip(mine, plat))  # 旧 -> 新
for old, new in mapping.items():
    if old == new:
        continue
    src = os.path.join(DEPT, "chapters", old)
    dst = os.path.join(DEPT, "chapters", "_tmp_" + new)
    os.rename(src, dst)
for old, new in mapping.items():
    if old == new:
        continue
    os.rename(os.path.join(DEPT, "chapters", "_tmp_" + new), os.path.join(DEPT, "chapters", new))

# 文件内路径引用：chapters/<old>/ -> chapters/<new>/
files = 0
for base, _, fs in os.walk(DEPT):
    for f in fs:
        if not f.endswith((".md", ".js", ".json")):
            continue
        p = os.path.join(base, f)
        s = io.open(p, encoding="utf-8").read()
        t = s
        for old, new in mapping.items():
            t = t.replace(f"chapters/{old}/", f"chapters/{new}/").replace(f"chapters\\\\{old}\\\\", f"chapters\\\\{new}\\\\")
        if t != s:
            io.open(p, "w", encoding="utf-8").write(t)
            files += 1

# chapters.json / chapter-map.json 的 slug 键
cm_path = os.path.join(S, "chapter-map.json")
CM = json.load(io.open(cm_path, encoding="utf-8"))
new_cm = {}
for slug, v in CM["chapters"].items():
    new_cm[mapping[slug]] = v
CM["chapters"] = new_cm
json.dump(CM, io.open(cm_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

ch_path = os.path.join(DEPT, "chapters.json")
CH = json.load(io.open(ch_path, encoding="utf-8"))
for c in CH["chapters"]:
    c["slug"] = mapping[c["slug"]]
json.dump(CH, io.open(ch_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"slug 对齐 {len(mapping)} 章 · 改写文件 {files} 个")
print("示例:", mine[0], "->", mapping[mine[0]])
