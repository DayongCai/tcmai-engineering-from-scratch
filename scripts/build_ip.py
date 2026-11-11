# -*- coding: utf-8 -*-
"""14 知识产权转化（6 章）：把四份既有章节按单元切片，明确标注同源与不写内容。

切片来源：
  《卫生法学》第 14 章「中医药法律制度」→ 2 章（知识产权 7 次、专利 3、商标 2、著作权 2、许可 14）
  《管理学基础》第 14 章「管理创新与创业」→ 2 章（知识产权 5、专利 8、成果转化 8、许可 8）
  《卫生法学》第 16 章「生命伦理与新兴技术」→ 1 章
  《卫生法学》第 17 章「卫生法律监督与权益救济」→ 1 章（侵权 14）
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
SUB = "zhishichanquan-zhuanhua"

PLAN = [
    ("20-weisheng-fa-xue", 14, 2, ["知识产权的对象：从技术方案到权利", "中医药领域的知识产权形态"]),
    ("17-guanli-xue-jichu", 14, 2, ["专利：从发明到授权", "成果转化：从实验室到产品"]),
    ("20-weisheng-fa-xue", 16, 1, ["新兴技术与伦理：知识产权的前沿争议"]),
    ("20-weisheng-fa-xue", 17, 1, ["侵权、许可纠纷与救济"]),
]
V = {"权利与保护": ["权利", "保护"],
     "责任与赔偿": ["责任", "赔偿"],
     "中医药与技术": ["中医药", "技术"]}
L = {"权利基础": [1, 2], "专利与转化": [3, 4], "前沿与救济": [5, 6]}

units, idx, ci = [], 0, 0
for src, ch, pieces, titles in PLAN:
    U = json.load(io.open(os.path.join(S, src, "units.json"), encoding="utf-8"))
    pool = [u for u in U["units"] if int(u["chapter"]) == ch and (u.get("hanzi") or 0) >= 100]
    per = max(1, len(pool) // pieces)
    for k in range(pieces):
        ci += 1
        chunk = pool[k * per:(k + 1) * per] if k < pieces - 1 else pool[k * per:]
        for u in chunk:
            body = u["body"]
            h = u["hanzi"]
            idx += 1
            units.append({"chapter": str(ci), "sub": f"{ci}.{idx}", "sec": u["sec"], "secNo": f"{ci}.{u['sub']}",
                          "title": u["title"], "chapterTitle": titles[k],
                          "locator": u.get("locator", ""), "source": u.get("source", ""),
                          "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
                          "segments": u.get("segments") or [{"seg": "1", "text": body}],
                          "brief": "只写教材所述的权利类型、归属与流程，不写具体法条编号、赔偿数额与合同条款",
                          "measure": {"views": {k2: sum(body.count(w) for w in ws) for k2, ws in V.items()},
                                      "levels": {k2: (h if ci in v else 0) for k2, v in L.items()},
                                      "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:年|项|件|%|元)", body))}})
        print(f"  ch{ci} {titles[k][:22]} · {len(chunk)} 单元 · {sum(u['hanzi'] for u in chunk):,} 汉字")

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in V}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in L.items()}
titles_all = [t for _, _, _, ts in PLAN for t in ts]
OUT = {"subject": SUB, "title": "知识产权转化", "views": V, "levels": L,
       "source": {"kind": "derived", "file": "F:/textbooks/qhzy-卫生法学.xlsx",
                  "note": "四份章节切片：卫生法学 14/16/17 章 + 管理学基础 14 章"},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": ci, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": i + 1, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == i + 1)}
                    for i, t in enumerate(titles_all)]}
os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(OUT, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "四份章节切片", "views": V, "levelsA": L, "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: {ci} 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")

r = subprocess.run([PY, "scripts/make_outline_course.py", SUB, "departments/06-guanli/14-zhishichanquan-zhuanhua",
                    "知识产权转化", "ip", "权利 → 专利 → 转化 → 救济",
                    "知识产权转化的判据是「权利属谁、能不能转、转了怎么分」——三问答不上就别签"],
                   cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(((r.stdout or r.stderr).strip().splitlines() or ["无输出"])[-1])
