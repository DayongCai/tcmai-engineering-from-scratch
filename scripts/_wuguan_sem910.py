# -*- coding: utf-8 -*-
"""五官系 sem910：16 临床轮转 / 17 毕设（章结构取自 data/new-subjects-chapters.json）。"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
S = os.path.join(ROOT, "standards")

VIEWS = {"辨证与诊断": ["辨证", "诊断"], "检查与影像": ["检查", "影像", "功能"], "治法与疗效": ["治法", "方药", "疗效"]}

SEM = {
    "wuguan-linchuang-lunzhuan": {
        "title": "五官临床轮转",
        "plan": [(1, [["zhongyi-yanke-xue", 4]]), (2, [["zhongyi-erbihou-xue", 4]]),
                 (3, [["zhongyi-kouqiang-kexue", 3], ["zhongyi-kouqiang-kexue", 5]]),
                 (4, [["zhongyi-kouqiang-kexue", 9]]),
                 (5, [["zhongyi-erbihou-xue", 9]]),
                 (6, [["zhongyi-yanke-xue", 10]])],
    },
    "wuguan-biye-sheji": {
        "title": "五官毕业设计与知识移交",
        "plan": [(1, [["zhongyi-yanke-xue", 4]]), (2, [["zhongyi-yanke-xue", 2]]),
                 (3, [["zhongyi-erbihou-xue", 10]]), (4, [["zhongyi-erbihou-xue", 9], ["zhongyi-yanke-xue", 10]]),
                 (5, [["zhongyi-kouqiang-kexue", 10], ["zhongyi-yanke-xue", 1]]), (6, [["zhongyi-erbihou-xue", 2]])],
    },
}

for sub, job in SEM.items():
    D = os.path.join(ROOT, "departments/08-wuguan", ("16-" if "lunzhuan" in sub else "17-") + sub)
    CJ = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))
    titles = [c["title"] for c in CJ["chapters"]]
    units, idx, meta = [], 0, []
    for ci, picks in job["plan"]:
        h = 0
        for src, ch in picks:
            U = json.load(io.open(os.path.join(S, src, "units.json"), encoding="utf-8"))
            for u in U["units"]:
                if int(u["chapter"]) != int(ch):
                    continue
                body = u.get("body") or u.get("prose") or ""
                hh = u.get("hanzi") or 0
                if hh < 20:
                    continue
                idx += 1
                units.append({"chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"],
                              "secNo": f"{ci}.{u.get('sub', idx)}", "title": u["title"], "chapterTitle": titles[ci - 1],
                              "locator": u.get("locator", ""), "source": u.get("source", ""),
                              "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                              "segments": u.get("segments") or [{"seg": "1", "text": body}],
                              "brief": "只写站点任务、观察要点与交接物，不写具体病例与疗效数字",
                              "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                                          "levels": {k: (hh if ci in v else 0) for k, v in
                                                     {"前段": [1, 2], "中段": [3, 4], "后段": [5, 6]}.items()},
                                          "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:例|次|天|%|周)", body))}})
                h += hh
        meta.append((ci, titles[ci - 1], h))
        print(f"  {sub} ch{ci} {titles[ci-1][:18]} · {h:,}")
    tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
    tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in {"前段": [1, 2], "中段": [3, 4], "后段": [5, 6]}.items()}
    OUT = {"subject": sub, "title": job["title"], "views": VIEWS, "levels": {"前段": [1, 2], "中段": [3, 4], "后段": [5, 6]},
           "source": {"kind": "derived", "file": "F:/textbooks/qhzy-中医眼科学.xlsx", "note": "sem910 实践课"},
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                     "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
           "counts": {"chapters": 6, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                      "valueLike": sum(u["measure"]["valueLike"] for u in units)},
           "units": units,
           "chapters": [{"no": c, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == c)} for c, t, _ in meta]}
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(OUT, io.open(os.path.join(S, sub, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "sem910", "views": VIEWS, "levelsA": OUT["levels"], "probe": {"view": tv, "A_part": tl},
               "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
              io.open(os.path.join(S, sub, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sub}: 6 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字")
