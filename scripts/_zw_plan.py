# -*- coding: utf-8 -*-
"""药用植物学：12 教材章 → 9 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yaoyong-zhiwu-xue", "departments/02-zhongyao/02-yaoyong-zhiwu-xue"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
units = U["units"]

by_ch = {}
for u in units:
    by_ch.setdefault(u["chapter"], []).append(u)

PLAN = [
 (1, "01-xulun-jichu", "绪论与药用植物学基础", ["1"], "先立对象与方法：药用植物学研究什么、怎么研究"),
 (2, "02-xibao-zuzhi", "药用植物的细胞与组织", ["2"], "细胞与组织是显微鉴别的全部语言"),
 (3, "03-gen-jing", "营养器官（一）：根与茎", ["3"], "根茎的初生与次生结构，决定药材断面的样子"),
 (4, "04-ye", "营养器官（二）：叶", ["4"], "叶的形态与解剖，是分类与鉴别的第一手证据"),
 (5, "05-hua-guoshi-zhongzi", "生殖器官：花、果实与种子", ["5"], "花果是分类学的主要依据，也是种子类药材的鉴别基础"),
 (6, "06-fenlei-deng", "分类学基础与低等植物", ["6", "7"], "双名法、检索表，以及藻菌地衣的药用位置"),
 (7, "07-taixian-jue-luozi", "苔藓、蕨类与裸子植物", ["8", "9"], "从孢子到种子：三个类群的演化阶梯"),
 (8, "08-beizi-zhiwu", "被子植物：离瓣花类与合瓣花类", ["10", "11"], "科的特征与药用代表，是本课最厚的一段"),
 (9, "09-ziyuan-fenzi", "药用植物资源、保护与分子鉴定", ["12"], "从野外调查到 DNA 条形码：资源与鉴定的现代手段"),
]

cm = {}
for n, slug, title, srcs, why in PLAN:
    us = []
    for s in srcs:
        us += [u["sub"] for u in by_ch.get(s, [])]
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "药植 9 章 ← 教材 12 章：1:1 或 2:1 归并，无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝形态描述/显微结构/分类与鉴定（2.4×）；四位面＝观察视角（1.6×）；器官层次 8.1× 未取（类群 180 偏薄）。",
           "views": U["views"], "levelsA": U["levels"],
           "levelsB": {"细胞与组织": [], "营养器官": [], "生殖器官": [], "类群": []},
           "levelsC": {}},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《药用植物学·{v['title']}》", "教材篇名级；章号为本课程章号，对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}要回答的问题是什么", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "药用植物学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-药用植物学.xlsx（12 内容章 / 52 单元）",
           "chain": "绪论 → 细胞组织 → 根茎 → 叶 → 花果种子 → 分类与低等植物 → 苔藓蕨类裸子 → 被子植物 → 资源与分子鉴定",
           "levelLabel": "观察视角", "objectPressure": "药植的难点不是记名字，是把「看到的形态」翻译成「可核对的分类特征」",
           "reportRule": "《中国药典·一部》基原项与《中国植物志》科属检索表",
           "gapNote": "实验切片与显微照片未入正文；科属全表只到代表科",
           "chapterQ": cq, "fallback": fb,
           "defaultCite": ["《药用植物学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
