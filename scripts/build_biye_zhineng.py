# -*- coding: utf-8 -*-
"""19 智能毕业设计（6 阶段，sem910）：材料取自机器学习与中医软件架构单元层。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB = "zhineng-biye-sheji"
SRC = {"jiqi": "jiqi-xuexi", "ruanjian": "zhongyi-ruanjian-jiagou"}
LOAD = {k: json.load(io.open(os.path.join(S, v, "units.json"), encoding="utf-8")) for k, v in SRC.items()}
PLAN = [
    (1, "选题：从中医问题到可复现实验", "jiqi", [1]),
    (2, "数据集与标注规范", "jiqi", [10]),
    (3, "方法实现与消融实验", "jiqi", [5]),
    (4, "误差分析与临床可解释性", "jiqi", [2]),
    (5, "论文写作与答辩", "jiqi", [8]),
    (6, "知识移交：模型卡与交接", "ruanjian", [8]),
]
VIEWS = {"问题与数据": ["问题", "数据", "样本", "标注", "指标", "假设"],
         "方法与实验": ["方法", "模型", "实验", "训练", "参数", "对比"],
         "解释与移交": ["解释", "误差", "结论", "文档", "交接", "复用"]}
LEVELS = {"选题与数据": [1, 2], "实现与实验": [3, 4], "写作与移交": [5, 6]}

units, meta, idx = [], [], 0
for ci, title, src, chs in PLAN:
    h = 0
    for ch in chs:
        for u in LOAD[src]["units"]:
            if int(u["chapter"]) != ch:
                continue
            body = u.get("body") or u.get("prose") or ""
            hh = u.get("hanzi") or 0
            if hh < 120:
                continue
            idx += 1
            units.append({
                "chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"], "secNo": f"{ci}.{u.get('sub', idx)}",
                "title": u["title"], "chapterTitle": title,
                "locator": u.get("locator", ""), "source": u.get("source", ""),
                "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                "segments": u.get("segments") or [{"seg": "1", "text": body}],
                "brief": "只写阶段任务与交付物，不写具体机构与个人",
                "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                            "levels": {k: (hh if ci in v else 0) for k, v in LEVELS.items()},
                            "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|轮|小时|天|%|例)", body))},
            })
            h += hh
    meta.append((ci, title, h))
    print(f"  ch{ci} {title[:18]} ← {src} {chs} · {h:,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
OUT = {"subject": SUB, "title": "智能毕业设计与知识移交", "views": VIEWS, "levels": LEVELS,
       "source": {"kind": "derived", "file": "F:/textbooks/qhzy-机器学习.xlsx",
                  "note": "sem910 毕设：阶段结构取自 data/new-subjects-chapters.json，材料取自单元层"},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 6, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": ci, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == ci)} for ci, t, _ in meta]}
d = os.path.join(S, SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "sem910 毕设；四位面按阶段分区。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(d, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 6 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")
