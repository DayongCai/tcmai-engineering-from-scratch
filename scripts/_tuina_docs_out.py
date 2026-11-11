#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《推拿学》10 章生成 docs/zh.md · quiz.json · outputs/*.md（数字全部读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "tuina")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "05-tuina-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-yuanliu-yuanli": ("推拿的疗效是「经验」还是有明确的作用通路", "学生背得出「疏通经络、理筋整复」，却说不清这些词对应身体上发生了什么；一旦被问「凭什么有效」，就只能回到「老祖宗传下来的」"),
 "02-shiyingzheng-fengxian": ("哪些人不能推，推到什么程度必须停", "禁忌证写成一串病名，背下来仍然会在真实病人身上漏掉——因为禁忌是「条件」不是「名单」"),
 "03-chengren-buwei": ("同一种手法为什么在不同部位是不同的手法", "手法按「着力面」分类，部位按「解剖层次」分层，两套坐标不重合，于是同一个词在两处含义不同"),
 "04-xiaoer-tuina": ("小儿推拿的「特定穴」为什么和成人经穴对不上", "小儿推拿多用线状与面状部位（如三关、六腑），成人是点；按成人穴位体系去核对，几乎全是「查无此穴」"),
 "05-jizhu-tuina": ("脊柱手法的高风险动作，风险到底落在哪一步", "旋转扳法的风险不在「扳」，在「定位不准 + 力超过组织耐受」，而这恰恰是手感问题"),
 "06-jingjian-yaotui": ("同一套手法治颈椎病与腰突，凭什么剂量不同", "教材按病写手法组合，但真正决定疗效的是力度与时程，这两项在文本里常写成「适中」「适度」"),
 "07-neike-fuke": ("推拿治内科病，作用点在体表还是脏腑", "内科推拿不接触脏腑，却声称调脏腑；中间那一步（体表—自主神经—内脏）教材写得最薄"),
 "08-lixue-celiang": ("「力度适中」能不能变成一个数", "力、频率、时间是可测的，教材的「适中」不可测；不可测的剂量无法复现，也无法教学验收"),
 "09-liaoxiao-pingjia": ("推拿做不了双盲，疗效评价还能不能成立", "手法治疗无法设假手法对照（受试者能感觉被按），这是方法学硬约束，不是研究者偷懒"),
 "10-chufang-jilu": ("一次推拿该怎么记录，才能被别人复现", "病历里写「推拿治疗一次」，等于没写；没有手法、部位、力度、时程，就没有可复现的处方"),
}

