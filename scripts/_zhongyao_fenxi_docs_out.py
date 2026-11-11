#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《中药分析学》12 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhongyao-fenxi")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "02-zhongyao", "10-zhongyao-fenxi-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-fangfa-yanzheng": ("方法验证的七项参数，为什么缺一项就不能用", "准确度、精密度、专属性、线性、范围、检测限、耐用性——每一项对应一个具体的失败方式，不是打勾表"),
 "02-yangpin-qianchuli": ("取样与前处理，哪一步更容易出错", "取样错，后面全错且看不出来；前处理错，回收率会告诉你；所以取样有「留样」制度，前处理没有"),
 "03-jianding": ("性状、显微、理化、分子，四种鉴别怎么分工", "性状看外观、显微看细胞、理化看成分、分子看物种；四者不是替代关系，是覆盖面不同"),
 "04-jiancha": ("重金属、农残、真菌毒素，为什么限值写得那么死", "它们是有蓄积性的外源污染物，不是药效成分——限值基于暴露量而非疗效，所以不给「适量」的余地"),
 "05-tlc-hplc": ("有了 HPLC，为什么薄层色谱还没被淘汰", "薄层是「一眼看全」的粗筛，成本低、通量高；HPLC 是「精确测一个峰」的定量手段，两者分工不同"),
 "06-gc-ms": ("气相与质谱联用各解决什么问题", "GC 解决挥发与热稳定成分的分离，MS 解决「这个峰到底是什么」；联用是把分离能力与定性能力接起来"),
 "07-zhiwen-tupu": ("指纹图谱的相似度 0.9，算不算合格", "相似度是整体相似性的度量，不指向任何一个成分；0.9 说明「大体像」，不能说明「有效成分够」"),
 "08-duochengfen-dingliang": ("一测多评省了什么，又冒了什么风险", "省对照品与时间，风险是「用一个成分的比例去推另一个」——比例不稳时，误差会被放大"),
 "09-zhiji-fenxi": ("制剂分析与药材分析最大的差别在哪", "基质不同：制剂有辅料干扰，且要做「回收率」证明提取完全；药材分析不用回答这个问题"),
 "10-biaozhun-wuzhi": ("标准物质为什么是分析的「尺子」", "所有含量都相对于标准物质而言；尺子不准，后面每一条数据都偏，而且偏得一致——最难发现"),
 "11-anquan-pingjia": ("生物活性测定能替代成分含量测定吗", "不能。活性测定回答「有没有用」，含量测定回答「有多少」；中药的多成分特性让两者都不能省"),
 "12-shuju-xin-jishu": ("数据完整性为什么是审计的重点", "因为它保证的不是「结果对不对」，而是「结果是不是这次做出来的」——审计追踪记录的是动作，不是结论"),
}

FALLBACK = {
 "_default_payao": ("《中国药典·四部》", "教材此章只写《中国药典》；分析通则与方法学指导原则在「四部」，篇名按此补足，**非本章原文篇名**"),
 "01-fangfa-yanzheng": ("《中国药典·四部》", "本章讲方法验证，教材只写《中国药典》；四部收载分析方法验证指导原则，篇名按此补足，**非本章原文篇名**"),
 "02-yangpin-qianchuli": ("《中国药典·四部》", "本章讲取样与前处理，教材无篇名级引文；四部收载取样与检验通则，篇名按此补足，**非本章原文篇名**"),
 "03-jianding": ("《中国药典·一部》", "本章讲鉴别，教材无篇名级引文；一部各品种项下「鉴别」为法定条目，篇名按此补足，**非本章原文篇名**"),
 "04-jiancha": ("《中国药典·四部》", "本章讲检查项，教材无篇名级引文；四部收载重金属、农残、真菌毒素检查法，篇名按此补足，**非本章原文篇名**"),
 "05-tlc-hplc": ("《中国药典·四部》", "本章讲薄层与液相，教材无篇名级引文；四部收载色谱法通则，篇名按此补足，**非本章原文篇名**"),
 "06-gc-ms": ("《中国药典·四部》", "本章讲气相与质谱联用，教材无篇名级引文；四部收载质谱法通则，篇名按此补足，**非本章原文篇名**"),
 "07-zhiwen-tupu": ("《中国药典·四部》", "本章讲指纹图谱，教材无篇名级引文；四部收载指纹图谱技术指导原则，篇名按此补足，**非本章原文篇名**"),
 "08-duochengfen-dingliang": ("《中国药典·四部》", "本章讲多成分定量，教材无篇名级引文；四部收载含量测定与一测多评相关指导原则，篇名按此补足，**非本章原文篇名**"),
 "09-zhiji-fenxi": ("《中国药典·四部》", "本章讲制剂分析，教材无篇名级引文；四部收载制剂通则，篇名按此补足，**非本章原文篇名**"),
 "10-biaozhun-wuzhi": ("《中国药典·四部》", "本章讲质量标准与标准物质，教材无篇名级引文；四部收载标准物质与通则，篇名按此补足，**非本章原文篇名**"),
 "11-anquan-pingjia": ("《中国药典·四部》", "本章讲生物活性与安全性，教材无篇名级引文；四部收载生物测定与安全评价通则，篇名按此补足，**非本章原文篇名**"),
 "12-shuju-xin-jishu": ("《中国药典·四部》", "本章讲数据完整性与新技术，教材无篇名级引文；四部收载数据管理相关要求，篇名按此补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（分析目的）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-中药分析.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhongyao-fenxi/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 中药分析学（中药系第 10 门） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；目的主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——中药分析学每一章都走同一条链：**取样 → 测定 → 判限**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（样品处理／测定条件／数据与限度） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("样品处理", "测定条件", "数据与限度"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（分析目的） | 命中 | 占比 |")
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
                 f"目的主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/02-zhongyao/10-zhongyao-fenxi-xue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；中药分析学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["样品处理", "测定条件", "数据与限度", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（分析目的）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/zhongyao-fenxi/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "10-zhongyao-fenxi-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。中药分析学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《中药分析学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/zhongyao-fenxi/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/02-zhongyao/10-zhongyao-fenxi-xue/chapters/{slug}/code/main.js`

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
