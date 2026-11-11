# -*- coding: utf-8 -*-
"""针灸医籍选：10 教材章 → 8 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-yiji", "departments/03-zhenjiu/03-zhenjiu-yiji-xuan"
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
 (1, "01-lingshu-xuandu", "《灵枢》选读", subs(1), ["1"], "《灵枢》是针灸理论的总源头：九针、经脉、刺法皆出于此"),
 (2, "02-suwen-nanjing", "《素问》与《难经》选读", subs(2, 3), ["2", "3"], "《素问》补治则与运气，《难经》补八十一难中的针法问答"),
 (3, "03-jia-yi-jing-suitang", "《针灸甲乙经》与隋唐医论", subs(4, 5), ["4", "5"], "皇甫谧首次按部类归穴；隋唐医家把针灸写进方书与医德"),
 (4, "04-songjinyuan", "宋金元医论", subs(6), ["6"], "铜人、子午流注、补土与滋阴：针灸被放进各家理论框架"),
 (5, "05-mingqing", "明清医论", subs(7), ["7"], "《针灸大成》集大成，明清进入总结与普及期"),
 (6, "06-gefu", "针灸歌赋", subs(8), ["8"], "歌赋是古代的「口袋教材」：押韵即记忆法，也最容易以讹传讹"),
 (7, "07-yian", "针灸医案", subs(9), ["9"], "医案是唯一能看到「决策过程」的体裁：辨、取、刺、效"),
 (8, "08-shuzihua-yuedu", "医籍选读与数字化", subs(10), ["10"], "收口：条文检索、版本校勘、AI 检索的能与不能"),
]

cm = {}
for _n, _slug, *_ in PLAN:
    assert _slug == _slug.lower(), _slug
for n, slug, title, us, srcs, why in PLAN:
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "针灸医籍选 8 章 ← 教材 10 章：2+3（素问/难经）、4+5（甲乙经/隋唐）各合并；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝临证应用 4320 / 义理发挥 1627 / 训释校勘 1147（3.8×）；四位面＝医籍文体（3.4×，与教材 01–09 章同构）；医籍来源 4.6× 未取。",
           "views": U["views"], "levelsA": U["levels"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《针灸医籍选读·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"读这段原文，能读出哪一条可用的针法主张", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "针灸医籍选", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-针灸医籍选读.xlsx（10 内容章 / 199 单元）",
           "chain": "灵枢 → 素问难经 → 甲乙经与隋唐 → 宋金元 → 明清 → 歌赋 → 医案 → 数字化",
           "levelLabel": "医籍文体", "objectPressure": "医籍课的判据是「分得清」：哪句是原文、哪句是注家的话、哪句是教材作者的按语",
           "reportRule": "引文必标书名＋篇名＋版本；转述与原文分开写，不改字",
           "gapNote": "教材未附影印本与版本对照表；同一段在不同版本有异文时，教材只取一说，本课如实标「教材取某本」",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《针灸医籍选读》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