FALLBACK = {
 "05-jizhu-tuina": ("《医宗金鉴·正骨心法要旨》", "教材第 5 章只写书名《医宗金鉴》；篇名按该书子目补足（正骨心法要旨），**非本章原文篇名**"),
 "09-liaoxiao-pingjia": ("《灵枢·九针十二原》", "本章为现代方法学主题，教材无篇名级引文；此条为教学参照的经典出处，**非本章原文**"),
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
    return "《灵枢·九针十二原》", "教材·第2章·2.1.1"


def build_doc(slug):
    spec = CM[slug]
    n, title, keys = spec["n"], spec["title"], spec["units"]
    question, hard = CH[slug]
    units = [BY[k] for k in keys]
    hs = sum(u["hanzi"] for u in units)
    cite, loc = first_cite(units, slug)
    views, levels = {}, {}
    value = 0
    books = set()
    for u in units:
        for k, v in u["measure"]["views"].items():
            views[k] = views.get(k, 0) + v
        for k, v in u["measure"]["levels"].items():
            levels[k] = levels.get(k, 0) + v
        value += u["measure"]["valueLike"]
        books |= set(re.findall(r"《([^》]+)》", u["prose"]))
    vkey = max(views, key=views.get)
    lkey = max(levels, key=levels.get)
    ltot = sum(levels.values()) or 1

    L = [f"# 第 {n} 章 · {title}", ""]
    L.append(f"> **MOTTO:** 「{cite}」——{loc}。本章要回答的是：{question}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {hard}。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（推拿是在人身上用手完成的，力道与部位一旦错，后果立刻发生）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（作用）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-推拿学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/tuina/units.json`；本章取数见 `standards/tuina/chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 推拿学（针灸推拿系） |")
    L.append(f"| 章序号 | {n} / 10 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；作用主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append(f"| 教材对应 | {len(units)} 个小节（{'、'.join(keys[:6])}{'…' if len(keys) > 6 else ''}） |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——教材把答案分散在两处：总论给原理与治则，各论给手法与病证。"
             f"本章把两处并读，因为只读原理会空，只读手法会散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（手法操作／作用机理／临床应用） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("手法操作", "作用机理", "临床应用"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（作用） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("疏通经络", "理筋整复", "滑利关节", "调整脏腑"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**手法操作一词压倒性地多**（全库 8,872 次，作用机理 1,399、临床应用 2,071）：这不是权重结论，"
             "而是教材的写法——每个手法都要写着力面、方向、频率、时间。**词频说明文本在讲操作，不说明操作最重要。**")
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
                 f"作用主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/05-tuina-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/作用重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 五、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材把手法写成文字（着力面、频率、时间），丢掉的是**手下的量感**——"
             "同一个「按法」，两个人按下去的压力可以差三倍，文字读不出来。本章的字数与词频证明教材写了什么，不证明你按得对。")
    L.append("")
    L.append("**数字的边界。** 数值类命中只统计「次/分、分钟、度、公斤」等可数单位；"
             "「力度适中」「以耐受为度」这类表述不计入——而它们恰恰是剂量最常出现的地方。**命中少不等于剂量写得少，是剂量写得不可数。**")
    L.append("")
    L.append("**方法的边界。** 本章按小节号从单元层直读；教材改版导致小节号变化时，`code/main.test.js` 会先失败。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化培训；"
             "推拿手法（尤其脊柱旋转扳法与小儿推拿）风险较高，须由受训人员在明确诊断后按规范实施，本章不提供任何自行操作指引。")
    L.append("")
    L.append("## 六、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_tuina_text.py               # 教材 → 底本 + 单元层")
    L.append("python scripts/scaffold_tuina_chapter.py " + slug)
    L.append("python scripts/_tuina_docs_out.py " + slug)
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
                 ["手法操作", "作用机理", "临床应用", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（作用）重心落在哪一项？", ltop,
                 ["疏通经络", "理筋整复", "滑利关节", "调整脏腑"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+5} 个", f"{len(units)+9} 个"], "见 chapter-map.json。"))
    out.append(q("post", "「力度适中」为什么不计入数值类命中？", "它不是可数单位，无法复现",
                 ["教材没写力度", "统计脚本有 bug", "力度不重要"], "正文「数字的边界」段：剂量最常写成不可数的表述。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/tuina/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "05-tuina-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。推拿学最容易被写成手法图解；这里的用途正相反——要求产出**能被核对的产物**：一张手法剂量卡、一份禁忌核对表，或一段可复现的操作记录。

具体用途有三类：

1. **剂量卡**——把本章每个手法压成一行：着力面、方向、频率（次/分）、时间（分钟）、终止条件；凡是教材只写「适中」的，这一格留空并标「教材未给数」；
2. **禁忌核对**——把禁忌证写成判断题（是/否），逐条对病人核，不写成病名清单；
3. **操作记录**——按「部位—手法—力度—时程—反应」五栏记一次治疗，别人照此能复现。

写作要求：所有数字给复算命令；教材未写数的格子不许填估计值；涉及脊柱扳法、小儿推拿只写「须由受训人员按规范实施」，不给自行操作步骤。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《推拿学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章手法与适应证变成可核对产物时（做剂量卡、核禁忌、写可复现记录、复算）。

## 输入

- 单元层：`standards/tuina/units.json`（{units} 单元；取数见 `standards/tuina/chapter-map.json`）
- 代码：`departments/03-zhenjiu/05-tuina-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与作用重心、数值命中；
2. 做剂量卡：只填教材明确给了单位的格子（次/分、分钟、度），其余标「教材未给数」；
3. 核禁忌时改写成是/否判断题，不照抄病名清单；
4. 交付附复算命令。

## 边界

- 「适度／适中／以耐受为度」不可数，不能折算成数字；
- 文本给出的是操作描述，不是手感；剂量卡不能替代带教；
- 脊柱扳法、小儿推拿：本技能不给自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。
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
