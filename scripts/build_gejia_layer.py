#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_gejia_layer.py —— 中医各家学说：从「本库已有的经典文本」派生的学派层

没有母本教材（`F:/textbooks/` 下无《中医各家学说》），因此本课程不虚构原文，只做三件事：
  1. 学派的关键概念词，拿到本库**已结构化的经典条文**里做命中统计
     （伤寒 1,760 条 / 金匮 402 条 / 温病 630 条，共 2,792 条）；
  2. 把每个学派与**证候层的族**挂钩（证候 132 / 族 14），看它的主张落在哪些证候上；
  3. 输出「学派 ×（条文命中 / 证候关联 / 跨度）」矩阵，供第 8 章的对照阅读用。

⚠ 口径（写进 METHOD 的 why，不许淡化）：
  关键词命中是**词面统计**，不是学派归属判定；同一个「火」字可能出自不同语境。
  因此本课程只说「该词在条文中的分布」，不说「这些条文属于某派」。

产出 standards/gejia/：
  学派库.json   8 个学派 ×（关键概念、命中条数、分书命中、关联族、证候数）
  units.json    10 个单元（8 章），供 scaffold 现算
  METHOD.json   派生规则、口径、缺口
  axis-probe.json 三辨／四位面候选实测

口径：
  三辨＝学术主张 / 文本依据 / 后世影响
  四位面＝理论 / 方药 / 病机 / 传承（一个学派能被核查的四个维度）
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = {
    "shanghan": os.path.join(ROOT, "standards", "shanghan", "底本.json"),
    "jingui": os.path.join(ROOT, "standards", "jingui", "底本.json"),
    "wenbing": os.path.join(ROOT, "standards", "wenbing", "底本.json"),
    "zhenghou": os.path.join(ROOT, "standards", "zhenghou", "证候库.json"),
}
OUT = os.path.join(ROOT, "standards", "gejia")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 学派：关键概念词（用于条文命中）+ 关联证候族（用于证候层统计）
SCHOOLS = [
    {
        "key": "liu-wansu", "name": "刘完素（河间学派）", "主张": "六气皆从火化，主寒凉",
        "terms": ["火", "热", "燥", "寒凉", "六气"],
        "families": ["热毒", "血热", "湿热"],
        "dynasty": "金",
    },
    {
        "key": "zhang-congzheng", "name": "张从正（攻邪学派）", "主张": "病由邪生，攻邪已病，汗吐下三法",
        "terms": ["汗", "吐", "下", "邪", "攻"],
        "families": ["热毒", "痰湿", "血瘀"],
        "dynasty": "金",
    },
    {
        "key": "li-gao", "name": "李杲（补土学派）", "主张": "内伤脾胃，百病由生；升阳益气",
        "terms": ["脾胃", "中气", "升阳", "饮食", "劳倦", "阴火"],
        "families": ["气虚", "痰湿"],
        "dynasty": "金元",
    },
    {
        "key": "zhu-zhenheng", "name": "朱震亨（滋阴学派）", "主张": "阳有余阴不足，相火妄动；滋阴降火",
        "terms": ["阴虚", "相火", "痰", "湿热", "降火"],
        "families": ["阴虚", "湿热", "痰湿"],
        "dynasty": "元",
    },
    {
        "key": "zhang-jingyue", "name": "张景岳（温补学派）", "主张": "阳非有余，真阴不足；温补命门",
        "terms": ["命门", "元阳", "真阴", "温补", "水火"],
        "families": ["阳虚", "阴虚", "气虚"],
        "dynasty": "明",
    },
    {
        "key": "ye-tianshi", "name": "叶天士（温病学派）", "主张": "卫气营血辨证，透邪养阴",
        "terms": ["卫", "气", "营", "血", "逆传", "舌绛", "透"],
        "families": ["血热", "热毒", "阴虚"],
        "dynasty": "清",
    },
    {
        "key": "wang-qingren", "name": "王清任（活血学派）", "主张": "治病之要诀在明气血，主逐瘀",
        "terms": ["瘀", "血", "气", "逐瘀", "通窍"],
        "families": ["血瘀", "气滞"],
        "dynasty": "清",
    },
    {
        "key": "zhang-xichun", "name": "张锡纯（汇通学派）", "主张": "衷中参西，重镇潜阳与大气下陷",
        "terms": ["大气", "镇", "肝", "西", "参西"],
        "families": ["气虚", "阴虚", "血瘀"],
        "dynasty": "清末民国",
    },
]

