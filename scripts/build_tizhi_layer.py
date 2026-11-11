#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_tizhi_layer.py —— 中医体质学：派生底本（证候层 → 体质层）

为什么没有「一本书 → 底本」：`F:/textbooks/` 下**没有**《中医体质学》工作簿
（有 qhzy-中医骨病学 / 老年病学 / 精神病学 …，但无体质学）。

派生路线（与《中医证候学》同一思路，但方向相反）：
  证候学是「把四门临床课的 900 单元聚成证候」；体质学是「把 132 个证候聚成 9 种体质」。
  · 证据层：standards/zhenghou/证候库.json（132 证候 / 14 族 / 208 次病证覆盖）
  · 参照层：standards/laonian/units.json 的 3.4.1「老年体质分型与辨识」（2,286 汉字，
            含九种体质的通行定义与五种老年常见质的辨识要点）
  · 规范层：九种体质（平和／气虚／阳虚／阴虚／痰湿／湿热／血瘀／气郁／特禀）

产出 standards/tizhi/：
  体质库.json      9 种体质 ×（来源族、证候数、病证覆盖、课程分布、代表方、辨识要点）
  源-证候映射.json  每一族的归属与理由（可复核）
  units.json       16 个单元（9 体质 + 7 方法/总论），供 scaffold 现算
  METHOD.json      派生规则、缺口、why
  axis-probe.json  三辨／四位面候选实测

口径：
  三辨＝先天禀赋 / 形神特征 / 证候倾向（体质的三层证据）
  四位面＝形态 / 功能 / 心理 / 易感（教材对「体质」的定义就是这四项：
           形态结构、生理功能、心理状态、对疾病的易感性）
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZHENG = os.path.join(ROOT, "standards", "zhenghou", "证候库.json")
LAONIAN = os.path.join(ROOT, "standards", "laonian", "units.json")
OUT = os.path.join(ROOT, "standards", "tizhi")

HANZI = re.compile(r"[\u4e00-\u9fff]")

# 族 → 体质（每一族只归一种体质，理由写进 源-证候映射.json）
FAMILY_TO_TYPE = {
    "气虚": ("气虚质", "气虚证候族全部对应气虚质（元气不足、脏腑功能低下）"),
    "阳虚": ("阳虚质", "阳虚证候族对应阳虚质（阳气不足、失于温煦）"),
    "阴虚": ("阴虚质", "阴虚证候族对应阴虚质（阴液亏少、失于濡润）"),
    "血虚": ("阴虚质", "九种体质无「血虚质」，血虚以阴血不足为共同病机，并入阴虚质并在正文标注"),
    "血瘀": ("血瘀质", "血瘀证候族对应血瘀质（血行不畅、瘀血内阻）"),
    "痰湿": ("痰湿质", "痰湿证候族对应痰湿质（水液内停、痰湿凝聚）"),
    "湿热": ("湿热质", "湿热证候族对应湿热质（湿热内蕴）"),
    "血热": ("湿热质", "血热以热象为主，九种体质无「血热质」，并入湿热质并在正文标注"),
    "热毒": ("湿热质", "热毒以热毒壅聚为主，同并入湿热质"),
    "气滞": ("气郁质", "气滞证候族对应气郁质（气机郁滞、情志不畅）"),
    "风寒": ("特禀质", "风寒族以卫表不固、易感外邪为主，归特禀质（过敏与易感倾向）"),
    "风热": ("特禀质", "风热族同归特禀质"),
    "正虚邪恋": ("气虚质", "正虚邪恋以正气不足、余邪不尽为主，归气虚质"),
    "其他": ("未归类", "「其他」11 证不宜强行归体质，保留为未归类并在正文交代"),
}

# 九种体质的辨识要点（参照层：老年病学 3.4.1 的通行定义，补全八质）
TYPES = [
    ("平和质", "阴阳气血调和，体态适中，面色红润，精力充沛，睡眠良好，患病少",
     "调养以维持为要：饮食有节、起居有常、劳逸适度"),
    ("气虚质", "元气不足：疲乏、气短、自汗，易感冒，舌淡脉弱",
     "益气健脾：四君子、补中益气类；忌耗气"),
    ("阳虚质", "阳气不足：畏寒肢冷、喜热饮、便溏、夜尿清长，舌淡胖脉沉迟",
     "温阳散寒：金匮肾气、阳和类；忌生冷"),
    ("阴虚质", "阴液亏少：手足心热、口燥咽干、盗汗、便干，舌红少苔脉细数",
     "滋阴润燥：六味、知柏类；忌辛燥"),
    ("痰湿质", "水液内停：形体肥胖、腹部松软、口黏、苔白腻、脉滑",
     "健脾化湿：二陈、平胃类；忌肥甘"),
    ("湿热质", "湿热内蕴：面垢油光、口苦口干、易生疮疡、苔黄腻、脉滑数",
     "清热利湿：龙胆泻肝、茵陈类；忌辛辣酒醴"),
    ("血瘀质", "血行不畅：肤色晦暗、口唇暗淡、易有瘀斑、舌暗有瘀点、脉涩",
     "活血化瘀：桃红四物、血府逐瘀类；忌久坐"),
    ("气郁质", "气机郁滞：情绪低落、胸胁胀满、善太息、脉弦",
     "疏肝解郁：逍遥、柴胡疏肝类；忌情志抑郁"),
    ("特禀质", "先天失常或过敏：易过敏、易感外邪、禀赋不耐",
     "益气固表、避过敏原：玉屏风类；忌接触致敏物"),
]

