# -*- coding: utf-8 -*-
"""实验针灸学：13 教材章 → 11 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "shiyan-zhenjiu", "departments/03-zhenjiu/10-shiyan-zhenjiu-xue"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
by_ch = {}
for u in U["units"]:
    by_ch.setdefault(u["chapter"], []).append(u)

PLAN = [
 (1, "01-xulun-dingwei", "绪论与学科定位", ["1"], "先立问题：实验针灸学回答「针灸为什么有效」，而不是「针灸怎么用」"),
 (2, "02-shuxue-xingtai", "腧穴的形态结构与功能", ["2"], "穴位是不是实体结构——这是本学科第一个可检验的问题"),
 (3, "03-jingluo-xianxiang", "经络现象的现代研究", ["3"], "循经感传与经络实质：现象先行，解释在后"),
 (4, "04-xiaoying-tedian", "针灸作用的效应与特点", ["4"], "先看效应谱，再谈机制"),
 (5, "05-zhentong-jizhi", "针灸镇痛作用与机制", ["5"], "全学科证据最厚的一块：从闸门到内源性镇痛"),
 (6, "06-shenjing-tiaojie", "针灸对神经系统的调节", ["6"], "中枢与外周：神经通路是多数效应的共同出口"),
 (7, "07-neifen-mianyi", "针灸对内分泌与免疫系统的调节", ["7"], "从神经到内分泌免疫：效应如何被放大与维持"),
 (8, "08-xunhuan-huxi-xiaohua", "针灸对循环、呼吸、消化系统的调节", ["8"], "三大系统的效应指标最可测，也最容易被过度解释"),
 (9, "09-miniao-shengzhi-yundong", "针灸对泌尿、生殖、运动系统的作用", ["9"], "证据相对薄的一段，恰好练「区分有无证据」"),
 (10, "10-fangfa-moxing", "研究方法与动物模型", ["10", "11"], "方法决定结论：测什么、怎么测、在哪测"),
 (11, "11-xunzheng-qianyan", "循证针灸学与前沿", ["12", "13"], "把证据分级与前沿方向接上，收口全课"),
]

cm = {}
for n, slug, title, srcs, why in PLAN:
    us = []
    for s in srcs:
        us += [u["sub"] for u in by_ch.get(s, [])]
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "实验针灸学 11 章 ← 教材 13 章：方法与模型、循证与前沿各合并两章；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝效应与机制/方法与技术/证据与临床（1.6×）；四位面＝研究层次（2.9×）；靶系统 4.8× 未取（泌尿生殖运动 315 偏薄）。",
           "views": U["views"], "levelsA": U["levels"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《实验针灸学·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}要回答的实验问题是什么", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "实验针灸学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-实验针灸学.xlsx（13 内容章 / 55 单元）",
           "chain": "绪论 → 腧穴形态 → 经络现象 → 效应特点 → 镇痛 → 神经 → 内分泌免疫 → 循环呼吸消化 → 泌尿生殖运动 → 方法与模型 → 循证与前沿",
           "levelLabel": "研究层次", "objectPressure": "实验针灸学的难点不是记住结论，而是分清「有证据」「有机制解释」「只有推测」",
           "reportRule": "实验报告与系统评价：先看设计与样本，再看结论",
           "gapNote": "具体实验数据与图谱未入正文；各系统证据强弱不均，已在各章判据中写明",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《实验针灸学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
