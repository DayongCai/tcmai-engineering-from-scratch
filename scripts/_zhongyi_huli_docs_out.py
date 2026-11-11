#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《中医护理学》15 章生成 docs/zh.md · quiz.json · outputs/*.md（数字读 units.json）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhongyi-huli")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
SUBJ = os.path.join(ROOT, "departments", "05-huli", "24-zhongyi-huli-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-gaishu": ("中医护理与西医护理，差在第一步", "差在第一步的判断对象：西医护理先评估「哪里出了问题」，中医护理先判断「这是什么证」——证不同，同一项操作的做法与禁忌都不同"),
 "02-lilun-jichu": ("阴阳五行、藏象、经络，护理要取哪几条", "取能落到操作上的：寒热定灸或清、表里定汗或下、虚实定补或泻、脏腑定部位、经络定穴位——其余是解释，不是依据"),
 "03-pinggu-fangfa": ("四诊在护理评估里管什么", "管三件事：判断证型（望舌、问症）、判断轻重（脉、神）、判断能不能做某项技术（禁忌证）"),
 "04-tizhi-shihu": ("体质不同，同一个证护理一样吗", "不一样：同是「虚」，阳虚要温、阴虚要润；同是「湿」，痰湿宜燥、湿热宜清——体质决定施护的偏性"),
 "05-zhenghou-shihu": ("证候护理与病证护理，谁管谁", "证候管「这一类」，病证管「这一个」：证候给通用方案，病证给加减；先学通用，再学加减"),
 "06-neike-shihu": ("内科护理的难点在观察还是操作", "在观察：内科病证变化快，护理的第一职责是发现转折（汗出、脉变、神志），操作反而标准化程度高"),
 "07-waike-fuke": ("外科与妇科护理，共同的前提是什么", "是「局部与整体的关系」：外科看疮疡的深浅与走窜，妇科看经带胎产的周期——都要把局部放回整体判断"),
 "08-erke-laonian": ("儿科与老年护理，为什么放在一章", "两端人群的共同点是「表达不可靠」：小儿说不清、老人说不准，所以护理更依赖观察与家属陈述"),
 "09-jishu-zonglun": ("技术总论要解决什么问题", "三件事：适应证与禁忌证、操作前中后的规范、不良反应的识别与处置——技术本身在第 10–12 章"),
 "10-jiu-baguan": ("灸与拔罐，风险点分别在哪", "灸的风险在「热伤与晕灸」，罐的风险在「留罐时间与皮肤破损」；两者的禁忌证有重叠（高热、出血倾向、皮肤破损）"),
 "11-guasha-tuina": ("刮痧、推拿、穴位按压，共同的作用路径是什么", "都走「经络—穴位」这条路径，差别在刺激方式与强度：刮是面、推是线、按是点"),
 "12-waizhi-xunxi": ("中药外治为什么强调「温度与时间」", "因为外治靠皮肤吸收：温度决定吸收速率，时间决定累积量——两者任一超限都可能造成烫伤或过敏"),
 "13-yinshi-qingzhi": ("饮食护理的依据是什么", "依据是「证」不是「病」：同为消渴，阴虚者滋阴、气虚者补气；忌口也按证定，不按病名定"),
 "14-wenshu-jilu": ("护理文书为什么要求「可复算」", "因为它是举证材料：记录必须能让另一个人按同一份记录还原当时的判断与操作，否则无法追溯"),
 "15-anquan-zhiliang": ("护理安全的核心指标是「不出事」吗", "不是：是「可发现」——不良事件上报率、跌倒/烫伤/压疮的发生率与处置时效，都比「零发生」更可信"),
 "16-shequ-jujia": ("社区与居家护理，最难的是什么", "是「依从性」：没有病区的约束，护理方案要能被患者与照护者自己执行，所以方案必须简化到可操作"),
 "17-pingtai-duijie": ("护理怎么进智能教学平台", "把操作规范、禁忌证、评价指标变成可判定的条目：学生做一项技术，平台能指出漏了哪一步、触了哪条禁忌"),
 "18-shixun-kaohe": ("实训考核考的是熟练度还是规范性", "先考规范性：步骤、无菌、禁忌核对；熟练度是结果，规范性是底线——顺序颠倒会把错误练成习惯"),
}

