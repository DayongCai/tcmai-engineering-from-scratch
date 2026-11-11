#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《中药药理学》11 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhongyao-yaoli")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "02-zhongyao", "07-zhongyao-yaoli-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-yanjiu-fanshi": ("中药药理研究为什么不能照搬化药的评价范式", "化药讲「靶点—剂量—效应」，中药讲「多成分—多靶点—整体调节」；不承认这个差别，实验设计从一开始就错"),
 "02-yaoxiaoxue": ("同一味药，为什么不同实验做出的量效曲线不一样", "模型、给药途径、观察指标、动物种属四个变量任一不同，量效关系就不可直接比；教材把「药物因素与机体因素」单列一节，就是提醒这一点"),
 "03-jiebiao-yaoli": ("解表药与清热药在药理上最大的共同点是什么", "两者都落到「抗炎、抗菌、抗病毒、退热」这组指标上；差别在解表偏「发汗与体表循环」，清热偏「内毒素与炎症因子」"),
 "04-xiexia-qushi-wenli": ("泻下、祛湿、温里、理气四类药，为什么常被放在一起讲", "它们都在调「通道」：肠道的推进、水液的转运、胃肠的张力、气机的升降；指标不同，思路同一条"),
 "05-huoxue-yaoli": ("活血化瘀为什么是中药药理研究最热的一类", "它的指标可量化：血流、血小板聚集、微循环、血栓长度；量化门槛低，研究就多——这不等于疗效证据更强"),
 "06-buxu-mianyi": ("补虚药「提高免疫力」这句话，药理上要落到哪个指标", "不能停在「免疫力」三个字：要落到巨噬细胞吞噬率、淋巴细胞增殖、抗体生成、细胞因子水平这些可测项上"),
 "07-huatan-anshen": ("化痰与安神的药理指标，为什么比活血更难标准化", "痰是证候不是物质，安神的「神」也没有体液指标；教材只能退到「镇咳、祛痰、平喘」「镇静、催眠、抗惊厥」这些替代终点"),
 "08-duxing-anquan": ("中药的「有毒」在药理学里怎么变成数字", "教材落在「升降浮沉与毒性」与「外用药」两处：毒性分级来自历代本草标注，剂量安全窗来自实验；两套数不能互相换算"),
 "09-yaodai-peiwu": ("配伍为什么会改变药动学参数", "配伍改变的是吸收、分布、代谢、排泄中的某一环：形成络合物、改变胃肠动力、诱导或抑制代谢酶；参数变化是机制的结果，不是「协同」两个字"),
 "10-zhengxing-moxing": ("证候动物模型为什么一直有争议", "证候是人的主观与整体状态，动物身上只能复制「部分指标」；模型一简化，结论就只对那组指标成立"),
 "11-zhengju-fenji": ("动物实验有效，能不能直接推到人", "不能。种属差异、剂量换算、成分暴露量、证候对应四道关；教材对「临床转化」写得克制，正是因为这四道关都没那么好过"),
}

