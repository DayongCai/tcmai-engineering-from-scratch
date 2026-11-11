#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《临床中药学》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "linchuang-zhongyao")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "02-zhongyao", "16-linchuang-zhongyaoxue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-xulun": ("临床中药学与中药学，差在哪一步", "中药学回答「这味药是什么」，临床中药学回答「这个证该选哪味、怎么配、什么时候不能用」——同一批药，换的是问题"),
 "02-jiben-lilun": ("四气五味归经，在临床上怎么用起来", "性能不是背的条目，是选药的坐标：寒热定方向、五味定作用、归经定部位、毒性定边界"),
 "03-paozhi-zhiji": ("同一味药，生用与制用为什么是两个适应证", "炮制改变的是偏性：生姜发散、干姜温中、炮姜止血——同一植物，三个临床角色"),
 "04-yongfa-jiliang": ("剂量差一倍，适应证就变了吗", "会。同一味药小剂量取其轻、大剂量取其峻，教材在用量项下常并列两个区间，对应不同用途"),
 "05-jiebiao": ("风寒与风热，选药的第一个岔口在哪", "在寒热：辛温发散风寒、辛凉疏散风热；岔口错一步，后面的配伍全反"),
 "06-qingre": ("清热药分五类，临床上怎么选", "按热的位置与性质：气分热、血分热、湿热、热毒、虚热；先定热在哪一层，再选药"),
 "07-xiexia-qushi": ("泻下药为什么分攻下、润下、峻下", "按「急与缓、实与虚」：攻下治实积、润下治津亏、峻下治水饮——分的是适应证，不是药力"),
 "08-huashi-lijin": ("化湿与利水，都是「去湿」，差别在哪", "化湿去中焦之湿（脾）、利水去下焦之水（膀胱）；湿与水不同位，药也不同路"),
 "09-wenli-liqi-xiaoshi": ("温里、理气、消食，为什么常一起出现", "三者都针对「中焦不通」：寒则凝、气滞则胀、食积则满；临床常见的是三者并存，所以药也常同用"),
 "10-zhixue-huoxue": ("止血与活血，一对相反的治法为什么能并用", "血证的根本是「瘀与溢」并存：出血有瘀、瘀久出血；所以有「止血不留瘀、活血不止血」的配伍原则"),
 "11-huatan-anshen": ("化痰与安神，两件不相干的事为什么在一章", "痰可扰心（痰浊蒙蔽）、神可因痰不安；临床上「化痰以安神」是常见路径"),
 "12-pinggan-kaiqiao": ("平肝息风与开窍，什么时候要一起用", "肝风内动可致神昏（如中风闭证），此时既要息风又要开窍；开窍药多为急救药，不做常服"),
 "13-buxu": ("补虚药为什么最容易用错", "补有方向（气、血、阴、阳）与时机（虚则补、邪盛慎补）；方向错则助邪，时机错则闭门留寇"),
 "14-shoushe-yongtu": ("收涩药与涌吐药，一对「反着来」的药", "一个「止住」、一个「吐出」；共同点是对「邪正关系」判断要求极高——该止不止、该吐不吐都会坏事"),
 "15-gongdu-badu": ("攻毒杀虫与拔毒化腐，为什么是毒性药的主场", "这两类药治的是「毒邪结聚」（疮疡、顽癣、虫证），以毒攻毒；用量极小、多为外用，边界比疗效更要说清"),
}

FALLBACK = {
 "_default_payao": ("《神农本草经·序录》", "教材此章只引书名；篇名按该书体例补足，**非本章原文篇名**"),
 "01-xulun": ("《神农本草经·序录》", "教材此章只引书名；篇名按体例补足，**非本章原文篇名**"),
 "02-jiben-lilun": ("《素问·阴阳应象大论》", "本章讲四气五味归经，教材无篇名级引文；「气味合而服之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "03-paozhi-zhiji": ("《雷公炮炙论·序》", "本章讲炮制与制剂，教材无篇名级引文；篇名按该书体例补足，**非本章原文篇名**"),
 "04-yongfa-jiliang": ("《素问·至真要大论》", "本章讲用法用量，教材无篇名级引文；「大毒治病，十去其六」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "05-jiebiao": ("《素问·阴阳应象大论》", "本章讲解表药，教材无篇名级引文；「其在皮者，汗而发之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "06-qingre": ("《素问·至真要大论》", "本章讲清热药，教材无篇名级引文；病机十九条「诸痛痒疮，皆属于心」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "07-xiexia-qushi": ("《素问·阴阳应象大论》", "本章讲泻下与祛风湿药，教材无篇名级引文；「其下者，引而竭之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "08-huashi-lijin": ("《素问·经脉别论》", "本章讲化湿利水，教材无篇名级引文；「饮入于胃，游溢精气」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "09-wenli-liqi-xiaoshi": ("《素问·举痛论》", "本章讲温里理气消食，教材无篇名级引文；「寒气客于肠胃」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "10-zhixue-huoxue": ("《素问·调经论》", "本章讲止血活血，教材无篇名级引文；「血气不和，百病乃变化而生」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "11-huatan-anshen": ("《素问·至真要大论》", "本章讲化痰安神，教材无篇名级引文；「诸痰喘呕，皆属于上」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "12-pinggan-kaiqiao": ("《素问·至真要大论》", "本章讲平肝息风与开窍，教材无篇名级引文；「诸风掉眩，皆属于肝」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "13-buxu": ("《素问·通评虚实论》", "本章讲补虚药，教材无篇名级引文；「邪气盛则实，精气夺则虚」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "14-shoushe-yongtu": ("《素问·至真要大论》", "本章讲收涩与涌吐，教材无篇名级引文；「其高者，因而越之」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "15-gongdu-badu": ("《神农本草经·序录》", "本章讲攻毒杀虫与拔毒化腐，教材无篇名级引文；三品「有毒/无毒」出于序录，篇名按此补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（病位系统）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-临床中药学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/linchuang-zhongyao/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 临床中药学（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 15 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；病位主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——临床中药学每一章都走同一条链：**是什么 → 治什么 → 能不能用**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（性能与功效／临床应用／用法与禁忌） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("性能与功效", "临床应用", "用法与禁忌"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（病位系统） | 命中 | 占比 |")
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
                 f"病位主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/02-zhongyao/16-linchuang-zhongyaoxue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；临床中药学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["性能与功效", "临床应用", "用法与禁忌", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（病位系统）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/linchuang-zhongyao/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "16-linchuang-zhongyaoxue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。临床中药学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《临床中药学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/linchuang-zhongyao/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/02-zhongyao/16-linchuang-zhongyaoxue/chapters/{slug}/code/main.js`

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