UNIT_PLAN = [
    (1, "学派形成的三个条件", "学派不是凭空出现的，它需要三个条件同时具备：地域（同一地区的病种与药材）、师承（文本与口传的传递链）、以及一个可被记住的主张。金元四大家的出现，与宋金对峙、北方疫病频发、印刷术普及三件事同时发生有关——教材层面能说的是「条件」，不能说的是「必然」。本课程把「条件」留在文字里，把「可核查的证据」留给条文统计：本库能提供的是三部经典的 2,792 条原文，不能提供的是各派的门人谱系。"),
    (1, "本库可核查的三部经典", "本库已结构化三部经典：伤寒 1,760 条、金匮 402 条（含 174 方）、温病 630 条（温病条辨 290、温热论 37、温疫论 303）。这三部合起来是本课程唯一的一手材料：任何「某派主张」的说法，都要能在这 2,792 条里找到落点，否则只能标注为「后世转述」。"),
    (2, "刘完素：六气皆从火化", "刘完素的贡献是把「火」从诸邪之一提升为转化终点：六气皆能化火，故治多寒凉。核查方式不是读他的原书（本库未收《素问玄机原病式》），而是看「火／热／燥」在经典条文里的分布——它说明「热」在经典文本中占多大比重，从而说明这一主张为何有号召力。这一节明确写：命中不等于归属。"),
    (3, "张从正：汗吐下三法", "张从正的立场是「病由邪生，邪去正安」，故以汗吐下为纲。可核查的部分是「汗／吐／下」在条文中的分布：这三字在《伤寒论》里出现的密度，正好解释了攻邪派为何以伤寒方为基本盘。不可核查的部分是他的医案与门人。"),
    (4, "李杲：内伤脾胃，百病由生", "李杲把外感与内伤分开，指出内伤脾胃者亦可发热——「阴火」由此而来。可核查的是「脾胃／中气／升阳／劳倦」的条文分布，以及证候层里气虚族的规模（17 证，22 次病证覆盖）。这一节的价值在于：把一个学派的主张落到一个可数的证候群上。"),
    (5, "朱震亨：阳有余阴不足", "朱震亨的「相火」不是实火而是妄动之火，故治以滋阴降火。可核查的是「阴虚／相火／痰」的分布，与证候层阴虚族（18 证，32 次病证覆盖）的规模。他与刘完素的分歧常被简化为「寒凉 vs 滋阴」，实际两者都承认热，分歧在「热的来源」。"),
    (6, "张景岳：温补命门", "张景岳与朱震亨针锋相对：阳非有余，真阴亦不足，故主温补。他的关键概念是命门与真阴真阳——这不是玄谈，而是把「虚」分成了「阳虚」与「阴虚」两路。可核查的是证候层阳虚族（7 证）与阴虚族（18 证）的不对称：教材里阴虚证远多于阳虚证，这一不对称本身值得讨论。"),
    (7, "叶天士：卫气营血", "叶天士把温病分成卫、气、营、血四层，并指出「逆传心包」这条跳过气分的路径。可核查的是温病三部 630 条里「卫／气／营／血／逆传／舌绛」的分布，以及证候层血热族（10 证）与热毒族（14 证）。这一节要说明：四层不是四个证，而是四个「位置」。"),
    (8, "对照阅读：把八个学派放进一张表", "各家学说的最后一课不是记住八个名字，而是能做对照：同一问题（热从何来、虚在何处、邪该攻还是该留），八派各有答案。本章要求把八派的主张、条文命中、关联证候填进同一张矩阵，并回答三个问题：哪些主张互相矛盾？矛盾能否用「病种不同」解释？哪些主张已被今天的数据支持或削弱？"),
    (8, "结构化：学派对比能做什么、不能做什么", "把学派做成结构化数据，能做三件事：检索（谁的条文命中最多）、对照（同一概念的分布差异）、谱系（谁引谁）。不能做两件事：判定归属（词面命中不等于思想归属）、评价高下（数据只能显示分布，不能显示对错）。这一条界线，是本课程与「中医科普」的分界。"),
]

