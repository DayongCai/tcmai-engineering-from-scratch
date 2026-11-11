# -*- coding: utf-8 -*-
"""医学遗传学（09-jichu/09-yixue-yichuan-xue）：派生课，母本＝《医学生物学》第 9–16 章。

12 课程章 ← 8 教材章：
  1  ← p9                （概论，12 单元）
  2  ← p10 前 6 单元     3 ← p10 后 6 单元
  4  ← p11 前 6 单元     5 ← p11 后 6 单元
  6  ← p12 前 6 单元     7 ← p12 后 6 单元
  8  ← p13 前 6 单元     9 ← p13 后 6 单元
  10 ← p14              11 ← p15              12 ← p16
正文逐字取自母本，locator 一律「派生·第N章·m.k」，source 记「医学生物学:母本 locator」。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
PARENT, SUB = "yixue-shengwu-xue", "yixue-yichuan-xue"
DEPT = "departments/09-jichu/09-yixue-yichuan-xue"
TITLE = "医学遗传学"

PLAN = [
 (1, "yichuanxue-gailun", "医学遗传学概论", [(9, None)]),
 (2, "jiyin-de-jiegou-zuzhi", "基因的结构与组织", [(10, (1, 6))]),
 (3, "jiyin-tubian-yu-xiaoying", "基因突变与效应", [(10, (7, 12))]),
 (4, "xipu-yu-chuandi-fangshi", "系谱分析与传递方式", [(11, (1, 6))]),
 (5, "dan-jiyin-yichuanbing", "单基因遗传病", [(11, (7, 12))]),
 (6, "duo-jiyin-yuzhi-moxing", "多基因遗传与阈值模型", [(12, (1, 6))]),
 (7, "yiganxing-yu-zaifa-fengxian", "易感性与再发风险", [(12, (7, 12))]),
 (8, "heti-yu-ranse-ti-jibian", "核型与染色体畸变", [(13, (1, 6))]),
 (9, "changjian-ranse-ti-bing", "常见染色体病", [(13, (7, 12))]),
 (10, "qunti-yichuan-xue", "群体遗传学", [(14, None)]),
 (11, "linchuang-yichuan-xue", "临床遗传学", [(15, None)]),
 (12, "zhongyi-yichuan-xue", "中医遗传学", [(16, None)]),
]

PLANES = {"概论与基因结构": [1, 2, 3], "传递方式与多基因": [4, 5, 6, 7],
          "染色体": [8, 9], "群体·临床·中医": [10, 11, 12]}

VIEWS = {"遗传方式与系谱": ["系谱", "遗传", "显性", "隐性", "携带", "传递"],
         "分子与染色体机制": ["基因", "突变", "染色体", "核型", "畸变", "序列"],
         "群体与临床": ["群体", "发病率", "筛查", "咨询", "临床", "诊断"]}

P = json.load(io.open(os.path.join(S, PARENT, "units.json"), encoding="utf-8"))


def pick(ch, rng):
    us = [u for u in P["units"] if int(u["chapter"]) == ch]
    if rng is None:
        return us
    a, b = rng
    return us[a - 1:b]


units, CM = [], {}
for n, slug, title, src in PLAN:
    us = []
    for ch, rng in src:
        us += pick(ch, rng)
    assert us, f"第 {n} 章无单元"
    subs = []
    for k, u in enumerate(us, 1):
        nu = json.loads(json.dumps(u))
        nu["chapter"] = str(n)
        nu["chapterTitle"] = f"第{n}章 {title}"
        nu["sub"] = f"{n}.{k}"
        nu["secNo"] = f"{n}.{1 + (k - 1) // 3}"
        nu["sec"] = nu.get("sec", "")
        nu["locator"] = f"派生·第{n}章·{n}.{k}"
        nu["source"] = f"医学生物学:{u['locator']}"
        nu["measure"] = dict(nu.get("measure") or {})
        nu["measure"]["view"] = {k2: (u.get("body", "").count(w) for w in ws) for k2, ws in []}
        subs.append(nu)
    for nu in subs:
        nu["measure"]["view"] = {k2: sum(nu.get("body", "").count(w) for w in ws) for k2, ws in VIEWS.items()}
        nu["measure"]["views"] = dict(nu["measure"]["view"])
    units += subs
    CM[slug] = {"n": n, "title": title, "units": [u["sub"] for u in subs], "srcChapters": sorted({s for s, _ in src}),
                "why": f"{title}：本课第 {n} 章，正文逐字取自母本第 {'、'.join(str(s) for s, _ in src)} 章",
                "derivedFrom": "医学生物学"}

hanzi = sum(u["hanzi"] for u in units)
tot_view = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tot_part = {k: 0 for k in PLANES}
for u in units:
    for p, chs in PLANES.items():
        if int(u["chapter"]) in chs:
            tot_part[p] += u["hanzi"]
for u in units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}

U = {"source": {"file": f"派生：{P['source']['file']}", "sha256": P["source"]["sha256"],
                "script": "scripts/_derive_ycx.py", "parent": PARENT},
     "counts": {"chapters": len(CM), "units": len(units), "hanzi": hanzi, "valueLike": P["counts"].get("valueLike", 0)},
     "views": VIEWS, "levels": {k: [k] for k in PLANES},
     "probe": {"view": tot_view, "A_part": tot_part},
     "ratio": {"view": round(max(tot_view.values()) / max(1, min(tot_view.values())), 1),
               "A_part": round(max(tot_part.values()) / max(1, min(tot_part.values())), 1)},
     "chapters": [{"no": v["n"], "title": v["title"], "units": len(v["units"])} for v in CM.values()],
     "units": units}
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for fn, obj in (("chapter-map.json", {"note": "派生课：12 课程章 ←《医学生物学》第 9–16 章，正文逐字不改。", "chapters": CM}),
                ("axes.json", {"note": "派生课：三辨按词表现算；四位面按课程章群结构分区。", "views": VIEWS,
                               "levelsA": PLANES, "probe": U["probe"], "ratio": U["ratio"]})):
    json.dump(obj, io.open(os.path.join(S, SUB, fn), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《医学生物学·{v['title']}》〔派生〕", f"母本：医学生物学第 {'、'.join(str(s) for s in v['srcChapters'])} 章"] for slug, v in CM.items()}
cq = {slug: [f"{v['title']}：这一章的判据是什么，什么算「看懂了」", v["why"]] for slug, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": "派生：无独立教材（母本 F:/textbooks/qhzy-医学生物学.xlsx）",
           "chain": "概论 → 基因结构与突变 → 系谱与单基因 → 多基因 → 染色体 → 群体与临床",
           "levelLabel": "章群结构", "objectPressure": "医学遗传学的判据是「系谱—变异—风险」三件套：系谱读得对、变异找得到、风险说得准，才算读懂",
           "reportRule": "记录写：家系信息来源、所依据的传递方式、结论的适用边界",
           "gapNote": "派生课，无独立教材；正文逐字取自母本《医学生物学》，不作诊断与遗传咨询结论",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《医学生物学》〔派生〕", "母本章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(units)} 单元 / {hanzi:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
