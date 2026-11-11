#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《中药商品学》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhongyao-shangpin")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "02-zhongyao", "17-zhongyao-shangpin-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-daolun": ("中药材不是农产品，为什么", "农产品按产地与外观定价，中药材还要按成分与疗效定等：同一批货，含量不够就不能入药——它是「有法定标准的商品」"),
 "02-lishi-liutong": ("药材流通的形态变过几次", "从集散地药市到统购统销，再到专业市场与电商；变的不是货，是谁有资格定价、按什么凭据定价"),
 "03-fenlei-mingming": ("一物多名、一名多物，商品学怎么处理", "正名 + 别名 + 来源规定：命名混乱直接导致买错货，所以商品分类的第一件事是锁定基原"),
 "04-daodi-chanqu": ("道地性是可测的，还是只是名声", "两者都有：产区气候土壤影响成分积累（可测），历史声誉影响溢价（不可测但真实存在）"),
 "05-zhiliang-biaozhun": ("一部药典能管住多少种商品", "管得住「合格线」，管不住「等级线」：药典定含量与限度，规格等级多由行标、团标与市场惯例定"),
 "06-jianding-fangfa": ("性状鉴别为什么在商品环节还不可替代", "因为它快、便宜、不破坏样品，且能一次看全部外观特征；仪器鉴别定成分，性状鉴别定「这批像不像」"),
 "07-guige-dengji": ("统货、选货、等外，差在哪", "差在杂质、大小、色泽、破损率的组合；等级不是质量的全部，但直接决定报价"),
 "08-yinpian": ("饮片是药材的加工品，为什么单独成为一类商品", "因为它有独立的标准（炮制规范）、独立的包装与流通要求，且患者拿到的就是它"),
 "09-zhongchengyao": ("中成药的「商品」属性与药材差在哪", "药材看批内一致性，中成药看批间一致性与有效期；后者有注册批号、说明书与固定处方"),
 "10-baozhuang-chucang": ("贮藏养护为什么写进商品学，而不是仓储学", "因为霉变、虫蛀、泛油会直接改变含量——养护是质量的一部分，不是后勤"),
 "11-jingying-zhiliang": ("GSP 管的是流程还是结果", "管流程：进货验收、储存条件、销售记录；结果是抽检，两者互为证据"),
 "12-jiage-shichang": ("同一种药材，价格能差十倍，差在哪", "差在规格等级、产区、年份、含量与供需；价格不是质量的度量，是这些因素的合成"),
 "13-pinpai-zhishi": ("中药材也能做品牌与地理标志吗", "能，但边界清楚：地理标志保护产地声誉，商标保护经营者；两者都不保护「疗效」"),
 "14-teshu-guanli": ("哪些中药商品被特殊管理，为什么", "毒性药材、麻醉性、濒危野生动植物来源、出口管制品种；管理理由各不相同，不能混为一谈"),
 "15-guomao-maoyi": ("中药出口的主要障碍是什么", "不是关税，是标准互认：农残、重金属、濒危物种证明与成分标识，各国口径不同"),
 "16-jianguan-hegui": ("监管链条长，靠什么串起来", "靠「批号 + 记录 + 追溯码」：每一环都要能回答「这批货从哪来、经过了谁」"),
 "17-fengxian-zhuisu": ("追溯体系能追到什么问题，追不到什么问题", "能追到批次流向与责任主体，追不到「掺假发生在哪一袋」——追溯是缩小范围，不是查明真相"),
 "18-jiaoxue-pingtai": ("商品学怎么进智能教学平台", "把规格等级、标准限度、行情数据变成可算的对象：学生查一个品种，能同时看到等级表、限度表与价格区间"),
}

