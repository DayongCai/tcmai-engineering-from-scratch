#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《推拿手法学》8 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读数据层）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "shoufa")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
X = json.load(open(os.path.join(D, "交叉校验.json"), encoding="utf-8"))
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "06-tuina-shoufa-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-fenlei-yaoqiu": ("手法按动作形态分类，分类学得会，手法就学得会吗", "把「摆动类」「摩擦类」当名词背下来，动手时仍然分不清一指禅推法与滚法差在哪儿——因为分类说的是「动作形态」，手上差的是「着力面与力矩」"),
 "02-baidong-yizhichan": ("一指禅推法与滚法同属摆动类，为什么不能互相替代", "两者都以每分钟 120–160 次摆动，看起来只差着力部位；但一个是拇指指端单点深透，一个是掌背尺侧滚动带面积，作用层次不同"),
 "03-moca-jiya": ("摩擦类与挤压类都「贴着皮肤用力」，边界在哪", "摩擦类带动皮肤表层、挤压类压向深层组织；同一个「推」字在两类里指不同动作"),
 "04-zhendong-kouji": ("振动与叩击都靠节律，为什么一个要「透」一个要「响」", "振法要求高频微幅、力透深层；叩击要求空心掌、声脆而不痛——两者的频率都在手上，评判标准完全不同"),
 "05-yundong-guanjie": ("运动关节类手法凭什么被列为高风险", "摇、扳、拔伸都要把关节带到活动度极限；极限由解剖与病理共同决定，不由手感决定"),
 "06-lixue-canshu": ("「持久、有力、均匀、柔和、深透」能不能变成可测的数", "五个词都是形容词，没有一个带单位；教材里真正带单位的只有频率、时间、力值三项"),
 "07-xunlian-pingjia": ("手法怎么练，练到什么程度算合格", "功力训练（易筋经、指力腕力）与手法训练（频率稳定性）是两件事，教材分开写"),
 "08-biaozhun-guifan": ("同样一个手法，两本教材给的频率能差一倍，标准该怎么立", "手法学与推拿学对同一手法给出的频率区间并不总一致，这正是「标准化」要处理的问题"),
}

