# -*- coding: utf-8 -*-
"""刺法灸法学：12 教材章 → 10 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "cifa-jiufa", "departments/03-zhenjiu/07-cifa-jiufa-xue"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
by_ch = {}
for u in U["units"]:
    by_ch.setdefault(u["chapter"], []).append(u)

PLAN = [
 (1, "01-gaishu-yuanliu", "针法灸法概论与源流", ["1"], "先分清「针」与「灸」两条技术线，以及它们共同的立论基础"),
 (2, "02-haozhen-cifa", "毫针刺法", ["2"], "教材最重的一章：进针、行针、补泻、得气，全在手上"),
 (3, "03-neijing-nanjing", "古代针法经典：内经与难经", ["3"], "读原文不是为了背，是为了知道「手法」这个词最初指什么"),
 (4, "04-jinzhenfu-dacheng", "后世针法：金针赋与针灸大成", ["4"], "复式手法在此定型：烧山火、透天凉、青龙摆尾"),
 (5, "05-jiufa", "灸法", ["5"], "灸的量与质（壮、炷、温度、时长）决定效应，也决定风险"),
 (6, "06-tezhong-zhenfa", "特种针法：三棱针、皮肤针、火针、挑刺、芒针", ["6"], "同一根针，换个形制就是另一套适应证与禁忌"),
 (7, "07-weizhen-xitong", "微针系统：耳针、头针、腕踝针", ["7"], "以局部对应整体，是针法里最需要「先讲清边界」的一类"),
 (8, "08-dianzhen-zhushe", "电针与穴位注射", ["8"], "把手法换成参数、把针换成药物：两处最常见的越界点"),
 (9, "09-mailiao-ciliao", "埋线、磁疗与激光穴位照射", ["9", "10"], "刺激方式的延长与替换，证据强弱各异"),
 (10, "10-anquan-shuzihua", "安全规范与数字化", ["11", "12"], "收口：晕针、断针、气胸怎么防，以及哪些「智能」只是辅助"),
]

cm = {}
for n, slug, title, srcs, why in PLAN:
    us = []
    for s in srcs:
        us += [u["sub"] for u in by_ch.get(s, [])]
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "刺法灸法学 10 章 ← 教材 12 章：第 9+10 章（埋线磁疗／激光与进展）、第 11+12 章（安全／数字化）各合并一章；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝操作手法 1993 / 应用与安全 1572 / 器械与技术 1057（1.9×）；四位面＝技术谱系（1.6×，四类 391–620）；操作环节 3.2× 未取。",
           "views": U["views"], "levelsA": U["levels"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《针法灸法学·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}的手上功夫要练到什么程度才算会", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "刺法灸法学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-针法灸法学.xlsx（12 内容章 / 114 单元）",
           "chain": "概论源流 → 毫针刺法 → 内经难经 → 金针赋针灸大成 → 灸法 → 特种针法 → 微针系统 → 电针穴位注射 → 埋线磁疗激光 → 安全与数字化",
           "levelLabel": "技术谱系", "objectPressure": "这门课的判据不是「知道」，而是「做对」——角度、深度、灸量、留针时间都可被旁人复核",
           "reportRule": "操作记录写清器具、穴位、手法、时长、反应；缺一项就无法复现",
           "gapNote": "教材未附操作视频与图谱；各技术证据强弱不均（埋线/磁疗/激光偏弱），已在章内判定层写明",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《针法灸法学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
