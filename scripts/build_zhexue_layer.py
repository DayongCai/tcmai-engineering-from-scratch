#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhexue_layer.py —— 中医哲学史：范畴在文本中的分布（派生底本）

没有母本教材（`F:/textbooks/` 下无《中医哲学史》）。哲学史最怕两件事：编年表、贴标签。
本课程的做法是把「哲学范畴」当成可检索的词，在**本库已有的经典全文**里数它的分布：

  语料 A：《黄帝内经》全文（素问 81 篇 + 灵枢 81 篇，491,884 汉字）
  语料 B：伤寒 1,760 条 / 金匮 402 条 / 温病 630 条（合计 2,792 条）

产出 standards/zhexue/：
  范畴库.json   12 个范畴 ×（内经命中、三部命中、内经 Top 篇）
  units.json    10 个单元（8 章），供 scaffold 现算
  METHOD.json   派生规则、口径、缺口
  axis-probe.json 三辨／四位面候选实测

口径：
  三辨＝范畴 / 文本依据 / 医学转用（一个哲学词如何变成医学词）
  四位面＝本体 / 关系 / 方法 / 心身（中医哲学能被医学化的四个层面）
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEIJING = os.path.join(ROOT, "standards", "materials", "neijing-quanwen",
                       "黄帝内经全文（素问81篇 · 灵枢81篇）.md")
P = {
    "shanghan": os.path.join(ROOT, "standards", "shanghan", "底本.json"),
    "jingui": os.path.join(ROOT, "standards", "jingui", "底本.json"),
    "wenbing": os.path.join(ROOT, "standards", "wenbing", "底本.json"),
}
OUT = os.path.join(ROOT, "standards", "zhexue")
HANZI = re.compile(r"[\u4e00-\u9fff]")
HEAD = re.compile(r"^##\s*([素灵])问?·(.+?)（《(素问|灵枢)》第(\d+)篇）\s*$")
HEAD2 = re.compile(r"^##\s*(素问|灵枢)·(.+?)（.*第(\d+)篇）\s*$")

CATS = [
    ("气", ["气"], "本体：万物的质料与动力"),
    ("道", ["道"], "本体：不可名而可循的秩序"),
    ("天地", ["天", "地"], "关系：人之上的两个坐标"),
    ("阴阳", ["阴阳", "阴", "阳"], "关系：两分与互根"),
    ("五行", ["五行"], "关系：分类与生克"),
    ("四时", ["四时", "春", "夏", "秋", "冬"], "关系：时间结构"),
    ("形神", ["形", "神"], "心身：形与神的分合"),
    ("志意", ["志", "意", "心"], "心身：情志与心神"),
    ("常变", ["常", "变"], "方法：常道与变局"),
    ("顺逆", ["逆", "顺"], "方法：顺治与逆治"),
    ("标本", ["标本", "本", "标"], "方法：先后与缓急"),
    ("权衡", ["权衡", "权衡", "察"], "方法：度量的思维"),
]

