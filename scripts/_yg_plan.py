# -*- coding: utf-8 -*-
"""医古文：12 教材章 → 8 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yiguwen", "departments/01-zhongyi/02-yi-gu-wen"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
by_ch = {}
for u in U["units"]:
    by_ch.setdefault(u["chapter"], []).append(u)


def subs(*nos):
    out = []
    for n in nos:
        out += [u["sub"] for u in by_ch.get(str(n), [])]
    return out


PLAN = [
 (1, "01-gaishu-gongjushu", "医古文概论与工具书", subs(1, 2), ["1", "2"],
  "先解决「查得到」：字典、辞书、索引、类书怎么用"),
 (2, "02-hanzi-cihui", "汉字与词汇", subs(3, 4), ["3", "4"],
  "通假、古今字、异体字、本义引申——读错一个字，整句错"),
 (3, "03-yufa", "语法", subs(5), ["5"],
  "实词活用、虚词、句式：古汉语的语法与今语不同处"),
 (4, "04-duanju-jinyi", "断句、标点与今译", subs(6, 7), ["6", "7"],
  "断句是理解的检验：断错一处，句意全变"),
 (5, "05-zhuanji", "医家传记文选", subs(8), ["8"],
  "传记体读人物与时代：字、号、生卒、师承的信息在哪儿"),
 (6, "06-yijing-yilun", "医经医论文选", subs(9), ["9"],
  "医经原文与医论：说理文的论证结构"),
 (7, "07-xuwen-yian", "方书本草序文与医话医案", subs(10, 11), ["10", "11"],
  "序文讲著作缘起，医案讲决策过程，两种最实用的文体"),
 (8, "08-shuzi-renwen", "医古文与数字人文", subs(12), ["12"],
  "收口：检索、校勘、语料库工具能做什么，不能做什么"),
]

cm = {}
for n, slug, title, us, srcs, why in PLAN:
    assert slug == slug.lower(), slug
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "医古文 8 章 ← 教材 12 章：1+2、3+4、6+7、10+11 合并；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝字词训释 954 / 语法句读 520 / 文选与医理 174（5.5×，教材以通论为主）；四位面＝教材四板块结构分区（3.2×）。",
           "views": U["views"], "levelsA": U["levels"], "planes": U.get("planes")},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《医古文·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"读完{v['title']}，能独立读懂一段未经标点的医经原文吗", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "医古文", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-医古文.xlsx（12 内容章 / 47 单元）",
           "chain": "概论与工具书 → 汉字词汇 → 语法 → 断句今译 → 传记 → 医经医论 → 序文医案 → 数字人文",
           "levelLabel": "教材四板块", "objectPressure": "医古文的判据不是「背了多少通假字」，而是拿到一段无标点原文能否断句、能译对",
           "reportRule": "释读记录写：出处（书名·篇名）、原文、断句、疑难字词、今译、依据（依据哪部辞书）",
           "gapNote": "教材未附原文影印与异文对照；文选篇目为节选，完整原文需另查原书",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《医古文》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
