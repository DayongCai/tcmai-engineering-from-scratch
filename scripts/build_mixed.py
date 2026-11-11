# -*- coding: utf-8 -*-
"""通用「合成课」生成器：从既有单元层按章取料，按计划拼课（用于 07-zhineng 无专书的导论/辨治/多模态/伦理）。

用法: python scripts/build_mixed.py <sub>
计划文件 standards/<sub>/plan.json：
{
  "title": "...", "views": {"a": [词...], ...}, "levels": {"面1": [1,2], ...},
  "chapters": [{"title": "...", "picks": [["jiqi-xuexi", 1], ["zhongyi-xinxi-xue", 2]]}, ...]
}
每条单元保留原 locator/source；章节字数与三辨/四位面现算。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = sys.argv[1]
S = os.path.join(ROOT, "standards")
P = json.load(io.open(os.path.join(S, SUB, "plan.json"), encoding="utf-8"))
CACHE = {}


def load(sub):
    if sub not in CACHE:
        CACHE[sub] = json.load(io.open(os.path.join(S, sub, "units.json"), encoding="utf-8"))
    return CACHE[sub]


units, idx, meta = [], 0, []
for ci, ch in enumerate(P["chapters"], 1):
    h = 0
    if ch.get("split"):
        sp = ch["split"]
        pool = [u for u in load(sp["src"])["units"] if int(u["chapter"]) == int(sp["chapter"])]
        pool = [u for u in pool if (u.get("hanzi") or 0) >= 20]
        per = max(1, len(pool) // P.get("splitInto", 1) or len(pool))
        head = (ci - 1) * per
        picks_units = pool[head:head + per]
        for u in picks_units:
            body = u.get("body") or u.get("prose") or ""
            hh = u.get("hanzi") or 0
            idx += 1
            units.append({
                "chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"], "secNo": f"{ci}.{u.get('sub', idx)}",
                "title": u["title"], "chapterTitle": ch["title"],
                "locator": u.get("locator", ""), "source": u.get("source", ""),
                "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                "segments": u.get("segments") or [{"seg": "1", "text": body}],
                "brief": ch.get("brief", "只写教材所述的类别与关系"),
                "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in P["views"].items()},
                            "levels": {k: (hh if ci in v else 0) for k, v in P["levels"].items()},
                            "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|例|%|条|天)", body))},
            })
        meta.append((ci, ch["title"], sum(u["hanzi"] for u in picks_units)))
        continue
    for sub, no in ch["picks"]:
        for u in load(sub)["units"]:
            if int(u["chapter"]) != int(no):
                continue
            body = u.get("body") or u.get("prose") or ""
            hh = u.get("hanzi") or 0
            if hh < 20:
                continue
            idx += 1
            units.append({
                "chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["title"], "secNo": f"{ci}.{u.get('sub', idx)}",
                "title": u["title"], "chapterTitle": ch["title"],
                "locator": u.get("locator", ""), "source": u.get("source", ""),
                "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": hh,
                "segments": u.get("segments") or [{"seg": "1", "text": body}],
                "brief": ch.get("brief", "只写教材所述的类别与关系，不写具体参数与产品"),
                "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in P["views"].items()},
                            "levels": {k: (hh if ci in v else 0) for k, v in P["levels"].items()},
                            "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|例|%|条|天)", body))},
            })
            h += hh
    meta.append((ci, ch["title"], h))
    if h < 1000:
        print(f"  ⚠ ch{ci} 仅 {h} 字")

for ci, t, h in meta:
    print(f"  ch{ci} {t[:20]} · {h:,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in P["views"]}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in P["levels"].items()}
OUT = {"subject": SUB, "title": P["title"], "views": P["views"], "levels": P["levels"],
       "source": {"kind": "synthesized", "file": "F:/textbooks/qhzy-机器学习.xlsx",
                  "note": P.get("note", "合成课：单元逐字取自既有单元层，locator 保留原出处")},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": len(meta), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": ci, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == ci)} for ci, t, _ in meta]}
json.dump(OUT, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": P.get("note", "合成课"), "views": P["views"], "levelsA": P["levels"],
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: {len(meta)} 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")