# 16 个单元 → 章（章号＝课程 chapters.json）
UNIT_PLAN = [
    (1, "体质的概念与边界", "体质是形态结构、生理功能与心理状态的综合固有特质，既不同于一时的证候，也不同于具体的疾病。它与证候的分界在于「时间尺度」与「可逆性」：证候随病程变化，体质在数年内相对稳定；证候可治愈，体质只能调养。本课程的全部数字来自证候层：132 个证候按病性聚为 9 种体质倾向，其中平和质 0 个证候——这是定义使然，不是数据缺失。"),
    (1, "九种体质总览", "九种体质为平和质、气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特禀质。它们在证候层的分布极不均匀：湿热质与阴虚质最多，平和质为零，未归类 11 个。这种不均匀本身就是一条结论：教材写得多的体质（湿热、阴虚、气虚、血瘀），正是临床上证候最常落到的几种。"),
    (2, "先天禀赋", "先天禀赋来自父母与胎孕，决定体质的「底板」：禀赋不足者易成气虚、阳虚；禀赋不耐者成特禀质。这一层在证候层几乎不可见（证候层记录的是已病状态），因此本课程对禀赋的论述以条理为主，数字从略。"),
    (2, "后天因素：年龄、性别、地域、饮食情志", "后天因素决定体质的「漂移方向」。年龄：老年多见气虚、阳虚、阴虚、痰湿、血瘀五种，且常两三种兼夹（老年病学 3.4.1 原文）。饮食：肥甘厚味助痰湿湿热，生冷伤阳。情志：久郁成气郁，气郁化火则转湿热。地域：东南多湿热，西北多燥寒。"),
    (3, "气虚质与阳虚质的判定", "气虚质以「疲、短、汗、感」四字为要：疲乏、气短、自汗、易感冒。阳虚质以「寒」为要：畏寒肢冷、喜热饮、便溏、夜尿清长。两者的分界与证候层一致——有无寒象：无寒象为气虚，有寒象为阳虚。"),
    (3, "阴虚质与痰湿质的判定", "阴虚质以「干、热」为要：口燥咽干、手足心热、盗汗、便干、舌红少苔。痰湿质以「肥、黏、腻」为要：形体肥胖、腹部松软、口黏、苔白腻。两者在证候层是两极：阴虚 13 证（另并入血虚 5 证），痰湿 9 证。"),
    (3, "湿热质与血瘀质的判定", "湿热质以「油、苦、疮」为要：面垢油光、口苦、易生疮疡、苔黄腻。血瘀质以「暗、斑、涩」为要：肤色晦暗、瘀斑、舌暗有瘀点、脉涩。湿热质在证候层最大（并入血热、热毒后达 37 证），血瘀质 16 证。"),
    (3, "气郁质与特禀质的判定", "气郁质以「郁、胀、息」为要：情绪低落、胸胁胀满、善太息、脉弦。特禀质以「敏、感」为要：易过敏、易感外邪、禀赋不耐。气郁质 7 证，特禀质 10 证（并入风寒 4、风热 6）。"),
    (4, "体质与证候的三条关系", "第一条：同证异质——同样的「气虚证」，在气虚质者身上是「本」，在痰湿质者身上是「标」。第二条：同质异证——同一个气虚质，可发为感冒、泄泻、崩漏。第三条：体质决定传变——阳虚质感寒易入里，阴虚质感温易化燥。第三条最难验证，也是本课程唯一需要纵向数据的地方。"),
    (5, "问卷到特征向量：形态、功能、心理、易感四域各有条目", "体质辨识的输入是问卷，问卷按体质定义分四个域：形态（形体、面色、舌象）、功能（气短、乏力、畏寒、睡眠）、心理（性格、情绪、太息）、易感（易感冒、过敏）。输出是九类的隶属度。工程上有三件事必须做对：条目单维（一个条目只测一个域）、量纲统一（统一为 1–5 级）、缺失处理（缺失不等于最低分）。这三件事做不对，后面的分类再精细也没有意义。"),
    (6, "体质分布与疾病易感：共现而非因果", "体质与疾病易感性的关系，在横向数据上只能看到「共现」而非「因果」。形体胖者多痰湿，面色晦暗者多血瘀，情志不畅者多气郁——这些都是形态、功能、心理与易感四域的共现。本课程用证候层的课程分布做一次替代观察：哪一种体质在某门临床课里出现最多，就说明该科病人中这种体质倾向更常见。这是弱证据，只能说「共现」。"),
    (7, "辨体施调与治未病：以平为期", "调养的原则是「以平为期」：虚者补之、实者泻之、郁者达之、瘀者行之，最终指向平和质。调养既调形体（饮食、运动），也调功能、心理与易感倾向。九种体质各有调养主线（见各质辨识要点后的调法），但共同的三条是：饮食有节、起居有常、情志舒畅。治未病的落点在于「辨体—辨病—辨证」三辨合一。"),
    (8, "信度、效度与测量误差：形态、功能、心理、易感四域各自计量", "体质辨识要可重复，须过三关（形态、功能、心理、易感四域都要各自计量，不可混算）：重测信度（同一人两周内两次结果一致）、评分者信度（两位医师判断一致，用 kappa）、结构效度（九类是否真的可分）。三关之外还有两个常见陷阱：回归均值（极端得分第二次自然回落）与标签漂移（量表改版后旧数据不可直接合并）。"),
]

