# -*- coding: utf-8 -*-
"""按既有 chapters.json 建课并保留已有手写章（五官系 06/07 用）。

用法: python scripts/build_course_existing.py <sub> <dept_rel> <title> <groups> [--chain ..] [--pressure ..]
前置：standards/<sub>/units.json 已存在，且其章号与 groups 覆盖的教材章一致。
"""
import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sub")
    ap.add_argument("dept_rel")
    ap.add_argument("title")
    ap.add_argument("groups")
    ap.add_argument("--chain", default="—")
    ap.add_argument("--pressure", default="—")
    ap.add_argument("--keep", default="", help="要保留的手写章 slug，逗号分隔")
    a = ap.parse_args()

    D = os.path.join(ROOT, a.dept_rel)
    S = os.path.join(ROOT, "standards", a.sub)
    CJ = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))
    titles = [c["title"] for c in CJ["chapters"]]
    slugs = [c["slug"] for c in CJ["chapters"]]
    U = json.load(io.open(os.path.join(S, "units.json"), encoding="utf-8"))

    groups = []
    for g in a.groups.split(","):
        g = g.strip()
        groups.append(list(range(int(g.split("-")[0]), int(g.split("-")[1]) + 1)) if "-" in g else [int(g)])
    assert len(groups) == len(titles), f"分组 {len(groups)} ≠ 章节 {len(titles)}"

    m = {}
    for ci, g in enumerate(groups, 1):
        for c in g:
            m[c] = ci
    units, cnt = [], {}
    for u in U["units"]:
        key = int(u["chapter"])
        if key not in m:
            continue
        ci = m[key]
        cnt[ci] = cnt.get(ci, 0) + 1
        nu = dict(u)
        nu["chapter"] = str(ci)
        nu["sub"] = f"{ci}.{cnt[ci]}"
        nu["chapterTitle"] = titles[ci - 1]
        units.append(nu)

    V, L = U["views"], U["levels"]
    if L and isinstance(list(L.values())[0], list) and L and isinstance(list(L.values())[0][0], str):
        for u in units:
            u["measure"]["levels"] = {k: sum(u["body"].count(w) for w in ws) for k, ws in L.items()}
        tl = {k: sum(u["measure"]["levels"][k] for u in units) for k in L}
    else:
        tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in L.items()}
    tv = {k: sum(u["measure"]["views"][k] for u in units) for k in V}
    U["units"] = units
    U["chapters"] = [{"no": i, "title": titles[i - 1], "units": sum(1 for u in units if int(u["chapter"]) == i)}
                     for i in range(1, len(titles) + 1)]
    U["counts"] = {"chapters": len(titles), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                   "valueLike": sum(u["measure"].get("valueLike", 0) for u in units)}
    U["probe"] = {"view": tv, "A_part": tl}
    U["ratio"] = {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                  "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)}
    json.dump(U, io.open(os.path.join(S, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    CM = {}
    for ci, (t, slug) in enumerate(zip(titles, slugs), 1):
        CM[slug] = {"n": ci, "title": t, "units": [u["sub"] for u in units if int(u["chapter"]) == ci],
                    "srcChapters": [str(ci)], "why": f"{t}：本课第 {ci} 章", "derivedFrom": f"教材章群第{ci}段"}
    json.dump({"note": "章结构取自既有 chapters.json；已有手写章备份后还原。", "chapters": CM},
              io.open(os.path.join(S, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"courseTitle": a.title, "deptPath": a.dept_rel, "xlsx": f"F:/textbooks/{U['source'].get('file','')}",
               "chain": a.chain, "levelLabel": "章群结构", "objectPressure": a.pressure,
               "reportRule": "记录写：对象与情境、依据的指标、与教材表述的差异",
               "gapNote": "教材 12 章压成 10 章；已有手写章保留",
               "chapterQ": {s: [f"{v['title']}：这一章要回答什么", v["why"]] for s, v in CM.items()},
               "fallback": {s: ["《" + a.title + "·" + v["title"][:16] + "》", f"第{v['n']}章"] for s, v in CM.items()},
               "defaultCite": [f"《{a.title}》", "章名级"]},
              io.open(os.path.join(S, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    chdir = os.path.join(D, "chapters")
    backups = {}
    tmp = os.path.join(ROOT, "_tmp_keep")
    if os.path.isdir(tmp):
        shutil.rmtree(tmp)
    os.makedirs(tmp)
    keep = {x.strip() for x in a.keep.split(",") if x.strip()}
    if os.path.isdir(chdir):
        for name in os.listdir(chdir):
            if name in keep and os.path.exists(os.path.join(chdir, name, "docs", "zh.md")):
                shutil.copytree(os.path.join(chdir, name), os.path.join(tmp, name))
                backups[name] = True
    print("备份手写章:", list(backups))

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", a.sub, a.dept_rel, "--all"],
                [PY, "scripts/build_huli_docs.py", a.sub, a.dept_rel]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

    for name in backups:
        dst = os.path.join(chdir, name)
        shutil.rmtree(dst)
        shutil.copytree(os.path.join(tmp, name), dst)
    print("还原手写章:", list(backups))

    rows = [{"n": c["n"], "slug": c["slug"], "title": c["title"], "status": "🚧", "kind": "core",
             "docs": f"chapters/{c['slug']}/docs/zh.md", "code": f"chapters/{c['slug']}/code/main.js"} for c in CJ["chapters"]]
    json.dump({"slug": os.path.basename(D), "title": a.title, "chapters": rows},
              io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a.title}: {len(titles)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")


if __name__ == "__main__":
    main()
