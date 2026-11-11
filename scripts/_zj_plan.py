# -*- coding: utf-8 -*-
"""针灸学：30 教材章 → 30 课程章（1:1）；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-xue", "departments/03-zhenjiu/16-zhenjiu-xue"
base = os.path.join(ROOT, "standards", SUB)
U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
by_ch = {}
for u in U["units"]:
    by_ch.setdefault(u["chapter"], []).append(u)

TITLES = [
 (1, "01-xulun", "绪论"),
 (2, "02-jingluo-zonglun", "经络总论"),
 (3, "03-shuxue-zonglun", "腧穴总论"),
 (4, "04-shoutaiyin-feijing", "手太阴肺经及其腧穴"),
 (5, "05-shouyangming-dachangjing", "手阳明大肠经及其腧穴"),
 (6, "06-zuyangming-weijing", "足阳明胃经及其腧穴"),
 (7, "07-zutaiyin-pijing", "足太阴脾经及其腧穴"),
 (8, "08-shoushaoyin-xinjing", "手少阴心经及其腧穴"),
 (9, "09-shoutaiyang-xiaochangjing", "手太阳小肠经及其腧穴"),
 (10, "10-zutaiyang-pangguangjing", "足太阳膀胱经及其腧穴"),
 (11, "11-zushaoyin-shenjing", "足少阴肾经及其腧穴"),
 (12, "12-shoujueyin-xinbaojing", "手厥阴心包经及其腧穴"),
 (13, "13-shoushaoyang-sanjiaojing", "手少阳三焦经及其腧穴"),
 (14, "14-zushaoyang-danjing", "足少阳胆经及其腧穴"),
 (15, "15-zujueyin-ganjing", "足厥阴肝经及其腧穴"),
 (16, "16-dumai", "督脉及其腧穴"),
 (17, "17-renmai", "任脉及其腧穴"),
 (18, "18-jingwai-qixue", "经外奇穴"),
 (19, "19-cijiufa-zonglun", "刺灸法总论"),
 (20, "20-haozhen-cifa", "毫针刺法"),
 (21, "21-jiufa", "灸法"),
 (22, "22-baguan-qita-cifa", "拔罐法及其他刺法"),
 (23, "23-zhiliao-zonglun", "针灸治疗总论"),
 (24, "24-tongzheng", "头面躯体痛证"),
 (25, "25-neike-bingzheng", "内科病证"),
 (26, "26-fuer-bingzheng", "妇儿科病证"),
 (27, "27-piwai-bingzheng", "皮肤外科病证"),
 (28, "28-wuguan-bingzheng", "五官科病证"),
 (29, "29-jizheng-qita", "急症及其他病证"),
 (30, "30-xiandai-yanjiu", "针灸现代研究与数字化"),
]

WHY = {
 1: "全书总纲：针灸学的研究对象、学科结构与学习方法",
 2: "经络是理论与临床之间的桥：先有循行，才有取穴",
 3: "腧穴总论讲分类、定位、主治规律——后面 14 章经穴全靠这一章的规矩",
 4: "十二经从肺经起：手太阴在胸、循臂内前廉，是「经脉所过，主治所及」的第一个样例",
 5: "手阳明与手太阴相表里：表里经配穴的第一组",
 6: "足阳明多气多血，面部与腹部取穴最密，也是风险最高的区域之一",
 7: "足太阴脾经主运化，与腹部、下肢内侧穴位连成一线",
 8: "手少阴心经短而关键，神志病取穴多在此",
 9: "手太阳小肠经循肩胛绕肩，是颈肩病的常用线",
 10: "足太阳最长、穴位最多：背俞穴全在此，也是针刺安全的高风险线",
 11: "足少阴肾经从足底上行至胸，原气所系",
 12: "手厥阴心包经与内关：心胸急症的常用线",
 13: "手少阳三焦经循耳后、肩颈，头侧痛常用",
 14: "足少阳胆经循身侧，少阳为枢，头侧与胁肋取穴在此",
 15: "足厥阴肝经止于期门，与前阴、少腹病相关",
 16: "督脉总督诸阳，脊柱正中一线；深刺风险最高",
 17: "任脉总任诸阴，腹中线一线；孕妇禁忌集中区",
 18: "经外奇穴：有定处、有主治，但不在十四经内",
 19: "刺灸法总论：九针、刺法分类、灸法分类、施术规范",
 20: "毫针刺法最重的一章：进针、行针、补泻、得气、意外处理",
 21: "灸法：艾炷、艾条、温针灸，灸量与适应证",
 22: "拔罐、三棱针、皮肤针、火针、电针：器械换了，规范不变",
 23: "治疗总论：辨证、选穴原则、配穴方法、处方组成",
 24: "痛证是针灸证据最厚的一块：取穴—手法—疗程链条完整",
 25: "内科病证占治疗篇最大篇幅，辨证施治的主战场",
 26: "妇儿科：周期与体质两条线，禁忌最多",
 27: "皮肤外科：局部围刺与放血，创面管理要求高",
 28: "五官科：局部取穴密集，操作精度要求高",
 29: "急症：先保命、再针刺；其他病证收边缘题材",
 30: "收口：现代研究怎么读、数字化工具能做什么",
}

cm = {}
for n, slug, title in TITLES:
    assert slug == slug.lower(), slug
    cm[slug] = {"n": n, "title": title, "units": [u["sub"] for u in by_ch.get(str(n), [])],
                "srcChapters": [str(n)], "why": WHY[n],
                "derivedFrom": f"教材第{n}章"}
json.dump({"note": "针灸学 30 章 = 教材 30 章（1:1），无合并、无拆分、无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝临床治疗 3653 / 刺灸技术 2315 / 经络腧穴 1739（2.1×）；四位面＝教材四板块（结构分区，汉字 3.1×）；部位轴 22.3×、主治轴 8.7× 均未取。",
           "views": U["views"], "levelsA": U["levels"], "planes": U["planes"], "ratio": U["ratio"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《针灸学·{v['title']}》", f"教材第{v['n']}章；课程章号与教材章号一一对应"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}这一章，要能用一句话说清它解决什么问题", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "针灸学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-针灸学.xlsx（30 内容章 / 250 单元）",
           "chain": "绪论 → 经络总论 → 腧穴总论 → 十四经与奇穴 → 刺灸法 → 治疗各论 → 现代研究",
           "levelLabel": "教材四板块", "objectPressure": "针灸学是全科的合订本：经络、腧穴、手法、治疗四块必须能互相对上，不能各背一段",
           "reportRule": "取穴记录写：经名、穴名、定位（骨度/体表标志）、操作、留针时间、反应",
           "gapNote": "教材无穴位图与解剖剖面图；30 章中经穴各论占比最大（10.4 万字），证据等级仅在治疗篇个别提及",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《针灸学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
