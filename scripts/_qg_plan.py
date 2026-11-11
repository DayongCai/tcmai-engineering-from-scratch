# -*- coding: utf-8 -*-
"""中医气功学：13 教材章 → 7 课程章；写 chapter-map / axes / doc-config。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "qigong", "departments/03-zhenjiu/04-qigong-xue"
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
 (1, "01-gaishu-yuanyuan", "学科概论与发展简史", subs(1, 2), ["1", "2"],
  "先立边界：气功不是玄学，也不是万能锻炼法——它是有操作规范、有偏差风险的一门技术"),
 (2, "02-lilun-jichu", "理论基础与修炼要素", subs(3, 4), ["3", "4"],
  "精气神、经络脏腑是解释框架；三调（调身/调息/调心）是操作框架，两者不能混说"),
 (3, "03-fanying-piancha", "练功反应与偏差的预防与纠治", subs(5), ["5"],
  "这门课与其他课最大的不同：练错了会出偏差，这一章讲怎么识别、怎么停"),
 (4, "04-jinggong-donggong", "静功与动功", subs(6, 7), ["6", "7"],
  "教材篇幅最重的两块：静功讲意守与入静，动功讲导引与动作规格"),
 (5, "05-taiji-jianshen", "太极拳、武术内功与健身气功", subs(8, 9), ["8", "9"],
  "从传统武术内功到当代健身气功：同一动作谱系被重新编目与标准化"),
 (6, "06-bianzheng-shigong", "辨证施功与临床应用", subs(10, 11, 12), ["10", "11", "12"],
  "辨证施功是本学科的方法论核心：什么证、选什么功、练多久"),
 (7, "07-yanjiu-zhiweibing", "现代研究与治未病", subs(13), ["13"],
  "收口：证据到什么程度、哪些说法目前只有机制没有终点指标"),
]

cm = {}
for n, slug, title, us, srcs, why in PLAN:
    assert slug == slug.lower(), slug
    cm[slug] = {"n": n, "title": title, "units": us, "srcChapters": srcs, "why": why,
                "derivedFrom": "、".join(f"教材第{s}章" for s in srcs)}
json.dump({"note": "中医气功学 7 章 ← 教材 13 章：1+2、3+4、6+7、8+9、10+11+12 合并；无单元复用。",
           "chapters": cm},
          io.open(os.path.join(base, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

json.dump({"note": "三辨＝功法操作 3040 / 理论原理 2910 / 临床运用 666（4.6×）；四位面＝三调与临床应用（2.6×）；功法类型 8.7× 未取。",
           "views": U["views"], "levelsA": U["levels"]},
          io.open(os.path.join(base, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {slug: [f"《中医气功学·{v['title']}》", "教材篇名级；课程章号对应教材第 " + "、".join(v["srcChapters"]) + " 章"]
      for slug, v in cm.items()}
cq = {slug: [f"{v['title']}这一段，学完能不能自己按规格做一遍", v["why"]] for slug, v in cm.items()}
json.dump({"courseTitle": "中医气功学", "deptPath": DEPT,
           "xlsx": "F:/textbooks/qhzy-中医气功学.xlsx（13 内容章 / 76 单元）",
           "chain": "概论史 → 理论与三调 → 偏差防治 → 静功动功 → 太极与健身气功 → 辨证施功 → 研究与治未病",
           "levelLabel": "三调与临床", "objectPressure": "气功课的风险在于「自己练」：姿势、呼吸、意守任何一项越界都可能出偏差",
           "reportRule": "练功记录写：功法名、时长、姿势、呼吸方式、意守部位、反应；出现偏差按第 3 章流程处理",
           "gapNote": "教材无影像与动作分解图；现代研究一章的证据等级未标，本课逐条标「教材未给等级」",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《中医气功学》", "教材篇名级"]},
          io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("plan ok:", len(cm), "章;", sum(len(v["units"]) for v in cm.values()), "单元")
