#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《腧穴学》12 章生成 docs/zh.md · quiz.json · outputs/*.md

第 11 章（危险穴位与针刺安全深度）已有手写正文，脚本默认跳过，不覆盖。
穴位表取自 standards/shuxue/穴位库.json（一穴一条），规模与词频取自 units.json。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "shuxue")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
P = json.load(open(os.path.join(D, "穴位库.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "02-shuxue-xue")
BYSUB = {u["sub"]: u for u in U["units"]}

# 章 → (问题, 为什么难, 该章用哪些经的穴位做表)
CH = {
 "01-fenlei-dingwei": ("腧穴的名字与位置是两套系统，先学哪一套", "先把「穴名」背下来、再去找位置，找不准时会以为是手感问题，其实是从一开始就没建立坐标系", []),
 "02-gudu-fencun": ("「一寸」到底有多长，为什么同一个穴位在两个人身上不是一个数", "骨度分寸与手指同身寸并存，学生常问「到底信哪个」——教材给的是两套方法，不是两把尺", []),
 "03-shou-san-yin": ("手三阴经的穴位为什么集中在肘以下", "上肢阴经的分布与经脉循行方向一致，但只背「某某穴在某处」，就说不出为什么大多数要穴在肘腕之间", ["手太阴肺经", "手少阴心经", "手厥阴心包经"]),
 "04-shou-san-yang": ("手三阳经的穴位从手指走到头面，中间哪一段最密", "手三阳在臂部循行浅表，穴位密度与「阳经多气多血」的说法是否对得上，是可以数的", ["手阳明大肠经", "手太阳小肠经", "手少阳三焦经"]),
 "05-zu-san-yang": ("足三阳经为什么穴位最多，头面与躯干的穴位在治什么", "足三阳从足到头，跨度最大；不分部位地背主治，就会把「头面穴治头面病」当成规律", ["足阳明胃经", "足太阳膀胱经", "足少阳胆经"]),
 "06-zu-san-yin": ("足三阴经的穴位为什么比阳经少", "下肢内侧循行深、穴位少，容易被读成「不重要」；实际是解剖与循行共同决定的密度差异", ["足太阴脾经", "足少阴肾经", "足厥阴肝经"]),
 "07-ren-du-xue": ("任督二脉的穴位为什么按脊柱与正中线排布", "任督是单线，穴位数固定，但「同一椎体下」在胖瘦身上差得很远", ["任督二脉"]),
 "08-jingwai-qixue": ("经外奇穴「有名称、有位置、不进十四经」，它凭什么算穴位", "奇穴与阿是穴的边界最模糊：一个是固定位置，一个是「按之痛处」", ["经外奇穴"]),
 "09-teding-xue": ("特定穴的六种类别是六个标签，还是六套用法", "五输、原络、俞募、八会、郄、下合各有各的用法，混成一张表就只剩名词", []),
 "10-zhuzhi-guilv": ("腧穴的主治规律能不能从穴位数据里数出来", "近治、远治、特殊作用三分是教材给的，能不能在自己的数据里复现，是另一回事", []),
 "11-weixian-shendu": ("教材写着「不可深刺」，多深算深", "已有手写正文（不覆盖）", []),
 "12-dingwei-sanwei": ("把穴位定位变成三维坐标，丢掉了什么", "数字化最小单元是「点」，而临床取穴是「面 + 手感」", []),
}


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))


FALLBACK = {
 "07-ren-du-xue": ("《难经·二十八难》", "教材第 16 章述奇经八脉；本章无篇名级引文，此条取奇经总论的经典出处，**非本章原文**"),
 "08-jingwai-qixue": ("《针灸大成·经外奇穴》", "教材 17.1.1 明言「明代《针灸大成》设『经外奇穴』专卷」，篇名按此补足"),
 "12-dingwei-sanwei": ("《灵枢·九针十二原》", "本章为现代主题（数字化与三维模型），无篇名级引文；此条为教学参照的经典出处，**非本章原文**"),
}


def first_cite(units, slug=""):
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
    return "《灵枢·九针十二原》", "教材·第4章·4.1.1"


def pts_of(mers):
    return [p for p in P["points"] if p["经"] in mers]


def build_doc(slug):
    spec = CM[slug]
    n, title = spec["n"], spec["title"]
    question, hard, mers = CH[slug]
    units = [BYSUB[k] for k in spec["units"]]
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
    pts = pts_of(mers)

    L = [f"# 第 {n} 章 · {title}", ""]
    L.append(f"> **MOTTO:** 「{cite}」——{loc}。本章要回答的是：{question}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {hard}。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（取穴是在人身上完成的，位置差一线，疗效差一层）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（部位）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-经络腧穴学.xlsx`；穴位库 `standards/shuxue/穴位库.json`"
             f"（全书 **{P['counts']['points']} 穴**，其中带安全红线 **{P['counts']['pointsWithRedline']}** 穴）；"
             f"单元层 `standards/shuxue/units.json`。本章数字由 `code/main.js` 现算。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 腧穴学（针灸推拿系第 2 门） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；部位主 **{lkey} {levels[lkey]}**；数值 {value} |")
    if pts:
        L.append(f"| 涉及穴位 | **{len(pts)} 穴**（{'、'.join(mers)}） |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——教材把答案放在两处：一处是总论里的方法（分类、命名、骨度分寸），一处是各经的重点穴。"
             f"本章把两处并到一起读，因为只看方法不看穴，方法会空；只看穴不看方法，穴位就成了孤立的坐标。")
    L.append("")
    if pts:
        L.append("## 二、本章穴位表（取自穴位库）")
        L.append("")
        L.append("| 穴名 | 编号 | 部位 | 特定穴 | 安全红线 |")
        L.append("|---|---|---|---|---|")
        for p in pts:
            red = "有" if p["安全红线"] else "—"
            L.append(f"| {p['穴名']} | {p['编号']} | {p['部位'] or '—'} | {p['特定穴'] or '—'} | {red} |")
        L.append("")
        bypos = {}
        for p in pts:
            bypos[p["部位"] or "未判"] = bypos.get(p["部位"] or "未判", 0) + 1
        L.append("**部位分布**：" + "、".join(f"{k} {v} 穴" for k, v in sorted(bypos.items(), key=lambda x: -x[1])) +
                 f"。{len(pts)} 穴中带安全红线 {sum(1 for p in pts if p['安全红线'])} 穴——"
                 "红线不是「危险」的同义词，而是「教材明确写了不可怎样刺」的那些穴。")
        L.append("")
        L.append("## 三、三辨与部位：本章的实测分布")
    else:
        L.append("## 二、三辨与部位：本章的实测分布")
    L.append("")
    L.append("| 三辨（定位／主治／操作） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("定位", "主治", "操作"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 部位（头面颈项／胸腹／背腰／四肢） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("头面颈项", "胸腹", "背腰", "四肢"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**这三个数与四个数都是词频**：定位词多说明教材写位置写得细，不说明这个穴好找；"
             "主治词多说明主治列得长，不说明主治更可靠。")
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
                 f"部位主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 五、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/02-shuxue-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/部位重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 穴位库是一穴一条，丢掉的是「同一穴在不同教材版本里的定位差异」「骨度分寸在个体上的浮动」"
             "以及最重要的——手感。库里的「定位」是文字，不是能扎准的位置。")
    L.append("")
    L.append("**数字的边界。** 部位分布由【定位】文字里的部位词判定，一个穴可能同时出现多个部位词（如「肩」既属上肢又近胸）；"
             "本章取命中最多的一个，这是简化，误差在少数跨越部位的穴上。")
    L.append("")
    L.append("**方法的边界。** 穴位解析依赖「穴名（拼音，编号）」这一锚点。教材四种写法都要认；"
             "若某版教材删掉编号，解析会静默漏穴——`code/main.test.js` 断言穴数，漏了会先失败。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化操作培训；"
             "所涉针刺、艾灸与深度数值仅供教学理解，实际操作须在有资质的机构、由受训人员按规范实施。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_shuxue_layer.py            # 教材 → 穴位库 + 单元层")
    L.append("python scripts/scaffold_shuxue_chapter.py " + slug)
    L.append("python scripts/_shuxue_docs_out.py " + slug)
    L.append("```")
    L.append("")
    L.append("> 本章每个数（单元数、汉字数、穴位表、词频、数值命中）都能由上面命令重算；正文不保存独立于数据层的数字。")
    return "\n".join(L)


