# -*- coding: utf-8 -*-
"""sem910 课（18 工程实践 / 19 毕设）建课：章名与 slug 取自 data/new-subjects-chapters.json。

与 make_outline_course 的差别：slug 不用 `NN-<prefix><n>`，而用数据文件里的真实 slug
（`01-xuqiu-hegui` 这种），否则 scaffold_sem910 判不出来、chapters.json 与磁盘不一致。

用法: python scripts/make_sem910_course.py <sub> <dept_rel> <title> <chain> <pressure>
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
sub, dept_rel, title, chain, pressure = sys.argv[1:6]
S = os.path.join(ROOT, "standards", sub)
D = os.path.join(ROOT, dept_rel)
U = json.load(io.open(os.path.join(S, "units.json"), encoding="utf-8"))
C, P, R = U["counts"], U["probe"], U["ratio"]

data = json.load(io.open(os.path.join(ROOT, "data", "new-subjects-chapters.json"), encoding="utf-8"))
key = os.path.relpath(D, os.path.join(ROOT, "departments")).replace("\\", "/")
entry = next((x for x in data["subjects"] if x["key"] == key), None)
assert entry, f"data/new-subjects-chapters.json 里没有 {key}"
assert len(entry["chapters"]) == len(U["chapters"]), f"章数不符：{len(entry['chapters'])} vs {len(U['chapters'])}"

CM = {}
for (slug, t), c in zip(entry["chapters"], U["chapters"]):
    n = c["no"]
    CM[f"{n:02d}-{slug}"] = {"n": n, "title": t, "units": [u["sub"] for u in U["units"] if int(u["chapter"]) == n],
                             "srcChapters": [str(n)], "why": f"{t}：本课第 {n} 章", "derivedFrom": f"单元层第{n}章"}
    c["title"] = t
json.dump({"note": f"{title}：{len(CM)} 阶段（章名取自 data/new-subjects-chapters.json）。", "chapters": CM},
          io.open(os.path.join(S, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for u in U["units"]:
    u["chapterTitle"] = next(v["title"] for k, v in CM.items() if v["n"] == int(u["chapter"]))
json.dump(U, io.open(os.path.join(S, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"《{U['source']['file'].replace('qhzy-','').replace('.xlsx','')}·{v['title'][:16]}》", f"第{v['n']}阶段"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一阶段要交付什么", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": title, "deptPath": dept_rel, "xlsx": f"F:/textbooks/{U['source']['file']}",
           "chain": chain, "levelLabel": "阶段结构", "objectPressure": pressure,
           "reportRule": "记录写：对象与情境、依据的指标、与单元层表述的差异",
           "gapNote": "sem910 实践课：材料取自既有单元层，阶段结构按 data/new-subjects-chapters.json",
           "chapterQ": cq, "fallback": fb, "defaultCite": [f"《{title}》", "阶段名级"]},
          io.open(os.path.join(S, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

chdir = os.path.join(D, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, dept_rel, "--all"],
            [PY, "scripts/build_huli_docs.py", sub, dept_rel]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

rows, doc_total = [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    p = os.path.join(D, "chapters", slug, "docs", "zh.md")
    doc_total += len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧", "kind": "core",
                 "docs": f"chapters/{slug}/docs/zh.md", "code": f"chapters/{slug}/code/main.js"})
json.dump({"slug": os.path.basename(dept_rel), "title": title,
           "note": f"{len(CM)} 阶段（章名取自 data/new-subjects-chapters.json）。", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

r = subprocess.run([ "node", "scripts/scaffold_sem910.js"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
print("  scaffold_sem910 →", (r.stdout or r.stderr).strip().splitlines()[-1:])
print(f"{title}: {len(CM)} 章 · 正文 {doc_total:,} · 底本 {C['hanzi']:,} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