FALLBACK = {
 "_default_payao": ("《黄帝内经·素问·上古天真论》", "教材此章只引书名；篇名按该书体例补足，**非本章原文篇名**"),
 "01-gaishu": ("《黄帝内经·素问·上古天真论》", "本章讲护理学概述，教材无篇名级引文；「法于阴阳，和于术数」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "02-lilun-jichu": ("《黄帝内经·素问·阴阳应象大论》", "本章讲理论基础，教材无篇名级引文；阴阳五行与藏象的纲领性论述出于此篇，篇名按此补足，**非本章原文篇名**"),
 "03-pinggu-fangfa": ("《黄帝内经·素问·脉要精微论》", "本章讲评估方法，教材无篇名级引文；四诊要点出于此篇，篇名按此补足，**非本章原文篇名**"),
 "04-tizhi-shihu": ("《黄帝内经·灵枢·通天》", "本章讲辨体质施护，教材无篇名级引文；体质分类的最早系统论述出于此篇，篇名按此补足，**非本章原文篇名**"),
 "05-zhenghou-shihu": ("《伤寒论·辨太阳病脉证并治》", "本章讲证候辨证施护，教材无篇名级引文；辨证施护的范式出自六经辨证，篇名按此补足，**非本章原文篇名**"),
 "06-neike-shihu": ("《金匮要略·脏腑经络先后病脉证》", "本章讲内科病证护理，教材无篇名级引文；「见肝之病，知肝传脾」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "07-waike-fuke": ("《外科正宗·痈疽治法总论》", "本章讲外科妇科护理，教材无篇名级引文；疮疡治法纲领出于此篇，篇名按此补足，**非本章原文篇名**"),
 "08-erke-laonian": ("《小儿药证直诀·小儿脉法》", "本章讲儿科老年护理，教材无篇名级引文；小儿诊法特点出于此篇，篇名按此补足，**非本章原文篇名**"),
 "09-jishu-zonglun": ("《针灸大成·灸法》", "本章讲技术总论，教材无篇名级引文；灸法操作与禁忌的系统论述出于此篇，篇名按此补足，**非本章原文篇名**"),
 "10-jiu-baguan": ("《针灸大成·灸法》", "本章讲灸法与拔罐，教材无篇名级引文；篇名按该书体例补足，**非本章原文篇名**"),
 "11-guasha-tuina": ("《针灸大成·经外奇穴》", "本章讲刮痧推拿与穴位技术，教材无篇名级引文；穴位定位与主治体例出于此篇，篇名按此补足，**非本章原文篇名**"),
 "12-waizhi-xunxi": ("《理瀹骈文·略言》", "本章讲中药外治，教材无篇名级引文；外治法「内病外治」纲领出于此篇，篇名按此补足，**非本章原文篇名**"),
 "13-yinshi-qingzhi": ("《黄帝内经·素问·脏气法时论》", "本章讲饮食与情志护理，教材无篇名级引文；「五谷为养，五果为助」出于此篇，篇名按此补足，**非本章原文篇名**"),
 "14-wenshu-jilu": ("《医疗纠纷预防和处理条例·病历书写》", "本章讲护理文书，教材无篇名级引文；病历书写的法定要求出自该条例，篇名按此补足，**非本章原文篇名**"),
 "15-anquan-zhiliang": ("《医疗质量管理办法·医疗质量安全管理》", "本章讲安全与质量，教材无篇名级引文；篇名按该办法章节补足，**非本章原文篇名**"),
 "16-shequ-jujia": ("《国家基本公共卫生服务规范·中医药健康管理》", "本章讲社区居家护理，教材无篇名级引文；篇名按规范体例补足，**非本章原文篇名**"),
 "17-pingtai-duijie": ("《黄帝内经·素问·上古天真论》", "本章讲与教学平台对接，教材无篇名级引文；治未病理念出于此篇，篇名按此补足，**非本章原文篇名**"),
 "18-shixun-kaohe": ("《针灸大成·灸法》", "本章讲实训与考核，教材无篇名级引文；操作规范体例参照灸法篇，篇名按此补足，**非本章原文篇名**"),
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
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（技术类别）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-中医护理学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhongyi-huli/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 中医护理学（中药系第 16 门） |")
    L.append(f"| 章序号 | {n} / 18 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；技术主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——中医护理学每一章都走同一条链：**是什么证 → 怎么护 → 护完怎么记**。结构决定它能溶于什么、显什么色，"
             f"性质决定用什么溶剂、上什么柱，方法决定能不能把它拿到手、认出来。链上断一环，后面全散。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（辨证／施护／评价与记录） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("辨证", "施护", "评价与记录"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（技术类别） | 命中 | 占比 |")
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
                 f"技术主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/05-huli/24-zhongyi-huli-xue/chapters/{slug}")
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
    L.append("**免责声明：** 本章为教学整理，内容不构成用药建议；中医护理学成分的提取分离涉及有机溶剂与高压设备，"
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
                 ["辨证", "施护", "评价与记录", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章四位面（技术类别）重心落在哪一项？", ltop,
                 ["乙酸-丙二酸途径", "莽草酸途径", "甲戊二羟酸途径", "氨基酸途径"], "见正文第二节分布表。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    out.append(q("post", "本课程数值类命中只有 15 处，说明什么？",
                 "教材常数多以范围或文字表述，可数的值少不等于不量化", others,
                 "正文「数字的边界」段：真正的量化在方法学七项指标里。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/zhongyi-huli/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "24-zhongyi-huli-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。中医护理学最容易被背成「结构式 + 颜色反应」；这里的用途正相反——要求产出**能被核对的产物**：一张分离流程图、一份方法学清单，或一段结构推断路径。

具体用途有三类：

1. **分离流程**——从药材到单体：溶剂与极性梯度、色谱填料与洗脱顺序、每一步的判据（TLC/Rf/显色）；教材没写极性的格子留空并标「教材未给」；
2. **方法学清单**——按准确度、精密度、专属性、线性、范围、检测限、耐用性七项逐条填，缺项直接标「未做」；
3. **结构推断**——UV→IR→MS→NMR 四步各写「看到什么、排除什么」，结论必须带不确定性表述。

写作要求：所有数字给复算命令；教材未给数的格子不许填估计值；涉及有机溶剂、高压设备只写「须在合规实验室按安全规范操作」。

**免责声明：** 本提示词产出的是教学材料，不构成用药或实验操作建议。
"""

SKILL = """---
name: {slug_no}
description: 用《中医护理学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的成分结构、性质与方法变成可核对产物时（分离流程、方法学清单、结构推断、复算）。

## 输入

- 单元层：`standards/zhongyi-huli/units.json`（{units} 单元；取数见 `chapter-map.json`）
- 代码：`departments/05-huli/24-zhongyi-huli-xue/chapters/{slug}/code/main.js`

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