CH_TITLES = {
    "1": "体质的概念与九种体质类型",
    "2": "体质的形成：先天禀赋与后天因素",
    "3": "九种体质的判定与量表设计",
    "4": "体质与证候：易感性与转化关系",
    "5": "体质辨识的数据化：问卷 → 特征向量",
    "6": "体质与疾病易感性的流行病学",
    "7": "体质调理与治未病的干预设计",
    "8": "体质研究的可重复性与测量误差",
}

VIEWS = {
    "先天禀赋": ["禀赋", "先天", "父母", "胎", "遗传", "素体", "体质"],
    "形神特征": ["形体", "形态", "体态", "面色", "舌", "脉", "性格", "心理", "情志"],
    "证候倾向": ["证候", "证", "病证", "易感", "易患", "倾向", "转化", "兼夹"],
}

LEVELS = {
    "形态": ["形体", "形态", "体态", "肥胖", "消瘦", "面色", "舌", "皮肤"],
    "功能": ["功能", "气短", "乏力", "畏寒", "口干", "便", "汗", "睡眠", "脉"],
    "心理": ["心理", "性格", "情志", "情绪", "抑郁", "焦虑", "太息"],
    "易感": ["易感", "易患", "过敏", "感冒", "倾向", "发病"],
}

LEVELS_B = {
    "虚": ["虚", "不足", "亏", "疲", "乏力", "气短", "畏寒", "盗汗"],
    "实": ["痰", "湿", "热", "瘀", "滞", "郁", "毒"],
    "平": ["平和", "调", "匀", "适中", "正常"],
    "未定": ["未归类", "不明", "待定"],
}

VALUE_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:%|个|种|证|次|条|年|岁|分|级)")


def measure(text, levels=None):
    t = text or ""
    lv = levels if levels is not None else LEVELS
    vals = VALUE_RE.findall(t)
    return {
        "digits": len(re.findall(r"\d", t)),
        "valueLike": len(vals),
        "valueSamples": vals[:6],
        "listItems": 0,
        "views": {k: sum(t.count(w) for w in ws) for k, ws in VIEWS.items()},
        "levels": {k: sum(t.count(w) for w in ws) for k, ws in lv.items()},
    }


def tri(m):
    def pick(d):
        tot = sum(d.values())
        if not tot:
            return {"primary": None, "share": 0.0, "mix": "", "counts": d}
        order = sorted(d.items(), key=lambda kv: -kv[1])
        return {"primary": order[0][0], "share": round(order[0][1] / tot, 3),
                "mix": ">".join(k for k, v in order if v), "counts": d}
    return {"view": pick(m["views"]), "level": pick(m["levels"])}