UNIT_PLAN = [
    (1, "哲学史研究什么：范畴，不是年表",
     "中医哲学史不是人物年表，而是范畴史：气、道、阴阳、五行、天人、形神、常变、标本——这些词在文本里出现多少次、在哪些篇最密、后来怎样变成医学词。本课程只用两类材料：本库的《黄帝内经》全文（162 篇）与三部经典（2,792 条）。不做「某家某派主张」的转述，因为那需要原书；只做「某范畴在文本中如何分布」的统计，因为这可复算。"),
    (1, "两部语料的规模与用法",
     "《黄帝内经》全文 162 篇、491,884 汉字，是中医哲学最集中的文本；伤寒、金匮、温病共 2,792 条，是医学化的文本。两部语料的区别正是本课程的主线：**哲学词在《内经》里是论说，在临床经典里是操作**。同一「气」字，在《内经》里讲的是天地之气，在《伤寒论》里讲的是营卫之气。"),
    (2, "气与道：本体论的两个词",
     "「气」是可分的质料，「道」是不可名的秩序。两者的关系决定了中医本体论的性格：**气是内容，道是形式**。这一章要回答的是：为什么中医讲「气」而不讲「物质」？因为气兼有质料与动力两义，用「物质」翻译会丢掉动力。"),
    (3, "阴阳：从现象到范畴",
     "阴阳最初是日照的向背，后来成为两分与互根的范畴。它在文本中的分布能说明一件事：**阴阳不是一对固定的实体，而是一组关系**。所以同一脏可以分阴阳，同一证可以分阴阳，同一药也可以分阴阳——关系的两端随对象变。"),
    (4, "五行：分类还是生成",
     "五行有两种读法：分类（把万物归为五类）与生成（相生相克的动态）。中医主要用后者：**五行讲的是关系网，不是物种表**。这一章的关键是分清「归类」与「传变」：归类是静态的，传变是动态的，临床用的是后者。"),
    (5, "天人相应：人与环境的关系模型",
     "天人相应常被简化为「顺应四时」，实际它是一个关系模型：**人以天地为参数**。四时、五方、气候都进入诊断与治法。这一章要说明的是：这个模型的边界在哪里——它能解释季节性发病，但不能解释个体差异。"),
    (6, "形神与心身：医学里的心身问题",
     "中医的形神观是「形为神之宅，神为形之主」。这句话的价值在于它同时承认两件事：**神依赖形，神也能病形**。于是一个纯心理的问题可以治形，一个纯形体的问题也可以治神——这正是本课程与精神病学、老年病学的接点。"),
    (7, "常变与权衡：辨证思维的三条规则",
     "哲学落到临床上就是三条规则：常与变（什么是常态、什么是变局）、逆与顺（正治与反治）、标与本（先后与缓急）。三条都属于「方法」层，但要挂在本体（气）与关系（阴阳五行）之上，并以形神的轻重（心身）定缓急。三条都是**判断的次序问题**，不是知识量的问题。这一章把三条写成可执行的问句。"),
    (8, "范畴的结构化：把哲学词变成可检索的模型",
     "把范畴做成结构化数据，能做三件事：检索（某范畴在哪篇最密）、对照（同一范畴在《内经》与临床经典里的用法差异）、追问（一个词何时从哲学词变成医学词）。不能做的两件事：判定学派归属、评价思想高下。这一条界线，与各家学说同一标准。"),
    (8, "总结：中医哲学的四个层面",
     "本体（气、道）、关系（天地、阴阳、五行、四时）、方法（常变、顺逆、标本、权衡）、心身（形神、志意）——四个层面合起来，就是本课程能用文本支撑的全部范围。超出这个范围的命题（如「中医哲学优于西方哲学」），本课程不作判断。"),
]

VIEWS = {
    "范畴": ["范畴", "概念", "词", "名"],
    "文本依据": ["篇", "条", "文本", "内经", "原文", "命中"],
    "医学转用": ["医", "证", "治", "病", "临床", "转用"],
}

LEVELS = {
    "本体": ["本体", "气", "道", "质料", "秩序"],
    "关系": ["关系", "阴阳", "五行", "天人", "四时"],
    "方法": ["方法", "常变", "顺逆", "标本", "权衡"],
    "心身": ["形神", "形", "神", "心", "志"],
}

VALUE_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:篇|条|次|个|字|%|倍)")


def load_neijing():
    text = open(NEIJING, encoding="utf-8").read()
    pian = []
    cur = None
    for line in text.splitlines():
        m = HEAD.match(line) or HEAD2.match(line)
        if m:
            g = m.groups()
            if len(g) == 4:
                book = g[2]
                cur = {"book": book, "name": g[1], "no": g[3], "lines": []}
            else:
                cur = {"book": g[0], "name": g[1], "no": g[2], "lines": []}
            pian.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
    for p in pian:
        p["text"] = "\n".join(p["lines"])
    return pian


