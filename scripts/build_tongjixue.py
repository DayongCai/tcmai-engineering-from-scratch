# -*- coding: utf-8 -*-
"""01 医学统计学：按既有 chapters.json 的 10 章结构建课，**保留手写的第 9 章（多重检验）**。

底本《卫生统计学》18 章 → 10 课程章；第 9 章 docs/outputs/quiz/code 建前备份、建后还原。
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
SUB = "01-yixue-tongjixue"
DEPT = "departments/06-guanli/01-yixue-tongjixue"
D = os.path.join(ROOT, DEPT)
S = os.path.join(ROOT, "standards", SUB)

CJ = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))
TITLES = [c["title"] for c in CJ["chapters"]]
SLUGS = [c["slug"] for c in CJ["chapters"]]
KEEP = "09-duochong-jiaoyan"
print("章结构：", [f"{c['n']}.{c['title']}" for c in CJ["chapters"]])

GROUPS = "1-2,3-4,5-6,7-8,9-10,11-12,13-15,16,17-18,18"

# 教材 18 章 → 课程 10 章（按统计教学顺序）
GROUPS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11], [12], [13, 14], [15, 16, 17], [18]]
VIEWS = {"描述与分布": ["描述", "分布", "图表", "集中趋势", "离散", "变量"],
         "推断与检验": ["检验", "假设", "推断", "方差", "卡方", "参数估计"],
         "关联与决策": ["回归", "相关", "生存", "诊断", "决策", "评价"]}
LEVELS = {"描述与推断": [1, 2, 3], "检验方法": [4, 5, 6], "关联与模型": [7, 8], "设计与应用": [9, 10]}

import openpyxl

HANZI = re.compile(r"[\u4e00-\u9fff]")
RE_SEC = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
RE_SUB = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
wb = openpyxl.load_workbook("F:/textbooks/qhzy-卫生统计学.xlsx", read_only=True, data_only=True)
sheets = {int(n[:2]): n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)}
raw = []
for no in sorted(sheets):
    name = sheets[no]
    btitle = name[3:].strip()
    cur = None
    for row in wb[name].iter_rows(values_only=True):
        if not row or len(row) < 5:
            continue
        c4, txt = str(row[3] or "").strip(), str(row[4] or "").strip()
        if not txt:
            continue
        m = RE_SUB.match(txt)
        if m:
            if cur:
                raw.append(cur)
            cur = [no, btitle, m.group(2), m.group(3), m.group(4), []]
            continue
        if RE_SEC.match(txt):
            continue
        if cur and c4 and not txt.startswith("【学习目标】"):
            cur[5].append(txt)
    if cur:
        raw.append(cur)

ch2course = {}
for ci, g in enumerate(GROUPS, 1):
    for c in g:
        ch2course[c] = ci

units, cnt = [], {}
for (no, btitle, sec, subk, title, paras) in raw:
    body = "\n".join(paras)
    h = len(HANZI.findall(body))
    if h < 100:
        continue
    ci = ch2course[no]
    cnt[ci] = cnt.get(ci, 0) + 1
    units.append({"chapter": str(ci), "sub": f"{ci}.{cnt[ci]}", "sec": title, "secNo": f"{ci}.{sec}",
                  "title": title, "chapterTitle": TITLES[ci - 1],
                  "locator": f"教材·第{no}章·{sec}.{subk}", "source": f"卫生统计学:第{no}章·{sec}.{subk}",
                  "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
                  "segments": [{"seg": str(i + 1), "text": t} for i, t in enumerate([x for x in body.split("\n") if x.strip()])],
                  "brief": "只写教材所述的统计量与判读规则，不写具体 P 值与结论",
                  "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                              "levels": {k: (h if ci in v else 0) for k, v in LEVELS.items()},
                              "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:例|%|次|岁|天)", body))}})

for ci in range(1, 11):
    g = [u for u in units if int(u["chapter"]) == ci]
    print(f"  ch{ci} {TITLES[ci-1][:18]} · {len(g)} 单元 · {sum(u['hanzi'] for u in g):,}")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
U = {"subject": SUB, "title": "医学统计学", "views": VIEWS, "levels": LEVELS,
     "source": {"kind": "textbook", "file": "qhzy-卫生统计学.xlsx", "sheetCount": 18, "groups": GROUPS},
     "probe": {"view": tv, "A_part": tl},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
     "counts": {"chapters": 10, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                "valueLike": sum(u["measure"]["valueLike"] for u in units)},
     "units": units,
     "chapters": [{"no": i, "title": TITLES[i - 1], "units": sum(1 for u in units if int(u["chapter"]) == i)} for i in range(1, 11)]}
os.makedirs(S, exist_ok=True)
json.dump(U, io.open(os.path.join(S, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "卫生统计学 18 章 → 10 课程章（第 9 章为手写正文）。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl}, "ratio": {"view": U["ratio"]["view"], "A_part": U["ratio"]["A_part"]}},
          io.open(os.path.join(S, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

CM = {}
for ci, (t, slug) in enumerate(zip(TITLES, SLUGS), 1):
    CM[slug] = {"n": ci, "title": t, "units": [u["sub"] for u in units if int(u["chapter"]) == ci],
                "srcChapters": [str(ci)], "why": f"{t}：本课第 {ci} 章", "derivedFrom": f"单元层第{ci}章"}
json.dump({"note": "10 章结构取自既有 chapters.json；第 9 章手写原文保留。", "chapters": CM},
          io.open(os.path.join(S, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

bak = os.path.join(ROOT, "_tmp_01_ch9")
if os.path.isdir(bak):
    shutil.rmtree(bak)
shutil.copytree(os.path.join(D, "chapters", KEEP), bak)
print("已备份手写第 9 章")

json.dump({"courseTitle": "医学统计学", "deptPath": DEPT, "xlsx": "F:/textbooks/qhzy-卫生统计学.xlsx",
           "chain": "描述 → 抽样 → 检验 → 关联 → 设计", "levelLabel": "章群结构",
           "objectPressure": "统计学的判据是「变量—分布—检验—解释」四步，跳步就没有结论",
           "reportRule": "记录写：数据来源、变量类型、用的检验、结论的边界",
           "gapNote": "教材 18 章压成 10 章；第 9 章为手写正文",
           "chapterQ": {s: [f"{v['title']}：这一章要回答什么", v["why"]] for s, v in CM.items()},
           "fallback": {s: ["《卫生统计学·" + v["title"][:16] + "》", f"教材第{v['n']}章"] for s, v in CM.items()},
           "defaultCite": ["《医学统计学》", "章名级"]},
          io.open(os.path.join(S, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

dst = os.path.join(D, "chapters", KEEP)
shutil.rmtree(dst)
shutil.copytree(bak, dst)
print("已还原手写第 9 章")

rows = [{"n": c["n"], "slug": c["slug"], "title": c["title"], "status": "🚧", "kind": "core",
         "docs": f"chapters/{c['slug']}/docs/zh.md", "code": f"chapters/{c['slug']}/code/main.js"} for c in CJ["chapters"]]
json.dump({"slug": os.path.basename(D), "title": "医学统计学", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("01 建成：10 章（第 9 章保留手写）")