VIEWS = {
    "学术主张": ["主张", "论", "说", "学派", "观点", "立论"],
    "文本依据": ["条文", "原文", "经典", "条", "篇", "本库"],
    "后世影响": ["影响", "后世", "传承", "门人", "发展", "沿用"],
}

LEVELS = {
    "理论": ["理论", "论", "说", "概念", "主张"],
    "方药": ["方", "药", "汤", "剂", "治法"],
    "病机": ["病机", "虚", "热", "火", "痰", "瘀", "邪"],
    "传承": ["传承", "师承", "门人", "后世", "影响"],
}

VALUE_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:条|篇|证|部|家|个|次|年|%|倍)")


def texts_of(path, kind):
    """把三部经典摊平成 [(label, text)]"""
    out = []
    d = json.load(open(path, encoding="utf-8"))
    if kind == "shanghan":
        for pian in d.get("pian") or []:
            for it in pian.get("items") or []:
                out.append((f"伤寒·{pian.get('pian','')}", it.get("text") or ""))
    elif kind == "jingui":
        for pian in d.get("pian") or []:
            for a in pian.get("articles") or []:
                out.append((f"金匮·{pian.get('nameSimp') or pian.get('name','')}",
                            a.get("zhHans") or a.get("zhHant") or ""))
    else:
        for b in d.get("books") or []:
            for sec in b.get("sections") or []:
                for a in sec.get("articles") or []:
                    out.append((f"温病·{b.get('titleSimp') or b.get('title','')}",
                                a.get("zhHans") or a.get("zhHant") or a.get("text") or ""))
    return out


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
    corpora = {}
    for kind, path in (("shanghan", P["shanghan"]), ("jingui", P["jingui"]), ("wenbing", P["wenbing"])):
        try:
            corpora[kind] = texts_of(path, kind)
        except Exception as exc:  # 温病结构可能不同，缺了也要留痕
            corpora[kind] = []
            print(f"[warn] {kind} 读取失败: {exc}")

    zheng = json.load(open(P["zhenghou"], encoding="utf-8"))
    fam = {}
    for z in zheng["zheng"]:
        fam.setdefault(z["family"], []).append(z)

    lib = []
    for s in SCHOOLS:
        per_book = {}
        total = 0
        for kind, items in corpora.items():
            n = sum(1 for _lbl, t in items if any(w in t for w in s["terms"]))
            per_book[kind] = n
            total += n
        zs = [z for f in s["families"] for z in fam.get(f, [])]
        lib.append({
            "key": s["key"], "name": s["name"], "claim": s["主张"], "dynasty": s["dynasty"],
            "terms": s["terms"], "families": s["families"],
            "hits": per_book, "hitsTotal": total,
            "zhengCount": len(zs),
            "diseaseCount": sum(z["diseaseCount"] for z in zs),
            "crossCourse": sum(1 for z in zs if z.get("courseCount", 1) >= 2),
        })

    counts = {
        "schools": len(SCHOOLS),
        "corpus": {k: len(v) for k, v in corpora.items()},
        "corpusTotal": sum(len(v) for v in corpora.values()),
        "units": len(UNIT_PLAN),
        "hanzi": 0,
    }

    units = []
    for i, (ch, title, prose) in enumerate(UNIT_PLAN, 1):
        u = {
            "chapter": str(ch),
            "chapterTitle": f"第{ch}章 {'' }".strip(),
            "sec": f"{ch}.1 学派层",
            "sub": f"{ch}.{i}",
            "title": title,
            "locator": f"派生·第{ch}章·{ch}.{i}",
            "brief": title,
            "goals": [],
            "rawBody": prose, "body": prose, "prose": prose,
            "segments": [{"title": title, "hanzi": len(HANZI.findall(prose))}],
            "hanzi": len(HANZI.findall(prose)),
            "measure": measure(prose),
        }
        u["tri"] = tri(u["measure"])
        units.append(u)
        counts["hanzi"] += u["hanzi"]

    titles = {
        1: "学派的形成：地域、师承与文本",
        2: "刘完素与火热论",
        3: "张从正与攻邪论",
        4: "李杲与脾胃论",
        5: "朱震亨与滋阴论",
        6: "张景岳与温补学派",
        7: "叶天士与温病学派",
        8: "学派观点的对照阅读与结构化",
    }
    for u in units:
        u["chapterTitle"] = f"第{u['chapter']}章 {titles[int(u['chapter'])]}"

    chapters = []
    for ch in range(1, 9):
        us = [u for u in units if u["chapter"] == str(ch)]
        chapters.append({"no": str(ch), "title": f"第{ch}章 {titles[ch]}",
                         "units": len(us), "hanzi": sum(u["hanzi"] for u in us)})

    by_view, by_level = {}, {}
    for u in units:
        for key, bucket in (("view", by_view), ("level", by_level)):
            p = u["tri"][key]["primary"]
            if p:
                bucket[p] = bucket.get(p, 0) + 1

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"corpora": {k: v for k, v in counts["corpus"].items()},
                          "zheng": "standards/zhenghou/证候库.json",
                          "script": "scripts/build_gejia_layer.py"},
               "counts": counts, "schools": lib},
              open(os.path.join(OUT, "学派库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"derived": True, "script": "scripts/build_gejia_layer.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": chapters, "units": units,
               "triaxis": {"byPrimaryView": by_view, "byPrimaryLevel": by_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "A_school": {s["key"]: s["hitsTotal"] for s in lib},
               "note": "四位面取「理论/方药/病机/传承」——一个学派能被核查的四个维度"},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({
        "subject": "中医各家学说",
        "derived": True,
        "why": "F:/textbooks 下无《中医各家学说》母本；本课程不虚构原文，只做词面统计：学派关键概念在 2,792 条经典条文中的分布，并挂钩证候层的族。",
        "caveat": "关键词命中是词面统计，不是学派归属判定；同一「火」字可能出自不同语境。本课程只说分布，不说归属。",
        "gap": "各派原书（《素问玄机原病式》《儒门事亲》《脾胃论》《格致余论》《景岳全书》《温热论》《医林改错》《医学衷中参西录》）本库未收；门人与谱系无数据，第 1 章相关论述为条理性说明。",
        "axes": {"views": list(VIEWS), "levels": list(LEVELS),
                 "note": "三辨＝学术主张/文本依据/后世影响；四位面＝理论/方药/病机/传承"},
        "counts": counts,
    }, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"学派 {counts['schools']} · 语料 {counts['corpusTotal']} 条（伤寒 {counts['corpus']['shanghan']} / 金匮 {counts['corpus']['jingui']} / 温病 {counts['corpus']['wenbing']}）· 单元 {counts['units']} · 汉字 {counts['hanzi']}")
    for s in lib:
        print(f"  {s['name']:<16} 命中 {s['hitsTotal']:>4}（{s['hits']}）· 关联证候 {s['zhengCount']:>3} · 病证 {s['diseaseCount']:>3} · 跨课 {s['crossCourse']}")
    print("三辨首位:", by_view, "四位面首位:", by_level)


if __name__ == "__main__":
    main()
