# -*- coding: utf-8 -*-
"""医学生物学（09-jichu/04-yixue-shengwu-xue）：16 教材章 → 16 课程章（1:1）。"""
import io
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB, DEPT = "yixue-shengwu-xue", "departments/09-jichu/04-yixue-shengwu-xue"
TITLE = "医学生物学"

SLUGS = {
 1: "01-xulun", 2: "02-yixue-xibao-shengwuxue-gailun", 3: "03-xibao-gaishu", 4: "04-xibaomo",
 5: "05-xibao-zhi", 6: "06-xibao-he", 7: "07-zengzhi-fenhua-shuailao-siwang",
 8: "08-ganxibao-yu-xibao-gongcheng", 9: "09-yixue-yichuanxue-gailun", 10: "10-jiyin-ji-jiyin-tubian",
 11: "11-dan-jiyin-yichuan", 12: "12-duo-jiyin-yichuan", 13: "13-renlei-ranse-ti-yu-ranse-ti-bing",
 14: "14-qunti-yichuan-xue", 15: "15-linchuang-yichuan-xue", 16: "16-zhongyi-yichuan-xue",
}

PLANES = {"细胞结构": [1, 2, 3, 4, 5, 6], "增殖与工程": [7, 8],
          "遗传规律": [9, 10, 11, 12, 13], "群体临床与中医": [14, 15, 16]}

WHY = {
 1: "绪论：这门课把细胞与遗传两条线接在医学问题上", 2: "医学细胞生物学概论：从细胞学到医学问题",
 3: "细胞概述：原核与真核、细胞的基本共性", 4: "细胞膜：流动镶嵌模型与跨膜运输",
 5: "细胞质：内膜系统与细胞器分工", 6: "细胞核：核膜、核仁与染色质",
 7: "增殖、分化、衰老与死亡：细胞周期与凋亡", 8: "干细胞与细胞工程：全能性与定向诱导",
 9: "医学遗传学概述：遗传病分类与研究层次", 10: "基因与基因突变：从结构到效应",
 11: "单基因遗传：系谱分析是唯一判据", 12: "多基因遗传：阈值模型与易感性",
 13: "染色体与染色体病：核型与显带", 14: "群体遗传学：Hardy-Weinberg 是基准",
 15: "临床遗传学：诊断、咨询与产前筛查", 16: "中医遗传学：禀赋与体质的历史表述",
}


def main():
    U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
    by = {}
    for u in U["units"]:
        by.setdefault(int(u["chapter"]), []).append(u)

    CM = {}
    for n in sorted(by):
        slug = SLUGS[n]
        assert slug == slug.lower(), slug
        CM[slug] = {"n": n, "title": by[n][0]["chapterTitle"].split(" ", 1)[1],
                    "units": [u["sub"] for u in by[n]], "srcChapters": [str(n)],
                    "why": WHY[n], "derivedFrom": f"教材第{n}章"}
    json.dump({"note": "医学生物学 16 章 = 教材 16 章（1:1，无合并拆分，无单元复用）。", "chapters": CM},
              io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    probe = {"view": U["probe"]["view"], "A_part": {k: 0 for k in PLANES}}
    for u in U["units"]:
        u["measure"]["levels"] = {k: 0 for k in PLANES}
        for p, chs in PLANES.items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]
    ratio = {"view": round(max(probe["view"].values()) / max(1, min(probe["view"].values())), 1),
             "A_part": round(max(probe["A_part"].values()) / max(1, min(probe["A_part"].values())), 1)}
    U["levels"] = {k: [k] for k in PLANES}
    U["probe"], U["ratio"] = probe, ratio
    json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝按教材章群结构分区（不用词频）。",
               "views": U["views"], "levelsA": PLANES, "probe": probe, "ratio": ratio},
              io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fb = {slug: [f"《医学生物学·{v['title']}》", f"教材第{v['n']}章；章号一一对应"] for slug, v in CM.items()}
    cq = {slug: [f"{v['title']}：这一章的判据是什么，什么算「看懂了」", v["why"]] for slug, v in CM.items()}
    json.dump({"courseTitle": TITLE, "deptPath": DEPT,
               "xlsx": f"F:/textbooks/{U['source']['file']}",
               "chain": "细胞（结构 → 行为 → 工程）→ 遗传（分子 → 传递 → 群体）→ 临床与中医",
               "levelLabel": "章群结构",
               "objectPressure": "医学生物学的判据是「结构—功能—变异」三件套：看得见的结构，讲得清的功能，找得到的变异",
               "reportRule": "观察记录写：标本与方法、结构或核型所见、与教材表述的差异",
               "gapNote": "教材无插图；显微与核型图像一律不引，只写文字可复核的判据",
               "chapterQ": cq, "fallback": fb, "defaultCite": ["《医学生物学》", "教材章名级"]},
              io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("plan:", len(CM), "章 /", sum(len(v["units"]) for v in CM.values()), "单元 · ratio", ratio)

    shutil.rmtree(os.path.join(ROOT, DEPT, "chapters"), ignore_errors=True)
    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
                [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    main()