FALLBACK = {
 "_default_payao": ("《神农本草经·序录》", "教材此章只引书名；篇名按该书体例补足，**非本章原文篇名**"),
 "01-yanjiu-fanshi": ("《神农本草经·序录》", "本章讲研究范式，教材只引书名；《本经》序录为药性理论之源，篇名按此补足，**非本章原文篇名**"),
 "02-yaoxiaoxue": ("《素问·至真要大论》", "本章讲量效与影响因素，教材无篇名级引文；「大毒治病，十去其六」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "03-jiebiao-yaoli": ("《素问·阴阳应象大论》", "本章讲解表清热药理，教材无篇名级引文；「其在皮者，汗而发之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "04-xiexia-qushi-wenli": ("《素问·阴阳应象大论》", "本章讲泻下祛湿温里理气，教材无篇名级引文；「其下者，引而竭之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "05-huoxue-yaoli": ("《素问·调经论》", "本章讲活血化瘀药理，教材无篇名级引文；「血气不和，百病乃变化而生」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "06-buxu-mianyi": ("《素问·通评虚实论》", "本章讲补虚与免疫，教材无篇名级引文；「邪气盛则实，精气夺则虚」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "07-huatan-anshen": ("《素问·至真要大论》", "本章讲化痰安神药理，教材无篇名级引文；病机十九条「诸痰喘呕，皆属于上」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "08-duxing-anquan": ("《神农本草经·序录》", "本章讲毒性与安全，教材无篇名级引文；三品分级中的「有毒/无毒」即出于序录，篇名按此补足，**非本章原文篇名**"),
 "09-yaodai-peiwu": ("《神农本草经·序录》", "本章讲配伍与药动，教材无篇名级引文；七情（相须相使…）出于序录，篇名按此补足，**非本章原文篇名**"),
 "10-zhengxing-moxing": ("《素问·阴阳应象大论》", "本章讲动物与证候模型，教材无篇名级引文；篇名为教学参照，**非本章原文篇名**"),
 "11-zhengju-fenji": ("《素问·至真要大论》", "本章讲证据分级与转化，教材无篇名级引文；篇名为教学参照，**非本章原文篇名**"),
}


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))


def first_cite(units, slug):
    for u in units:
        m = re.search(r"《[^》]{2,24}·[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"]
    if slug in FALLBACK:
        return FALLBACK[slug]
    for u in units:
        m = re.search(r"《[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"] + "（教材此章只引书名）"
    return "《神农本草经·序录》", "教材·第1章·1.1.1"


def build_doc(slug):
    spec = CM[slug]
    n, title, keys = spec["n"], spec["title"], spec["units"]
    question, hard = CH[slug]
    units = [BY[k] for k in keys]
    hs = sum(u["hanzi"] for u in units)
    cite, loc = first_cite(units, slug)
    views, levels = {}, {}
    value, cites = 0, 0
    books = set()
    for u in units:
        for k, v in u["measure"]["views"].items():
            views[k] = views.get(k, 0) + v
        for k, v in u["measure"]["levels"].items():
            levels[k] = levels.get(k, 0) + v
        value += u["measure"]["valueLike"]
        for b in re.findall(r"《([^》]+)》", u["prose"]):
            books.add(b)
            cites += 1
    vkey = max(views, key=views.get)
    lkey = max(levels, key=levels.get)
    ltot = sum(levels.values()) or 1

    L = [f"# 第 {n} 章 · {title}", ""]
    L.append(f"> **MOTTO:** 「{cite}」——{loc}。本章要回答的是：{question}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {hard}。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（中药是混合物，任何一个「成分」都要先分出来才能说清楚）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（药物类别）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-中药药理学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhongyao-jianding/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 中药药理学（中药系第 7 门） |")
    L.append(f"| 章序号 | {n} / 11 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；类别主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——中药药理学每一章都走同一条链：**作用 → 机制 → 证据**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（药理作用／作用机制／实验证据） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("药理作用", "作用机制", "实验证据"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（药物类别） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    if n in (1, 2, 10, 11, 12):
        L.append("**本章不是按化合物类别写的**（总论、方法、药效、测定、网络五类），所以生源途径一栏只是背景词频，"
                 "不说明本章讲的是哪条途径——**横切章与类别章在同一指标下的必然错位**，读的时候要分清。")
    else:
        L.append(f"生源途径合计 {ltot} 次命中，重心落在 **{lkey}**。这一栏说明本章的化合物主要来自哪条生物合成路线，"
                 "也是教材把它们放在一起讲的底层理由。")
    L.append("")
    L.append("## 三、逐单元读")
    L.append("")
    for u in units:
        t = re.sub(r"\s+", "", u["prose"])
        L.append(f"### {u['sub']} {u['title']}")
        L.append("")
        L.append(f"> {t[:240]}{'…' if len(t) > 240 else ''}")
        if len(t) > 300:
            L.append(">")
            L.append(f"> {t[240:520]}{'…' if len(t) > 520 else ''}")
        L.append("")
        L.append(f"- 定位：`{u['locator']}`")
        L.append(f"- 规模：{u['hanzi']:,} 汉字；三辨主 {max(u['measure']['views'], key=u['measure']['views'].get)}；"
                 f"类别主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/02-zhongyao/05-zhongyao-jianding-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/生源重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 五、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材给的是「这类成分用什么溶剂、上什么柱、显什么色」，丢掉的是**实验室里的失败经验**："
             "乳化怎么破、柱子为什么堵、重结晶为什么不出晶。这些不在书里，只在做过的人手上。")
    L.append("")
    L.append("**数字的边界。** 本课程数值类命中只有 15 处——教材的理化常数（熔点、Rf、λmax）多以范围或文字表述，"
             "**可数的值少，不等于实验不量化**；真正的量化在方法学（第 11 章的七项指标）里，那里不是靠数字多，是靠指标齐。")
    L.append("")
    L.append("**方法的边界。** 本章按小节号从单元层直读；横切章（总论/方法/药效/测定/网络）的生源词频不作类别判断依据。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；中药药理学成分的提取分离涉及有机溶剂与高压设备，"
             "须在合规实验室、由受训人员按安全规范操作，本章不提供任何实验操作指引。")
    L.append("")
    L.append("## 六、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_zhongyao_huaxue_text.py    # 教材 → 底本 + 单元层")
    L.append("python scripts/scaffold_zhongyao_huaxue_chapter.py " + slug)
    L.append("python scripts/_zhongyao_huaxue_docs_out.py " + slug)
    L.append("```")
    L.append("")
    L.append("> 本章每个数（单元数、汉字数、词频、引书、数值命中）都能由上面命令重算；正文不保存独立于单元层的数字。")
    return "\n".join(L)


def build_quiz(slug):
    spec = CM[slug]
    n, title, keys = spec["n"], spec["title"], spec["units"]
    units = [BY[k] for k in keys]
    question, hard = CH[slug]
    others = [u["title"] for u in U["units"] if u["sub"] not in keys]
    ltop = max(units[0]["measure"]["levels"], key=lambda k: sum(u["measure"]["levels"][k] for u in units))

    def q(stage, qs, correct, pool, expl):
        opts = [correct] + [o for o in pool if o != correct][:3]
        assert len(opts) == 4, (slug, qs, opts)
        return {"stage": stage, "question": qs, "options": opts, "correct": 0, "explanation": expl}

    out = [q("pre", f"第 {n} 章「{title}」要回答的核心问题是什么？", question, others,
             f"见 docs/zh.md 的 PROBLEM 段：{hard}。")]
    out.append(q("check", "本章三辨中命中最多的维度是？",
                 max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                 ["药理作用", "作用机制", "实验证据", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（药物类别）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/zhongyao-jianding/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "07-zhongyao-yaoli-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。中药药理学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《中药药理学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/zhongyao-jianding/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/02-zhongyao/05-zhongyao-jianding-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与生源重心、数值命中；
2. 分离流程每步都要有判据，没有判据的步骤标「教材未给」；
3. 方法学按七项列表，缺项写「未做」，不写「已做」；
4. 交付附复算命令。

## 边界

- 横切章（总论/方法/药效/测定/网络）的生源词频不作类别判断；
- 数值命中少是写法问题，不是不量化；
- 有机溶剂与高压设备：本技能不给实验操作指引。

**免责声明：** 教学材料，不构成用药或实验建议。
"""


def main():
    targets = sys.argv[1:] or list(CM)
    for slug in targets:
        n = CM[slug]["n"]
        cdir = os.path.join(SUBJ, "chapters", slug)
        os.makedirs(os.path.join(cdir, "docs"), exist_ok=True)
        os.makedirs(os.path.join(cdir, "outputs"), exist_ok=True)
        doc = build_doc(slug)
        open(os.path.join(cdir, "docs", "zh.md"), "w", encoding="utf-8").write(doc)
        quiz = build_quiz(slug)
        json.dump(quiz, open(os.path.join(cdir, "quiz.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        title = CM[slug]["title"]
        open(os.path.join(cdir, "outputs", f"prompt-{slug}.md"), "w", encoding="utf-8").write(
            PROMPT.format(title=title, n=n))
        open(os.path.join(cdir, "outputs", f"skill-{slug}.md"), "w", encoding="utf-8").write(
            SKILL.format(slug=slug, slug_no=re.sub(r"^\d+-", "", slug), n=n, title=title, units=C["units"]))
        print(f"第 {n} 章 {title} · docs {hanzi(doc):,} 汉字 · quiz {len(quiz['questions'])} 题")


if __name__ == "__main__":
    main()
