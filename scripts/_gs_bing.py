# -*- coding: utf-8 -*-
"""11-关节病学：底本《中医骨病学》（12 章 / 60 单元 / 149,316 字）→ 10 课程章。

按用户决策：并入 11-关节病学，不做新学科。底本覆盖面比课名宽，超出「关节」的章节
（骨肿瘤、骨代谢、骨畸形）保留为鉴别与转诊内容，并在 README 与缺口登记写明。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB, DEPT = "gushang-bing", "departments/04-gushang/11-guanjie-bing-xue"
TITLE = "关节病学（底本：中医骨病学）"

PLAN = [
 (1, "01-gailun-bingyin", "骨病概论与病因病机", ["1", "2"], "先分清骨病与骨伤：一个看骨本身，一个看外力"),
 (2, "02-linchuang-zhencha", "骨病的临床诊查", ["3"], "骨病的体征少而慢，问诊比触诊更早给线索"),
 (3, "03-zhiliao-fangfa", "骨病的治疗方法", ["4"], "内治、外治、手术三条路的分工"),
 (4, "04-huamou-guanjieyan", "化脓性骨髓炎与化脓性关节炎", ["5"], "关节感染是急症：拖延直接毁关节"),
 (5, "05-gujiehe", "骨与关节结核", ["6"], "起病隐匿，误当劳损是常见错误"),
 (6, "06-guzhongliu", "骨肿瘤：识别与转诊", ["7"], "超出关节病范围，但每个关节痛患者都要排除"),
 (7, "07-gudaixie", "骨代谢性疾病", ["8"], "骨质疏松与骨软化：数值可核，是少数能定量的骨病"),
 (8, "08-guhuaisi", "骨缺血性坏死", ["9"], "分期决定保头还是置换"),
 (9, "09-tuixing-mianyi", "骨关节退行性与免疫性疾病", ["10"], "本课的主战场：骨关节炎与类风湿"),
 (10, "10-jixing-kangfu", "骨畸形、骨软骨病与康复", ["11", "12"], "收口：畸形矫正的时机与康复介入"),
]

PLANES = {
 "基础与诊查": [1, 2, 3],
 "感染与结核": [4, 5],
 "肿瘤代谢与坏死": [6, 7, 8],
 "退变畸形与康复": [9, 10],
}


def main():
    U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
    CM = {}
    for n, slug, title, srcs, why in PLAN:
        assert slug == slug.lower(), slug
        us = [u["sub"] for u in U["units"] if u["chapter"] in srcs]
        CM[slug] = {"n": n, "title": title, "units": us,
                    "srcChapters": srcs, "why": why,
                    "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
    json.dump({"note": "11-关节病学 10 章 ← 《中医骨病学》12 章（1+2、11+12 合并；骨肿瘤/骨代谢章节保留为鉴别与转诊内容）。",
               "chapters": CM},
              io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    probe = {"view": U["probe"]["view"], "A_part": {k: 0 for k in PLANES}}
    for u in U["units"]:
        u["measure"]["levels"] = {k: 0 for k in PLANES}
        for p, chs in PLANES.items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    ratio = {"view": U["ratio"]["view"],
             "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["levels"] = {k: [k] for k in PLANES}
    U["probe"], U["ratio"] = probe, ratio
    json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区。",
               "views": U["views"], "levelsA": PLANES, "probe": probe, "ratio": ratio},
              io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《中医骨病学·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
          for slug, v in CM.items()}
    cq = {slug: [f"{v['title']}的鉴别要点是什么", v["why"]] for slug, v in CM.items()}
    json.dump({"courseTitle": "关节病学", "deptPath": DEPT,
               "xlsx": f"F:/textbooks/{U['source']['file']}",
               "chain": " → ".join(t for n, s, t, src, w in PLAN),
               "levelLabel": "章群结构",
               "objectPressure": "关节病学的判据是「先排危险」：感染、结核、肿瘤三类必须在慢性关节痛中被主动排除",
               "reportRule": "记录写：部位、病程、体征、影像、分型分期、处理与随访",
               "gapNote": "底本为《中医骨病学》，覆盖面宽于课名；骨肿瘤/骨代谢章节作鉴别保留。教材无影像片与插图。",
               "chapterQ": cq, "fallback": fb, "defaultCite": ["《中医骨病学》", "教材篇名级"]},
              io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"plan {len(CM)} 章 / {sum(len(v['units']) for v in CM.values())} 单元 · ratio {ratio}")

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
                [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    main()