def build_quiz(slug):
    spec = CM[slug]
    n, title = spec["n"], spec["title"]
    question, hard, mers = CH[slug]
    units = [BYSUB[k] for k in spec["units"]]
    others = [u["title"] for u in U["units"] if u["sub"] not in spec["units"]]
    pts = pts_of(mers)

    def q(stage, qs, correct, pool, expl):
        opts = [correct] + [o for o in pool if o != correct][:3]
        assert len(opts) == 4, (slug, qs, opts)
        return {"stage": stage, "question": qs, "options": opts, "correct": 0, "explanation": expl}

    out = [q("pre", f"第 {n} 章「{title}」要回答的核心问题是什么？", question, others,
             f"见 docs/zh.md 的 PROBLEM 段：{hard}。")]
    if pts:
        pick = pts[len(pts) // 2]
        out.append(q("check", f"「{pick['穴名']}」的编号是？", pick["编号"],
                     [p["编号"] for p in P["points"] if p["编号"] != pick["编号"]][:3],
                     f"见本章穴位表；数据取自 standards/shuxue/穴位库.json。"))
        out.append(q("check", f"本章穴位表共列出多少穴？", f"{len(pts)} 穴",
                     [f"{len(pts)+3} 穴", f"{len(pts)+7} 穴", f"{len(pts)+12} 穴"],
                     "由 `node code/main.js` 与穴位库现算。"))
    else:
        out.append(q("check", "本章三辨中命中最多的维度是？",
                     max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                     ["定位", "主治", "操作", "三者大致相当"], "见正文的分布表，由单元层现算。"))
        out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                     [f"{len(units)+2} 个", f"{len(units)+5} 个", f"{len(units)+9} 个"],
                     "见 chapter-map.json。"))
    out.append(q("check", "本章数字的来源是哪一层？", "standards/shuxue（穴位库 + 单元层）",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    out.append(q("post", "把「部位词命中最多」直接当穴位归属，风险在哪？",
                 "跨部位的穴会被强行归入一处", ["没有风险", "穴位数会变多", "主治会失效"],
                 "正文「数字的边界」段：部位由【定位】文字判定，跨部位穴是简化误差。"))
    out.append(q("post", "穴位库解析依赖的锚点是什么？", "「穴名（拼音，编号）」这一写法",
                 ["穴名的第一个字", "教材页码", "主治关键词"], "锚点缺失会静默漏穴，测试断言穴数会先响。"))
    return {"lesson": slug, "title": title, "subject": "02-shuxue-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。腧穴学最容易被背成坐标表；这里的用途正相反——要求产出**能被核对的产物**：一张穴位卡、一段取穴流程，或一份安全边界说明。

具体用途有三类：

1. **出题与自测**——用本章穴位表的「穴名—编号—部位—特定穴」四列做连线题，干扰项从其它经取，不用自造穴名；
2. **核对教材**——把本章穴位表与教材原文逐穴对，凡穴位库里有而教材没写定位的，标「教材未写定位」，不要补；
3. **安全边界**——把带「安全红线」的穴单独列一张表，只写教材原话（如「不可向内下深刺」），不加自己的推断。

写作要求：所有数字给复算命令；教材未写的标「教材未写」；涉及针刺、艾灸只写「须由受训人员按规范实施」，不给自行操作步骤与深度建议。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《腧穴学》第 {n} 章「{title}」的穴位库与单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章穴位变成可核对的产物时（出题、核对教材、列安全边界、复算）。

## 输入

- 穴位库：`standards/shuxue/穴位库.json`（{points} 穴，一穴一条）
- 单元层：`standards/shuxue/units.json`（章 → 单元号见 `chapter-map.json`）
- 代码：`departments/03-zhenjiu/02-shuxue-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与部位重心、数值命中；
2. 从穴位库取本章各经的穴，按「穴名—编号—部位—特定穴—安全红线」列成表；
3. 出题时选项取自穴位库真实编号，不用自造；
4. 交付附复算命令；教材未写的字段标「教材未写」。

## 边界

- 部位是由【定位】文字判定的简化结果，跨部位的穴会有误差；
- 穴位库不含手感与个体差异，文字定位≠扎得准；
- 针刺、艾灸与深度：本技能不给自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。
"""


def main():
    targets = sys.argv[1:] or [s for s in CM if s in CH and s != "11-weixian-shendu"]
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
            SKILL.format(slug=slug, slug_no=re.sub(r"^\d+-", "", slug), n=n, title=title, points=P["counts"]["points"]))
        print(f"第 {n} 章 {title} · docs {hanzi(doc):,} 汉字 · quiz {len(quiz['questions'])} 题")


if __name__ == "__main__":
    main()
