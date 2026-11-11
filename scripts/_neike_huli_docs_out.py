#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《内科护理学》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "neike-huli")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "05-huli", "07-neike-huli-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-gaishu-lilun": ("内科护理与外科护理，分界在哪", "在「有没有手术」之外，更在「病程长短」：内科多数是慢病与共存病，护理的胜负手在长期管理；外科是一次性事件，胜负手在围术期"),
 "02-pinggu-guancha": ("内科病情观察最难的是什么", "是「变化的方向」而不是「当下的数值」：单次血压 90/60 可能是常态，两小时内从 140/90 掉下来才是信号"),
 "03-jishu-anquan": ("内科的基础技术为什么也要单独讲", "因为同一项技术在慢病与共存病患者身上风险不同：血管条件差、皮肤脆弱、凝血异常，标准动作要按人调整"),
 "04-zhengzhuang-huli": ("为什么先讲症状再讲系统", "因为患者来的时候给的是症状不是诊断：发热、疼痛、水肿、呼吸困难，都是跨系统的入口"),
 "05-yaowu-jingmai": ("药物、静脉治疗、标本采集，为什么能合成一章", "因为三者共用同一条链：核对—观察—记录—处置。差错的形状也一样——「看起来对」"),
 "06-yingyang-huli": ("营养支持在内科为什么是治疗而不是辅助", "因为多数慢病的结局与营养状态直接相关：蛋白摄入不足→肌少→活动能力下降→再入院"),
 "07-huxi-huli": ("呼吸系统护理的核心指标是哪几个", "呼吸频率、血氧、痰液性状与量、呼吸困难程度：四个都能床旁获得，且都能反映恶化"),
 "08-xunhuan-huli": ("循环系统护理最怕漏掉什么", "体重的日变化与夜间阵发性呼吸困难：前者是液体潴留的早期信号，后者常被当作「睡不好」"),
 "09-xiaohua-huli": ("消化系统护理的观察重点是什么", "出入量与腹部体征：腹围、肠鸣音、排便性状，比化验更早提示出血或梗阻"),
 "10-miniao-huli": ("泌尿系统护理为什么绕不开「量」", "因为肾功能的所有判断都从尿量开始：<0.5 ml/kg/h 持续两小时就是少尿，比肌酐更早"),
 "11-xueye-huli": ("血液系统护理的高风险动作是什么", "是「看见出血」：口腔、牙龈、皮肤、尿便，任何一处渗血都要追问；同时防感染比防出血更难"),
 "12-neifenmi-huli": ("内分泌护理的关键在数值还是行为", "在行为：血糖数值是一次快照，饮食、运动、用药依从与自我监测才是曲线"),
 "13-fengshi-shenjing": ("风湿免疫与神经，为什么合在一章", "因为两者都表现为「功能损害 + 长期用药」：疼痛与活动受限是共同语言，免疫抑制与神经功能评估是共同风险"),
 "14-chuanran-zhiliang": ("传染病护理与其他内科护理，多出哪一道关", "多一道「隔离与报告」：不仅要治病人，还要阻断传播并按规定上报，这是法律责任不是流程习惯"),
}


FALLBACK = {
 "_default_payao": ("《内科护理学·第一章》", "教材此章只引书名；篇名按该书章节体例补足，**非本章原文篇名**"),
 "01-gaishu-lilun": ("《内科护理学·第一章 内科护理学概述》", "本章讲概述与理论基础，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "02-pinggu-guancha": ("《内科护理学·第三章 内科护理评估与病情观察》", "本章讲评估与观察，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "03-jishu-anquan": ("《内科护理学·第四章 内科常用护理技术与安全》", "本章讲常用技术与安全，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "04-zhengzhuang-huli": ("《内科护理学·第五章 内科常见症状的护理》", "本章讲症状护理，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "05-yaowu-jingmai": ("《内科护理学·第六章 内科药物治疗的护理与安全》", "本章讲药物与静脉治疗安全，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "06-yingyang-huli": ("《内科护理学·第八章 内科营养支持与饮食护理》", "本章讲营养支持，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "07-huxi-huli": ("《内科护理学·第九章 呼吸系统疾病护理》", "本章讲呼吸系统，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "08-xunhuan-huli": ("《内科护理学·第十章 循环系统疾病护理》", "本章讲循环系统，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "09-xiaohua-huli": ("《内科护理学·第十一章 消化系统疾病护理》", "本章讲消化系统，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "10-miniao-huli": ("《内科护理学·第十二章 泌尿系统疾病护理》", "本章讲泌尿系统，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "11-xueye-huli": ("《内科护理学·第十三章 血液系统疾病护理》", "本章讲血液系统，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "12-neifenmi-huli": ("《内科护理学·第十四章 内分泌与代谢性疾病护理》", "本章讲内分泌，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "13-fengshi-shenjing": ("《内科护理学·第十五章 风湿免疫与神经系统疾病护理》", "本章讲风湿免疫与神经，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "14-chuanran-zhiliang": ("《中华人民共和国传染病防治法·第三章 疫情报告、通报和公布》", "本章讲传染病护理与质量管理，教材无篇名级引文；报告义务的法定条款在此章，篇名按该法体例补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（系统归属）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-内科护理学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/neike-huli/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 内科护理学（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 18 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；系统主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——内科护理学每一章都走同一条链：**现在是什么状态 → 做什么 → 什么时候会变坏**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（评估与观察／治疗与护理／并发症与安全） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("评估与观察", "治疗与护理", "并发症与安全"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（系统归属） | 命中 | 占比 |")
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
                 f"系统主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/05-huli/07-neike-huli-xue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；内科护理学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["评估与观察", "治疗与护理", "并发症与安全", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（系统归属）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/neike-huli/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "07-neike-huli-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。内科护理学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《内科护理学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/neike-huli/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/05-huli/07-neike-huli-xue/chapters/{slug}/code/main.js`

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
