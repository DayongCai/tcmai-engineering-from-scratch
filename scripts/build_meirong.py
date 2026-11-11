# -*- coding: utf-8 -*-
"""15 中医美容皮肤：按《中医外科学》第 8 章（皮肤疾病）的「节」分组建成 8 章。

节 → 章：8.1 蛇串疮｜8.2 湿疮｜8.3 瘾疹｜8.4 白疕｜8.5 油风｜8.6 粉刺｜8.7 酒齄鼻｜8.8+8.9 药毒与疥疮。
与《中医外科学》（中医系 11 课）同源，汉字不相加。激光、注射、光电参数、项目报价与剂量一律不写。
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
S = os.path.join(ROOT, "standards")
SUB = "zhongyi-meirong-pifu"

GROUPS = [["1"], ["2"], ["3"], ["4"], ["5"], ["6"], ["7"], ["8", "9"]]
TITLES = ["蛇串疮（带状疱疹）", "湿疮（湿疹）", "瘾疹（荨麻疹）", "白疕（银屑病）", "油风（脱发）",
          "粉刺（痤疮）", "酒齄鼻（玫瑰痤疮）", "药毒与疥疮：鉴别与边界"]
V = {"皮损与表现": ["皮损", "疹", "疱", "斑"],
     "病性（热·湿·风）": ["热", "湿", "风"],
     "血分（血·虚·瘀）": ["血", "虚", "瘀"]}
L = {"疱疹与湿疹": [1, 2], "风疹与白疕": [3, 4], "脱发与粉刺": [5, 6], "鼻部与药毒": [7, 8]}

U0 = json.load(io.open(os.path.join(S, "waike", "units.json"), encoding="utf-8"))
units, idx = [], 0
for ci, secs in enumerate(GROUPS, 1):
    for u in U0["units"]:
        if int(u["chapter"]) != 8:
            continue
        if u["sub"].split(".")[1] not in secs:
            continue
        body = u.get("body") or ""
        h = u.get("hanzi") or 0
        if h < 100:
            continue
        idx += 1
        units.append({"chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["sec"], "secNo": f"{ci}.{u['sub']}",
                      "title": u["title"], "chapterTitle": TITLES[ci - 1],
                      "locator": u.get("locator", ""), "source": u.get("source", ""),
                      "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
                      "segments": u.get("segments") or [{"seg": "1", "text": body}],
                      "brief": "只写教材所述的证候、治法与外治，不写剂量、光电参数与美容项目报价",
                      "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in V.items()},
                                  "levels": {k: (h if ci in v else 0) for k, v in L.items()},
                                  "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|天|周|%|月)", body))}})

for ci in range(1, 9):
    g = [u for u in units if int(u["chapter"]) == ci]
    print(f"  ch{ci} {TITLES[ci-1][:16]} · {len(g)} 单元 · {sum(u['hanzi'] for u in g):,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in V}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in L.items()}
OUT = {"subject": SUB, "title": "中医美容皮肤", "views": V, "levels": L,
       "source": {"kind": "derived", "file": "F:/textbooks/qhzy-中医外科学.xlsx",
                  "note": "中医外科学第 8 章（皮肤疾病）按节切成 8 章"},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 8, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": i, "title": TITLES[i - 1], "units": sum(1 for u in units if int(u["chapter"]) == i)} for i in range(1, 9)]}
os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(OUT, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "中医外科学皮肤章按节切分", "views": V, "levelsA": L,
           "probe": {"view": tv, "A_part": tl}, "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 8 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")

r = subprocess.run([PY, "scripts/make_outline_course.py", SUB, "departments/08-wuguan/15-zhongyi-meirong-pifu",
                    "中医美容皮肤", "e15", "皮损 → 病性 → 治法 → 调护",
                    "美容皮肤的判据是「皮损说得清、证候辨得准、处置有禁忌」——美容项目不等于医疗处置"],
                   cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(((r.stdout or r.stderr).strip().splitlines() or ["无输出"])[-1])