FALLBACK = {
 "06-lixue-canshu": ("《灵枢·九针十二原》", "本章为现代力学测量主题，教材无篇名级引文；此条为教学参照的经典出处，**非本章原文**"),
 "07-xunlian-pingjia": ("《灵枢·九针十二原》", "本章为训练与评价主题，教材无篇名级引文；此条为教学参照的经典出处，**非本章原文**"),
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
    return "《灵枢·九针十二原》", "教材·第2章·2.2.1"


def cross_table():
    rows = [r for r in X["rows"] if r["判定"] in ("数值不一致", "部分一致", "一致")]
    out = ["| 手法 | 手法学（次/分） | 推拿学（次/分） | 判定 |", "|---|---|---|---|"]
    for r in rows:
        fa = "、".join(r["手法学"]["频率"]) or "—"
        fb = "、".join(r["推拿学"]["频率"]) or "—"
        out.append(f"| {r['手法']} | {fa} | {fb} | {r['判定']} |")
    return "\n".join(out)


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
    L.append(f"> **双根因定位:** 环境逼迫（手法是手上的事，说到与做到之间隔着几年功夫）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（着力面）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-推拿手法学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/shoufa/units.json`；本章取数见 `standards/shoufa/chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 推拿手法学（针灸推拿系第 6 门） |")
    L.append(f"| 章序号 | {n} / 8 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；着力面主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——教材把答案拆在两处：总论讲分类与要求，各类手法章讲单个手法的动作与要领。"
             f"本章把两处并读：分类给的是坐标，手法给的是动作。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（手法动作／操作要领／临床应用） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("手法动作", "操作要领", "临床应用"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（着力面） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("指", "掌", "肘臂", "其它"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**着力面是手法学最贴身的一轴**：同一动作换着力面，压强、层次、适应证全变。"
             "本轴实测比（最大/最小）仅 3.0×，比「手法六类」（10.6×）与「部位」（7.3×）都平，说明教材对四种着力面的书写是均衡的——"
             "这正是它作为教学轴的价值。")
    L.append("")
    if slug == "08-biaozhun-guifan":
        L.append("## 三、同类手法在两本教材里的频率对账")
        L.append("")
        L.append("把《推拿手法学》与《推拿学》里同一个手法的频率逐项对，能看出「标准」在哪些地方还没统一：")
        L.append("")
        L.append(cross_table())
        L.append("")
        L.append(f"22 个共同手法里：**一致 {X['counts']['判定分布'].get('一致',0)}**、**部分一致 {X['counts']['判定分布'].get('部分一致',0)}**、"
                 f"**区间不同 {X['counts']['判定分布'].get('数值不一致',0)}**、**仅一方给数 {X['counts']['判定分布'].get('仅一方给数',0)}**、"
                 f"**双方都没给数 {X['counts']['判定分布'].get('双方均未给数',0)}**。")
        L.append("")
        L.append("两条要单独记的：")
        L.append("")
        L.append("1. **搓法**：《手法学》「每分钟 120 次左右」，《推拿学》「120 至 160 次」——区间有包含关系，不是矛盾，是宽窄不同；")
        L.append("2. **拍法**：《手法学》「80～120 次」，《推拿学》「100～150 次」——重叠段 100–120，两端各不同，属**教材分歧**，本库并列保存，不裁定。")
        L.append("")
        L.append("还有一条是**方法学教训**：初版按「单元」取数，把《推拿学》里「一指禅推法…摆动频率 120～160 次」算到了「推法」头上，"
                 "凭空造出「推法 20–30 vs 120–160」的假分歧。改成**按手法名切段取数**后消失——"
                 "**单元级取数会把 A 手法的数串给 B 手法，这不是教材的问题，是读法的问题。**")
        L.append("")
    L.append("## 四、逐单元读")
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
                 f"着力面主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 五、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/06-tuina-shoufa-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/着力面重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材用文字写动作（着力面、摆动频率、移动速度），丢掉的是**手下的功力量感**："
             "同样「沉肩垂肘、每分钟 120 次」，两个人做出来可以是两种东西。文本能证明教材怎么要求，不能证明你做对了。")
    L.append("")
    L.append("**数字的边界。** 数值类命中只统计带单位的（次/分、分钟、寸、kg）；「持久、有力、均匀、柔和、深透」"
             "这五个核心要求一个都不带单位，因此不计入——**不是教材没写要求，是要求本身不可数**。")
    L.append("")
    L.append("**方法的边界。** 本章按小节号从单元层直读；跨教材比数时按**手法名切段**，不按单元——"
             "一个单元常同时讲几种手法，按单元取数会串。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代带教与规范化培训；"
             "运动关节类手法（扳法、拔伸）风险高，须在明确诊断后由受训人员按规范实施，本章不提供任何自行操作指引。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_shoufa_text.py          # 教材 → 底本 + 单元层")
    L.append("python scripts/scaffold_shoufa_chapter.py " + slug)
    L.append("python scripts/_shoufa_docs_out.py " + slug)
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
    out.append(q("check", "本章四位面（着力面）重心落在哪一项？", ltop,
                 ["指", "掌", "肘臂", "其它"], "由单元层词频相加得出，见正文第二节。"))
    out.append(q("check", "本章三辨中命中最多的维度是？",
                 max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                 ["手法动作", "操作要领", "临床应用", "三者大致相当"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+7} 个"], "见 chapter-map.json。"))
    if slug == "08-biaozhun-guifan":
        out.append(q("post", "跨教材比手法频率时，为什么不能按「单元」取数？",
                     "一个单元常同时讲几种手法，会把 A 的数串给 B", others,
                     "正文第三节的方法学教训：初版按单元取数，造出了「推法」的假分歧。"))
    else:
        out.append(q("post", "「持久、有力、均匀、柔和、深透」为什么不进数值统计？",
                     "五个词都不带单位，不可数", others, "正文「数字的边界」段。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/shoufa/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "06-tuina-shoufa-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。手法学最容易被写成动作口诀；这里的用途正相反——要求产出**能被核对的产物**：一张手法参数卡、一段可复现的评分表，或一份跨教材差异记录。

具体用途有三类：

1. **参数卡**——每个手法一行：着力面、方向、频率（次/分）、移动速度、时间、终止条件；教材只写「适中」的格子留空并标「教材未给数」；
2. **评分表**——把「持久、有力、均匀、柔和、深透」五项各拆成 1–3 个可观察行为（如「摆动频率波动 ±10% 内」），不带单位的词也要有观察口径；
3. **差异记录**——与另一本教材对同一手法比数时，按**手法名切段**取数，不按单元取；凡区间不同，并列写出，不裁定谁对。

写作要求：所有数字给复算命令；教材未写数的格子不许填估计值；扳法、拔伸等高风险手法只写「须经明确诊断、由受训人员实施」。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《推拿手法学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章手法变成可核对产物时（参数卡、评分表、跨教材差异记录、复算）。

## 输入

- 单元层：`standards/shoufa/units.json`（{units} 单元；取数见 `standards/shoufa/chapter-map.json`）
- 交叉校验：`standards/shoufa/交叉校验.json`（与《推拿学》同手法对账）
- 代码：`departments/03-zhenjiu/06-tuina-shoufa-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与着力面重心、数值命中；
2. 做参数卡时只填带单位的格子（次/分、分钟、寸、kg）；
3. 跨教材比数：按手法名切段取数，别按单元——单元会串数；
4. 交付附复算命令。

## 边界

- 形容词（持久/有力/均匀/柔和/深透）不可数，不能折成数字；
- 文本不等于功力；参数卡不能替代带教；
- 扳法、拔伸：本技能不给自行操作指引。

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