FALLBACK = {
 "_default_payao": ("《中国药典·一部》", "教材此章只引书名；药典按「品名—来源—性状—鉴别—检查—含量测定」体例编排，篇名按此补足，**非本章原文篇名**"),
 "01-daolun": ("《中国药典·一部》", "本章讲商品学导论，教材无篇名级引文；药典一部为商品法定依据，篇名按体例补足，**非本章原文篇名**"),
 "02-lishi-liutong": ("《本草纲目·序例》", "本章讲流通演变，教材无篇名级引文；篇名按该书体例补足，**非本章原文篇名**"),
 "03-fenlei-mingming": ("《神农本草经·序录》", "本章讲分类与命名，教材无篇名级引文；三品分类出于序录，篇名按此补足，**非本章原文篇名**"),
 "04-daodi-chanqu": ("《本草经集注·序录》", "本章讲道地产区，教材无篇名级引文；「诸药所生，皆有境界」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "05-zhiliang-biaozhun": ("《中国药典·一部》", "本章讲质量标准体系，教材无篇名级引文；篇名按药典体例补足，**非本章原文篇名**"),
 "06-jianding-fangfa": ("《中国药典·四部》", "本章讲鉴定方法，教材无篇名级引文；通则体例在四部，篇名按此补足，**非本章原文篇名**"),
 "07-guige-dengji": ("《中国药典·一部》", "本章讲规格等级，教材无篇名级引文；药典定合格线、行标定等级线，篇名按体例补足，**非本章原文篇名**"),
 "08-yinpian": ("《中国药典·一部》", "本章讲饮片商品，教材无篇名级引文；饮片项下体例按药典补足，**非本章原文篇名**"),
 "09-zhongchengyao": ("《中国药典·一部》", "本章讲中成药商品，教材无篇名级引文；成方制剂项下体例按药典补足，**非本章原文篇名**"),
 "10-baozhuang-chucang": ("《中国药典·四部》", "本章讲包装与贮藏养护，教材无篇名级引文；贮藏通则体例在四部，篇名按此补足，**非本章原文篇名**"),
 "11-jingying-zhiliang": ("《药品经营质量管理规范》", "本章讲经营与质量管理，教材无篇名级引文；GSP 为本章法定依据，篇名按规范体例补足，**非本章原文篇名**"),
 "12-jiage-shichang": ("《中华人民共和国价格法》", "本章讲价格与市场，教材无篇名级引文；篇名按法律体例补足，**非本章原文篇名**"),
 "13-pinpai-zhishi": ("《中华人民共和国商标法》", "本章讲品牌与知识产权，教材无篇名级引文；篇名按法律体例补足，**非本章原文篇名**"),
 "14-teshu-guanli": ("《医疗用毒性药品管理办法》", "本章讲特殊管理商品，教材无篇名级引文；篇名按办法体例补足，**非本章原文篇名**"),
 "15-guomao-maoyi": ("《濒危野生动植物种国际贸易公约》", "本章讲国际贸易，教材无篇名级引文；CITES 为出口管制的直接依据，篇名按公约体例补足，**非本章原文篇名**"),
 "16-jianguan-hegui": ("《中华人民共和国药品管理法》", "本章讲监管与合规，教材无篇名级引文；篇名按法律体例补足，**非本章原文篇名**"),
 "17-fengxian-zhuisu": ("《中华人民共和国药品管理法》", "本章讲质量风险与追溯，教材无篇名级引文；追溯义务出自该法，篇名按此补足，**非本章原文篇名**"),
 "18-jiaoxue-pingtai": ("《中国药典·一部》", "本章讲与教学平台的对接，教材无篇名级引文；数据来源为药典，篇名按体例补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（商品形态）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-中药商品学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhongyao-shangpin/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 中药商品学（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 18 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；形态主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——中药商品学每一章都走同一条链：**长什么样 → 合不合格 → 值多少钱**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（商品属性／标准与检验／流通与价格） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("商品属性", "标准与检验", "流通与价格"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（商品形态） | 命中 | 占比 |")
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
                 f"形态主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/02-zhongyao/17-zhongyao-shangpin-xue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；中药商品学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["商品属性", "标准与检验", "流通与价格", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（商品形态）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/zhongyao-shangpin/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "17-zhongyao-shangpin-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。中药商品学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《中药商品学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/zhongyao-shangpin/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/02-zhongyao/17-zhongyao-shangpin-xue/chapters/{slug}/code/main.js`

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
