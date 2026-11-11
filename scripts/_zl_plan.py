# -*- coding: utf-8 -*-
"""针灸治疗学：14 教材章 → 12 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-zhiliao", "departments/03-zhenjiu/08-zhenjiu-zhiliao-xue"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
by_ch = {}
for u in U["units"]:
    by_ch.setdefault(u["chapter"], []).append(u)


def subs(no):
    return [u["sub"] for u in by_ch.get(str(no), [])]


neike = by_ch["7"]
half = len(neike) // 2
neike_a = [u["sub"] for u in neike[:half]]
neike_b = [u["sub"] for u in neike[half:]]

PLAN = [
 (1, "01-zhiliao-yuanze", "针灸治疗原则与作用", subs(1) + subs(2), ["1", "2"],
  "先讲清「为什么这样治」：治神守气、补虚泻实、清热温寒、治病求本"),
 (2, "02-zhenzhi-tedian-chufang", "临床诊治特点与针灸处方", subs(3) + subs(4), ["3", "4"],
  "从辨证到处方：选穴原则、配穴方法、处方组成"),
 (3, "03-tedingxue-yingyong", "特定穴的临床应用", subs(5), ["5"],
  "五输、原络、俞募、八脉交会——处方里的「骨干穴」全在这一章"),
 (4, "04-toumina-tongzheng", "头面躯体痛证", subs(6), ["6"],
  "痛证是针灸最常被验证的一块，也是「取穴—手法—疗程」链条最完整的一块"),
 (5, "05-neike-yi", "内科病证（一）", neike_a, ["7"],
  "教材内科章体量最大（4.4 万字），按节序一分为二，避免一章压死"),
 (6, "06-neike-er", "内科病证（二）", neike_b, ["7"],
  "内科章后半：同一辨证框架下的另一批病种"),
 (7, "07-fuerke", "妇儿科病证", subs(8), ["8"],
  "妇科与儿科共用「周期／体质」两条线，禁忌与剂量边界必须写清"),
 (8, "08-piwaike", "皮外伤科病证", subs(9), ["9"],
  "皮损局部与远端配穴并用，围刺与放血在此出现"),
 (9, "09-wuguan", "五官科病证", subs(10), ["10"],
  "眼、耳、鼻、咽喉、口齿：局部取穴密集，操作精度要求高"),
 (10, "10-jizheng-qita", "急症与其他病证", subs(11) + subs(12), ["11", "12"],
  "急症讲「先保命、再针刺」；其他病证收戒断、肥胖、美容等边缘题材"),
 (11, "11-zhiwuliu-zhu", "子午流注与灵龟八法", subs(13), ["13"],
  "时间针法：推算规则可复现，疗效主张须与规则本身分开看"),
 (12, "12-yanjiu-jinzhan", "针灸临床研究进展", subs(14), ["14"],
  "收口：证据分级、常见偏倚、如何读一篇针灸 RCT"),
]

cm = {}
for n, slug, title, us, srcs, why in PLAN:
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "针灸治疗学 12 章 ← 教材 14 章：1+2（原则/作用）、3+4（诊治特点/处方）、11+12（急症/其他）各合并；教材第 7 章（内科，4.4 万字）按节序一分为二；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝治法与处方 1306 / 操作与疗程 1198 / 辨证与分型 586（2.2×）；四位面＝病证门类（4.7×，与教材 6–12 章同构）；处方四要素 7.0× 未取。",
           "views": U["views"], "levelsA": U["levels"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《针灸治疗学·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}的处方能不能被别人照着做出来", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "针灸治疗学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-针灸治疗学.xlsx（14 内容章 / 472 单元）",
           "chain": "治疗原则 → 诊治特点与处方 → 特定穴 → 头面躯体痛证 → 内科（一） → 内科（二） → 妇儿科 → 皮外科 → 五官科 → 急症与其他 → 时间针法 → 研究进展",
           "levelLabel": "病证门类", "objectPressure": "治疗学的判据是「处方可照做」：主穴、配穴、操作、疗程四件齐了才叫处方",
           "reportRule": "病历与处方记录须写：辨证分型、主穴配穴、操作手法、疗程频次、疗效判定",
           "gapNote": "教材未给各病种的证据等级；妇儿科与皮外科的病种覆盖不均，已在章内标明",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《针灸治疗学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
