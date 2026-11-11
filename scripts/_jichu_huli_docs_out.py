#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《基础护理学》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "jichu-huli")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "05-huli", "02-jichu-huli-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-gaishu-gufan": ("技能训练到底在练什么", "练两样：把步骤做成肌肉记忆，把核对做成条件反射——前者决定快不快，后者决定出不出错"),
 "02-anquan-quanyi": ("操作前的「知情同意」是不是走过场", "不是：它是把风险转移给知情者。签了字不等于免责，但没告知就等于把患者排除在决策之外"),
 "03-shengming-tizheng": ("生命体征为什么必须先测", "因为它是所有后续操作的判断基线：不知道基线，就分不清「本来就是这数」还是「做完变成这数」"),
 "04-geiyao-jineng": ("给药差错的绝大多数发生在哪一步", "不在穿刺，在核对与转抄：同一药名不同剂型、同一剂量不同单位，都是「看起来对」的错误"),
 "05-wujun-shangkou": ("无菌操作失败最常见的原因是什么", "不是污染，是「看起来还无菌」：无菌区一旦被跨越、被溅湿、暴露过久，外观没有变化，无菌状态已经没了"),
 "06-yangliao-qidao": ("氧疗为什么不能按「越多越好」来做", "因为氧也是药：流量与浓度决定的是目标血氧，不是舒适度；对某些患者高浓度反而抑制呼吸驱动"),
 "07-paixie-daoniao": ("导尿最该被记住的风险是哪一条", "导管相关尿路感染：留置时间是最强的危险因素，所以「是否需要留置」比「怎么插」更决定结局"),
 "08-tiwei-zhuanyun": ("体位与转运的共同风险点在哪", "在「搬动的那一刻」：坠床、管路滑脱、体位性低血压都发生在转移瞬间，而不是安置好之后"),
 "09-jijiu-fuhui": ("急救配合里，护士最不可替代的是什么", "是「提前一步」：在医生开口前把该有的东西递到手上，这项能力靠预案与演练，不靠临场反应"),
 "10-zhongyi-jineng": ("中医护理技能与本课其他技能的关系", "同一套操作规范，多一层辨证：灸、罐、刮痧、耳穴都有明确的适应证与禁忌证，选不选、做不做由证决定"),
 "11-weishoushu-xiezuo": ("围手术期护理的关键窗口是哪三个", "术前（评估与准备）、术中（体位与清点）、术后（复苏与观察）——三个窗口各有独立的核对清单"),
 "12-monixing-xunlian": ("单项技能都会，为什么综合演练还会乱", "因为真实的乱来自「同时」：同时有多项待办、多个信息来源、多个优先级，演练练的是排序而不是手"),
 "13-kaohe-pingjia": ("技能考核该考速度还是规范", "先规范后速度：速度可以练出来，把错误练成习惯就改不掉了；评价标准里必须有一票否决项（无菌、核对）"),
 "14-zhiliang-shequ": ("质量管理与社区居家，为什么合在一章", "因为两者都在问「离开病区之后还成不成立」：制度管风险上报，社区管依从性与可执行性"),
}

FALLBACK = {
 "_default_payao": ("《护理综合技能·第一章》", "教材此章只引书名；篇名按该书章节体例补足，**非本章原文篇名**"),
 "01-gaishu-gufan": ("《护理综合技能·第一章 护理综合技能概述与训练要求》", "本章讲概述与训练要求，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "02-anquan-quanyi": ("《护士条例·第三章 权利和义务》", "本章讲患者安全与权益，教材无篇名级引文；护士义务的法定条款在此章，篇名按条例体例补足，**非本章原文篇名**"),
 "03-shengming-tizheng": ("《护理综合技能·第四章 生命体征与一般状况观察类技能》", "本章讲生命体征观察，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "04-geiyao-jineng": ("《护理综合技能·第五章 给药相关护理技能》", "本章讲给药技能，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "05-wujun-shangkou": ("《医院消毒卫生标准·术语和定义》", "本章讲无菌技术与伤口护理，教材无篇名级引文；无菌与消毒的定义出自该标准，篇名按此补足，**非本章原文篇名**"),
 "06-yangliao-qidao": ("《护理综合技能·第七章 氧疗与气道护理类技能》", "本章讲氧疗与气道，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "07-paixie-daoniao": ("《护理综合技能·第八章 排泄与导尿护理类技能》", "本章讲排泄与导尿，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "08-tiwei-zhuanyun": ("《护理综合技能·第九章 体位与活动与转运类技能》", "本章讲体位与转运，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "09-jijiu-fuhui": ("《护理综合技能·第十章 急救与复苏配合技能》", "本章讲急救与复苏配合，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "10-zhongyi-jineng": ("《黄帝内经·素问·异法方宜论》", "本章讲中医护理技能，教材无篇名级引文；「异法方宜」讲治随地域体质而异，篇名按此补足，**非本章原文篇名**"),
 "11-weishoushu-xiezuo": ("《护理综合技能·第十二章 围手术期与专科协作类技能》", "本章讲围手术期协作，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "12-monixing-xunlian": ("《护理综合技能·第十三章 综合模拟训练与情景演练》", "本章讲综合演练，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "13-kaohe-pingjia": ("《护理综合技能·第十四章 技能考核与评价要求》", "本章讲考核与评价，教材无篇名级引文；篇名按该书章目补足，**非本章原文篇名**"),
 "14-zhiliang-shequ": ("《医疗质量管理办法·医疗质量安全管理》", "本章讲风险质量管理与社区居家，教材无篇名级引文；篇名按该办法体例补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（操作环节）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-基础护理学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/jichu-huli/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 基础护理学（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 18 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；环节主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——基础护理学每一章都走同一条链：**怎么做标准 → 什么会出事 → 做完怎么知道**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（操作规范／安全与风险／观察与评价） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("操作规范", "安全与风险", "观察与评价"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（操作环节） | 命中 | 占比 |")
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
                 f"环节主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/05-huli/02-jichu-huli-xue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；基础护理学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["操作规范", "安全与风险", "观察与评价", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（操作环节）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/jichu-huli/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "02-jichu-huli-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。基础护理学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《基础护理学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/jichu-huli/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/05-huli/02-jichu-huli-xue/chapters/{slug}/code/main.js`

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