def load_clinical():
    out = []
    d = json.load(open(P["shanghan"], encoding="utf-8"))
    for p in d.get("pian") or []:
        for it in p.get("items") or []:
            out.append(("伤寒", it.get("text") or ""))
    d = json.load(open(P["jingui"], encoding="utf-8"))
    for p in d.get("pian") or []:
        for a in p.get("articles") or []:
            out.append(("金匮", a.get("zhHans") or a.get("zhHant") or ""))
    d = json.load(open(P["wenbing"], encoding="utf-8"))
    for b in d.get("books") or []:
        for sec in b.get("sections") or []:
            for a in sec.get("articles") or []:
                out.append(("温病", a.get("zhHans") or a.get("zhHant") or a.get("text") or ""))
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
    pian = load_neijing()
    clinical = load_clinical()
    nj_text = "\n".join(p["text"] for p in pian)
    cl_text = "\n".join(t for _b, t in clinical)
    nj_hanzi = len(HANZI.findall(nj_text))

    cats = []
    for name, terms, gloss in CATS:
        nj = sum(nj_text.count(w) for w in terms)
        cl = sum(cl_text.count(w) for w in terms)
        ranked = sorted(((p["book"] + "·" + p["name"], sum(p["text"].count(w) for w in terms)) for p in pian),
                        key=lambda kv: -kv[1])
        cats.append({
            "name": name, "gloss": gloss, "terms": terms,
            "neijing": nj, "clinical": cl,
            "per10kNj": round(nj / nj_hanzi * 10000, 1) if nj_hanzi else 0,
            "topPian": [{"pian": k, "count": v} for k, v in ranked[:3] if v > 0],
        })

    counts = {
        "pian": len(pian),
        "neijingHanzi": nj_hanzi,
        "clinicalTiao": len(clinical),
        "cats": len(CATS),
        "units": len(UNIT_PLAN),
        "hanzi": 0,
    }

    titles = {
        1: "哲学史研究什么：范畴，不是年表",
        2: "气与道：本体论的两个词",
        3: "阴阳：从现象到范畴",
        4: "五行：分类还是生成",
        5: "天人相应：人与环境的关系模型",
        6: "形神与心身：医学里的心身问题",
        7: "常变与权衡：辨证思维的三条规则",
        8: "范畴的结构化与四个层面",
    }
    units = []
    for i, (ch, title, prose) in enumerate(UNIT_PLAN, 1):
        u = {
            "chapter": str(ch),
            "chapterTitle": f"第{ch}章 {titles[ch]}",
            "sec": f"{ch}.1 范畴层",
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
    json.dump({"source": {"neijing": os.path.basename(NEIJING),
                          "clinical": "standards/{shanghan,jingui,wenbing}",
                          "script": "scripts/build_zhexue_layer.py"},
               "counts": counts, "cats": cats},
              open(os.path.join(OUT, "范畴库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"derived": True, "script": "scripts/build_zhexue_layer.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": chapters, "units": units,
               "triaxis": {"byPrimaryView": by_view, "byPrimaryLevel": by_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "A_cat": {c["name"]: c["neijing"] for c in cats},
               "note": "四位面取「本体/关系/方法/心身」——中医哲学能被医学化的四个层面"},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({
        "subject": "中医哲学史",
        "derived": True,
        "why": "F:/textbooks 下无《中医哲学史》母本；本课程把 12 个哲学范畴当可检索词，在《黄帝内经》全文（162 篇 / 491,884 汉字）与三部临床经典（2,792 条）里统计分布。",
        "caveat": "词频只说明「这个词在文本里出现多少次」，不说明「这个概念在思想史上的地位」；单字（气、道、阴、阳、常、变）噪声极大，正文必须同时报多字词与单字。",
        "gap": "先秦诸子与宋明理学原著本库未收；「哲学史」的编年与人物线索只能作条理说明，不能作文本论证。",
        "axes": {"views": list(VIEWS), "levels": list(LEVELS),
                 "note": "三辨＝范畴/文本依据/医学转用；四位面＝本体/关系/方法/心身"},
        "counts": counts,
    }, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"内经 {counts['pian']} 篇 / {counts['neijingHanzi']:,} 汉字 · 临床 {counts['clinicalTiao']} 条 · 范畴 {counts['cats']} · 单元 {counts['units']} · 汉字 {counts['hanzi']}")
    for c in cats:
        print(f"  {c['name']:<4} 内经 {c['neijing']:>6} · 临床 {c['clinical']:>5} · 每万字 {c['per10kNj']:>6} · Top {c['topPian'][0]['pian'] if c['topPian'] else '—'}")
    print("三辨首位:", by_view, "四位面首位:", by_level)


if __name__ == "__main__":
    main()