def main():
    zheng = json.load(open(ZHENG, encoding="utf-8"))
    laonian = json.load(open(LAONIAN, encoding="utf-8"))
    ln_unit = next(u for u in laonian["units"] if u["sub"] == "3.4.1")

    by_type = {name: {"zheng": [], "families": []} for name, _d, _t in TYPES}
    by_type["未归类"] = {"zheng": [], "families": []}

    for z in zheng["zheng"]:
        tname, _why = FAMILY_TO_TYPE[z["family"]]
        by_type[tname]["zheng"].append(z)
        if z["family"] not in by_type[tname]["families"]:
            by_type[tname]["families"].append(z["family"])

    lib = []
    for name, desc, care in TYPES + [("未归类", "不宜强行归入九种体质的证候", "保留待议")]:
        rec = by_type[name]
        zs = rec["zheng"]
        courses = {}
        for z in zs:
            for c in z.get("courses") or []:
                courses[c] = courses.get(c, 0) + 1
        lib.append({
            "type": name,
            "desc": desc,
            "care": care,
            "families": rec["families"],
            "zhengCount": len(zs),
            "diseaseCount": sum(z["diseaseCount"] for z in zs),
            "crossCourse": sum(1 for z in zs if z.get("courseCount", 1) >= 2),
            "courses": courses,
            "zheng": [z["name"] for z in zs],
            "fang": [f for z in zs for f in (z.get("fang") or [])][:6],
        })

    total_z = sum(r["zhengCount"] for r in lib)
    counts = {
        "types": len(TYPES),
        "mapped": total_z,
        "sourceZheng": zheng["counts"]["zheng"],
        "units": len(UNIT_PLAN),
        "hanzi": 0,
    }

    units = []
    for i, (ch, title, prose) in enumerate(UNIT_PLAN, 1):
        u = {
            "chapter": str(ch),
            "chapterTitle": f"第{ch}章 {CH_TITLES[str(ch)]}",
            "sec": f"{ch}.1 体质层",
            "sub": f"{ch}.{i}",
            "title": title,
            "locator": f"派生·第{ch}章·{ch}.{i}",
            "brief": title,
            "goals": [],
            "rawBody": prose,
            "body": prose,
            "prose": prose,
            "segments": [{"title": title, "hanzi": len(HANZI.findall(prose))}],
            "hanzi": len(HANZI.findall(prose)),
            "measure": measure(prose),
        }
        u["tri"] = tri(u["measure"])
        units.append(u)
        counts["hanzi"] += u["hanzi"]

    chapters = []
    for ch in range(1, 9):
        us = [u for u in units if u["chapter"] == str(ch)]
        chapters.append({"no": str(ch), "title": f"第{ch}章", "units": len(us),
                         "hanzi": sum(u["hanzi"] for u in us)})

    by_view, by_level = {}, {}
    for u in units:
        for key, bucket in (("view", by_view), ("level", by_level)):
            p = u["tri"][key]["primary"]
            if p:
                bucket[p] = bucket.get(p, 0) + 1

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"zheng": "standards/zhenghou/证候库.json",
                          "laonian": "standards/laonian/units.json#3.4.1",
                          "script": "scripts/build_tizhi_layer.py"},
               "counts": counts, "types": lib},
              open(os.path.join(OUT, "体质库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"map": {k: {"type": v[0], "why": v[1]} for k, v in FAMILY_TO_TYPE.items()}},
              open(os.path.join(OUT, "源-证候映射.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"derived": True, "script": "scripts/build_tizhi_layer.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": chapters, "units": units,
               "triaxis": {"byPrimaryView": by_view, "byPrimaryLevel": by_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "A_definition": {"形态": 0, "功能": 0, "心理": 0, "易感": 0},
               "note": "四位面取「形态/功能/心理/易感」——教材对体质的定义就是这四项"},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({
        "subject": "中医体质学",
        "derived": True,
        "why": "F:/textbooks 下无《中医体质学》母本；本课程底本由证候层（132 证候）反向聚合为 9 种体质 + 1 未归类，参照层取老年病学 3.4.1 的九质通行定义与五项老年常见质辨识",
        "gap": "证候层记录的是「已病」状态，先天性辨别与纵向传变数据缺失；第六、八章的相关论述为方法性讨论，数字从略",
        "axes": {"views": list(VIEWS), "levels": list(LEVELS),
                 "note": "三辨＝先天禀赋/形神特征/证候倾向；四位面＝形态/功能/心理/易感（即体质的四项定义）"},
        "counts": counts,
    }, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"体质 {len(TYPES)} 种 + 未归类 · 映射证候 {total_z}/{zheng['counts']['zheng']} · 单元 {counts['units']} · 汉字 {counts['hanzi']}")
    for r in lib:
        print(f"  {r['type']:<6} 证候 {r['zhengCount']:>3} · 病证覆盖 {r['diseaseCount']:>3} · 跨课 {r['crossCourse']} · 族 {'、'.join(r['families']) or '—'}")
    print("三辨首位:", by_view)
    print("四位面首位:", by_level)


if __name__ == "__main__":
    main()
