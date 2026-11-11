# -*- coding: utf-8 -*-
"""中国医学史（01-zhongyi/03-zhongguo-yixue-shi）：12 教材章 → 8 课程章（按朝代合并）。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB = "zhongguo-yixue-shi"
DEPT = "departments/01-zhongyi/03-zhongguo-yixue-shi"
TITLE = "中国医学史"

# 课程章 ← 教材章
MERGE = [
 (1, "01-xulun", "绪论：医学史的问题与方法", [1]),
 (2, "02-qiyuan-yu-zaoqi", "医药的起源与早期医药", [2]),
 (3, "03-chunqiu-qinhan", "春秋战国至秦汉：体系的奠基", [3, 4]),
 (4, "04-weijin-suitang", "魏晋南北朝至隋唐五代：分科与集成", [5, 6]),
 (5, "05-songjinyuan", "宋金元：争鸣与建制", [7]),
 (6, "06-mingqing", "明清：温病与考据", [8]),
 (7, "07-jindai-dangdai", "近代与当代：转型与重建", [9, 10]),
 (8, "08-shaoshu-jiaoliu-shuzi", "少数民族医学、中外交流与数字化", [11, 12]),
]
PLANES = {"起源与奠基": [1, 2, 3], "中古分科": [4, 5], "近古集成": [6, 7], "当代与扩展": [8]}

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
out_units, CM = [], {}
for n, slug, title, src in MERGE:
    us = [u for u in U["units"] if int(u["chapter"]) in src]
    assert us, f"第 {n} 章没有单元"
    for k, u in enumerate(us, 1):
        nu = dict(u)
        nu["chapter"] = str(n)
        nu["chapterTitle"] = f"第{n}章 {title}"
        nu["sub"] = f"{n}.{k}"
        nu["secNo"] = f"{n}.{1 + (k - 1) // 3}"
        nu["srcChapters"] = src
        out_units.append(nu)
    CM[slug] = {"n": n, "title": title, "units": [u["sub"] for u in out_units if u["chapter"] == str(n)],
                "srcChapters": [str(x) for x in src],
                "why": f"{title}：教材第 {'、'.join(str(x) for x in src)} 章",
                "derivedFrom": f"教材第 {'、'.join(str(x) for x in src)} 章"}

for u in out_units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}
tv = U["probe"]["view"] if "view" in U["probe"] else {}
tp = {k: sum(u["hanzi"] for u in out_units if int(u["chapter"]) in chs) for k, chs in PLANES.items()}
U2 = dict(U)
U2["counts"] = {"chapters": len(CM), "units": len(out_units), "hanzi": sum(u["hanzi"] for u in out_units),
                "valueLike": U["counts"].get("valueLike", 0)}
U2["levels"] = {k: [k] for k in PLANES}
U2["probe"] = {"view": tv, "A_part": tp}
U2["ratio"] = {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)}
U2["units"] = out_units
U2["chapters"] = [{"no": v["n"], "title": v["title"], "units": len(v["units"]), "srcChapters": v["srcChapters"]}
                  for v in CM.values()]
json.dump(U2, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "12 教材章 → 8 课程章（按朝代合并：3+4、5+6、9+10、11+12）。", "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "三辨按词表现算；四位面按时代阶段分区。", "views": U["views"], "levelsA": PLANES,
           "probe": U2["probe"], "ratio": U2["ratio"]},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"《中国医学史·{v['title']}》", f"教材第 {'、'.join(v['srcChapters'])} 章"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一段医学史的主线是什么，凭什么这么说", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": "F:/textbooks/qhzy-中国医学史.xlsx",
           "chain": "起源 → 奠基 → 分科 → 争鸣 → 集成 → 转型 → 当代与交流",
           "levelLabel": "时代阶段",
           "objectPressure": "医学史的判据是「人物—著作—制度」三件套：谁写的、写了什么、当时怎么组织医疗",
           "reportRule": "记述写：年代与出处、人物与著作、制度与影响；不用现代概念倒推古代",
           "gapNote": "教材为通史体，缺图像与出土文献；不把传说当史实，不作医学价值判断",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《中国医学史》", "教材章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(out_units)} 单元 / {U2['counts']['hanzi']:,} 汉字 · 三辨 {U2['ratio']['view']}× · 四位面 {U2['ratio']['A_part']}×")
chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
