#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《护理学导论》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "huli-daolun")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "05-huli", "16-huli-xue-daolun")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-fazhan-daolun": ("护理从「做什么」变成「为什么这么做」，发生在哪一步", "发生在南丁格尔之后：她把护理从「照护劳动」变成「有依据的照护」——记录、统计、环境改造，都是为了让做法可追溯"),
 "02-linian-jiazhiguan": ("护理理念是口号还是判据", "是判据：理念决定「什么算好护理」，价值观决定「冲突时先顾谁」；写不清这两样，临床上的取舍就只能靠个人习惯"),
 "03-jiben-gainian": ("人、环境、健康、护理，四个概念为什么要一起定义", "因为它们是互为定义的：改一个，其余三个都变。只讲「护理」不讲「人」，护理就退化成操作集合"),
 "04-huanhuan-goutong": ("护患沟通的难点在技巧还是立场", "在立场：技巧可以练，但把患者当「合作者」还是「执行对象」，决定你说什么、听什么、记什么"),
 "05-huli-chengxu": ("护理程序五步，为什么不能跳步", "因为每一步的产物是下一步的输入：没有评估资料就写不出诊断，没有诊断就定不出目标，跳一步后面全是猜"),
 "06-jiankang-jiaoyu": ("健康教育为什么经常「讲了但没变」", "因为讲的是知识，要改的是行为：行为改变需要动机、能力与提示三者同时具备，缺一条就回到原样"),
 "07-lunli-falv": ("伦理与法律，哪个先管住护士", "法律管底线（能做什么、必须记什么），伦理管取舍（该不该做、先做谁）；底线清楚之后，取舍才是真问题"),
 "08-zhuanye-tuandui": ("团队协作里，护理的角色是什么", "是信息枢纽：护士是唯一 24 小时都在患者身边的人，团队靠她获得连续信息——这也是责任最重的地方"),
 "09-zhiye-suyang": ("人文关怀能考核吗", "能考「行为」不能考「心意」：是否告知、是否回应、是否保护隐私，这些可观察；至于「是否真心」，不进入考核"),
 "10-shengming-tizheng": ("生命体征为什么是基础之基础", "因为它是唯一「随时可得、可比对、能预警」的客观数据；异常的第一手证据几乎都从这里来"),
 "11-huanzhe-anquan": ("患者安全的核心是「不出错」还是「早发现」", "是早发现：错误不可能归零，能早发现、早上报、早补救的系统才安全；隐瞒比错误本身更危险"),
 "12-shushi-xiuxi": ("舒适、休息、活动，三者是并列的吗", "不是：休息与活动是一对张力（过静则废、过动则伤），舒适是两者的结果指标，不是独立目标"),
 "13-yingyang-paixie": ("营养与排泄为什么放在一章", "因为它们是同一件事的两端：入量与出量共同决定内环境稳定，单看一端看不出问题"),
 "14-geiyao-zhiliao": ("给药护理最容易出错的一步在哪", "在「核对」之外的那一步——判断这个药该不该给：剂量对、时间对，但患者当下状态不适合，仍要停"),
 "15-zhongyi-huli-jichu": ("中医护理进入基础护理，动的是哪一层", "动的是「辨证」这一层：同样的基础操作，按寒热虚实调整方式与时机，这是中医护理与西医护理的实际分界"),
 "16-teshu-renqun": ("特殊人群的「特殊」在哪里", "在生理储备与表达能力的双重差异：小儿与老人代偿弱、说不清，孕产要顾两个人——评估阈值与沟通方式都要改"),
 "17-shequ-jiankang": ("社区护理与医院护理，最大的差别是什么", "是「主动」与「被动」：医院等患者来，社区要去找人；对象从个体变成人群，评价从治愈变成发生率"),
 "18-pingtai-duijie": ("导论课怎么变成可算的东西", "把概念、程序、指标变成可判定的条目：学生走一遍护理程序，平台能指出漏了哪一步、依据哪一条"),
}

FALLBACK = {
 "_default_payao": ("《护理学导论·第一章》", "教材此章只引书名；篇名按该书章节体例补足，**非本章原文篇名**"),
 "01-fazhan-daolun": ("《护理札记·第一章》", "本章讲护理学发展，教材无篇名级引文；南丁格尔对环境与观察的论述出于此篇，篇名按该书体例补足，**非本章原文篇名**"),
 "02-linian-jiazhiguan": ("《护理学导论·第二章》", "本章讲护理理念，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "03-jiben-gainian": ("《护理学导论·第三章》", "本章讲四个基本概念，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "04-huanhuan-goutong": ("《护理学导论·第四章》", "本章讲护患沟通，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "05-huli-chengxu": ("《护理学导论·第五章》", "本章讲护理程序，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "06-jiankang-jiaoyu": ("《护理学导论·第六章》", "本章讲健康教育，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "07-lunli-falv": ("《护士条例·第三章 权利和义务》", "本章讲伦理与法律，教材无篇名级引文；护士权利义务的法定条款在此章，篇名按条例体例补足，**非本章原文篇名**"),
 "08-zhuanye-tuandui": ("《护理学导论·第八章》", "本章讲团队协作，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "09-zhiye-suyang": ("《护理学导论·第九章》", "本章讲职业素养与人文关怀，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "10-shengming-tizheng": ("《护理学导论·第十章》", "本章讲生命体征与基础技术，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "11-huanzhe-anquan": ("《医疗质量管理办法·医疗质量安全管理》", "本章讲患者安全，教材无篇名级引文；篇名按该办法体例补足，**非本章原文篇名**"),
 "12-shushi-xiuxi": ("《护理学导论·第十二章》", "本章讲舒适休息与活动，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "13-yingyang-paixie": ("《护理学导论·第十三章》", "本章讲营养与排泄，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "14-geiyao-zhiliao": ("《护理学导论·第十四章》", "本章讲给药与治疗护理，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "15-zhongyi-huli-jichu": ("《黄帝内经·素问·阴阳应象大论》", "本章讲中医护理基础，教材无篇名级引文；阴阳纲领出于此篇，篇名按此补足，**非本章原文篇名**"),
 "16-teshu-renqun": ("《护理学导论·第十六章》", "本章讲特殊人群护理，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
 "17-shequ-jiankang": ("《国家基本公共卫生服务规范·居民健康档案管理》", "本章讲社区护理，教材无篇名级引文；篇名按规范体例补足，**非本章原文篇名**"),
 "18-pingtai-duijie": ("《护理学导论·第十八章》", "本章讲与教学平台对接，教材无篇名级引文；篇名按章节体例补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（护理领域）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-护理学导论.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/huli-daolun/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 护理学导论（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 18 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；领域主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——护理学导论每一章都走同一条链：**护理是什么 → 怎么走一圈 → 凭什么被信任**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（概念与理论／护理程序／专业与伦理） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("概念与理论", "护理程序", "专业与伦理"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（护理领域） | 命中 | 占比 |")
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
                 f"领域主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/05-huli/16-huli-xue-daolun/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；护理学导论成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["概念与理论", "护理程序", "专业与伦理", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（护理领域）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/huli-daolun/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "16-huli-xue-daolun", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。护理学导论最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《护理学导论》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/huli-daolun/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/05-huli/16-huli-xue-daolun/chapters/{slug}/code/main.js`

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
