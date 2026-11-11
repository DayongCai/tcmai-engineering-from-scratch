# -*- coding: utf-8 -*-
"""16-jichu-keyan-shixun（科研实训与实验设计·sem910，6 章）：派生自三门母本的实验方法章。

章节名与顺序以 data/new-subjects-chapters.json 为准（由 scaffold_sem910.js 生成，不手改）。
正文逐字取自母本，locator「派生·第N章·m.k」。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB = "jichu-keyan-shixun"
DEPT = "departments/09-jichu/16-jichu-keyan-shixun"
TITLE = "科研实训与实验设计"

PARENTS = {
 "liuxingbing-xue": ("流行病学", json.load(io.open(os.path.join(S, "liuxingbing-xue", "units.json"), encoding="utf-8"))),
 "shenghua-xue": ("生物化学", json.load(io.open(os.path.join(S, "shenghua-xue", "units.json"), encoding="utf-8"))),
 "zuzhi-peitai-xue": ("组织学与胚胎学", json.load(io.open(os.path.join(S, "zuzhi-peitai-xue", "units.json"), encoding="utf-8"))),
}

CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]
SLUG = {int(c["n"]): c["slug"] for c in CH}
TITLES = {int(c["n"]): c["title"] for c in CH}

SRC = {
 1: [("shenghua-xue", 21, (1, 6)), ("liuxingbing-xue", 13, (1, 6))],
 2: [("liuxingbing-xue", 10, None)],
 3: [("zuzhi-peitai-xue", 1, (1, 6)), ("shenghua-xue", 21, (7, 12))],
 4: [("liuxingbing-xue", 11, None)],
 5: [("liuxingbing-xue", 12, None)],
 6: [("liuxingbing-xue", 13, (7, 12)), ("liuxingbing-xue", 16, (1, 6))],
}

PLANES = {"安全与规范": [1], "设计与实施": [2, 3], "数据与结果": [4, 5], "报告与考核": [6]}
VIEWS = {"准备与安全": ["准备", "安全", "规范", "试剂", "标本", "防护"],
         "设计与对照": ["设计", "对照", "分组", "样本", "随机", "偏倚"],
         "记录与报告": ["记录", "报告", "数据", "结果", "表格", "复核"]}


def pick(sub, ch, rng):
    us = [u for u in PARENTS[sub][1]["units"] if int(u["chapter"]) == ch]
    return us if rng is None else us[rng[0] - 1:rng[1]]


units, CM = [], {}
for n in sorted(SLUG):
    us = []
    for sub, ch, rng in SRC[n]:
        us += pick(sub, ch, rng)
    assert us, f"第 {n} 章无单元"
    subs, srcs = [], []
    for k, u in enumerate(us, 1):
        nu = json.loads(json.dumps(u))
        pname = next(PARENTS[s][0] for s, c, _ in SRC[n] if int(u["chapter"]) == c)
        nu["chapter"] = str(n)
        nu["chapterTitle"] = f"第{n}章 {TITLES[n]}"
        nu["sub"] = f"{n}.{k}"
        nu["secNo"] = f"{n}.{1 + (k - 1) // 3}"
        nu["locator"] = f"派生·第{n}章·{n}.{k}"
        nu["source"] = f"{pname}:{u['locator']}"
        m = dict(nu.get("measure") or {})
        m["view"] = {k2: sum(nu.get("body", "").count(w) for w in ws) for k2, ws in VIEWS.items()}
        m["views"] = dict(m["view"])
        nu["measure"] = m
        subs.append(nu)
        if f"{pname}第{u['chapter']}章" not in srcs:
            srcs.append(f"{pname}第{u['chapter']}章")
    units += subs
    CM[SLUG[n]] = {"n": n, "title": TITLES[n], "units": [u["sub"] for u in subs], "srcChapters": srcs,
                   "why": f"{TITLES[n]}：实训第 {n} 站，材料取自{'、'.join(srcs)}",
                   "derivedFrom": "、".join(PARENTS[s][0] for s, c, _ in SRC[n])}

for u in units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}
tot_view = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tot_part = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for k, chs in PLANES.items()}

U = {"source": {"file": "派生：无独立教材（母本 流行病学 / 生物化学 / 组织学与胚胎学）",
                "sha256": PARENTS["liuxingbing-xue"][1]["source"]["sha256"], "script": "scripts/_derive_kyx.py"},
     "counts": {"chapters": len(CM), "units": len(units), "hanzi": sum(u["hanzi"] for u in units), "valueLike": 0},
     "views": VIEWS, "levels": {k: [k] for k in PLANES},
     "probe": {"view": tot_view, "A_part": tot_part},
     "ratio": {"view": round(max(tot_view.values()) / max(1, min(tot_view.values())), 1),
               "A_part": round(max(tot_part.values()) / max(1, min(tot_part.values())), 1)},
     "chapters": [{"no": v["n"], "title": v["title"], "units": len(v["units"])} for v in CM.values()],
     "units": units}

os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "sem910 派生课：6 站 ←《流行病学》《生物化学》《组织学与胚胎学》实验方法章，正文逐字不改。",
           "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "派生课：三辨按词表现算；四位面按六站章群分区。", "views": VIEWS, "levelsA": PLANES,
           "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"〔派生〕{v['title']}", f"材料：{'、'.join(v['srcChapters'])}"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一站要交什么、怎么算过关", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": "派生：无独立教材（实训课）",
           "chain": "安全与规范 → 设计与实施 → 数据与结果 → 报告与考核",
           "levelLabel": "实训站", "objectPressure": "实训课的判据是「做得到—记得下—复得了」三件套：动手规范、记录完整、结果可重复",
           "reportRule": "实训记录写：日期与站点、操作与观察、异常与处置、结论与依据",
           "gapNote": "派生课，无独立教材；不写试剂浓度、仪器型号与统计阈值，只写顺序与判据",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["〔派生〕母本章名", "母本章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
