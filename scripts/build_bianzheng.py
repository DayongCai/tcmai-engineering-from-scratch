# -*- coding: utf-8 -*-
"""06 中医智能辨证：按既有 chapters.json 的 10 章结构建课，**保留手写的第 7 章原文**。

做法：先备份 chapters/07-yizhixing-pinggu → 建其余 9 章 → 还原第 7 章的 docs/outputs/quiz/code。
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
SUB = "zhongyi-zhineng-bianzheng"
DEPT = "departments/07-zhineng/06-zhongyi-zhineng-bianzheng"
S = os.path.join(ROOT, "standards", SUB)
D = os.path.join(ROOT, DEPT)
KEEP = "07-yizhixing-pinggu"

CJ = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))
TITLES = [c["title"] for c in CJ["chapters"]]
SLUGS = [c["slug"] for c in CJ["chapters"]]

SRC = {"jiqi": "jiqi-xuexi", "xinx": "zhongyi-xinxi-xue", "tu": "zhongyi-zhishishu", "aq": "yixue-shuju-anquan-yinsi"}
LOAD = {k: json.load(io.open(os.path.join(ROOT, "standards", v, "units.json"), encoding="utf-8")) for k, v in SRC.items()}
PICKS = [("jiqi", 3), ("xinx", 2), ("jiqi", 4), ("jiqi", 7), ("jiqi", 5), ("jiqi", 8),
         ("jiqi", 2), ("aq", 8), ("tu", 3), ("xinx", 4)]
VIEWS = {"证候与术语": ["证候", "辨证", "症状", "四诊", "术语", "标准"],
         "模型与分类": ["分类", "模型", "概率", "树", "贝叶斯", "训练"],
         "评估与落地": ["评估", "误诊", "漏诊", "一致", "解释", "试用"]}
LEVELS = {"形式与采集": [1, 2], "推理与表示": [3, 4, 5], "输出与评估": [6, 7, 8], "解释与试用": [9, 10]}

units, idx, meta = [], 0, []
for ci, (src, no) in enumerate(PICKS, 1):
    h = 0
    for u in LOAD[src]["units"]:
        if int(u["chapter"]) != int(no):
            continue
        body = u.get("body") or u.get("prose") or ""
        hh = u.get("hanzi") or 0
        if hh < 20:
            continue
        idx += 1
        units.append({
            "chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"], "secNo": f"{ci}.{u.get('sub', idx)}",
            "title": u["title"], "chapterTitle": TITLES[ci - 1],
            "locator": u.get("locator", ""), "source": u.get("source", ""),
            "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
            "segments": u.get("segments") or [{"seg": "1", "text": body}],
            "brief": "只写教材所述的判别逻辑与评估方式，不写诊断结论与剂量",
            "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                        "levels": {k: (hh if ci in v else 0) for k, v in LEVELS.items()},
                        "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:例|%|次|条)", body))},
        })
        h += hh
    meta.append((ci, TITLES[ci - 1], h))
    print(f"  ch{ci} {TITLES[ci-1][:18]} · {h:,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
U = {"subject": SUB, "title": "中医智能辨证系统", "views": VIEWS, "levels": LEVELS,
     "source": {"kind": "synthesized", "file": "F:/textbooks/qhzy-机器学习.xlsx",
                "note": "合成课：证候侧取信息学/知识图谱，分类与评估侧取机器学习；第 7 章为手写原文，未覆盖"},
     "probe": {"view": tv, "A_part": tl},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
     "counts": {"chapters": 10, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                "valueLike": sum(u["measure"]["valueLike"] for u in units)},
     "units": units, "chapters": [{"no": c, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == c)} for c, t, _ in meta]}
os.makedirs(S, exist_ok=True)
json.dump(U, io.open(os.path.join(S, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "第 7 章为手写原文，其余章按章结构合成。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": U["ratio"]["view"], "A_part": U["ratio"]["A_part"]}},
          io.open(os.path.join(S, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

CM = {}
for ci, (t, slug) in enumerate(zip(TITLES, SLUGS), 1):
    CM[slug] = {"n": ci, "title": t, "units": [u["sub"] for u in units if int(u["chapter"]) == ci],
                "srcChapters": [str(ci)], "why": f"{t}：本课第 {ci} 章", "derivedFrom": f"单元层第{ci}章"}
json.dump({"note": "10 章结构取自既有 chapters.json；第 7 章手写原文保留。", "chapters": CM},
          io.open(os.path.join(S, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

bak = os.path.join(ROOT, "_tmp_06_ch7")
if os.path.isdir(bak):
    shutil.rmtree(bak)
shutil.copytree(os.path.join(D, "chapters", KEEP), bak)
print("已备份手写第 7 章")

fb = {s: [f"《{U['source']['file'].replace('qhzy-','').replace('.xlsx','')}·{v['title'][:16]}》", f"单元层第{v['n']}章"] for s, v in CM.items()}
json.dump({"courseTitle": "中医智能辨证系统", "deptPath": DEPT, "xlsx": "F:/textbooks/qhzy-机器学习.xlsx",
           "chain": "形式化 → 采集 → 推理 → 表示 → 评估 → 解释", "levelLabel": "章群结构",
           "objectPressure": "辨证系统的判据是「证候可标—误判可分—结论可退」",
           "reportRule": "记录写：对象与情境、依据的指标、与教材表述的差异",
           "gapNote": "合成课；第 7 章为手写正文",
           "chapterQ": {s: [f"{v['title']}：这一章要回答什么", v["why"]] for s, v in CM.items()},
           "fallback": fb, "defaultCite": ["《中医智能辨证系统》", "章名级"]},
          io.open(os.path.join(S, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

# 还原第 7 章
dst = os.path.join(D, "chapters", KEEP)
shutil.rmtree(dst)
shutil.copytree(bak, dst)
print("已还原手写第 7 章")

rows = [{"n": c["n"], "slug": c["slug"], "title": c["title"], "status": "🚧", "kind": "core",
         "docs": f"chapters/{c['slug']}/docs/zh.md", "code": f"chapters/{c['slug']}/code/main.js"} for c in CJ["chapters"]]
json.dump({"slug": os.path.basename(D), "title": "中医智能辨证系统", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("06 建成：10 章（第 7 章保留手写）")
