#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《各家针灸学说》12 章生成 docs/zh.md · quiz.json · outputs/*.md（数字全部读 units.json，不手打）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, "standards", "zhenjiu-gejia", "units.json")
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "17-gejia-zhenjiu-xueshuo")
DATA = json.load(open(UNITS, encoding="utf-8"))
COUNTS = DATA["counts"]

# 章 slug → (n, 标题, 这一章要回答的问题, 为什么难)
CH = {
 "01-gaishu-yanbian": (1, "各家针灸学说概述", "各家针灸学说是人物史还是技术史", "学生常把它背成一张人名表，却说不清某人到底改变了哪个技术动作"),
 "02-liupai-xingcheng": (2, "针灸学术流派的形成与分类", "凭什么算一个流派，划分标准从哪里来", "同一医家在教材与论文里常被归进不同流派，标准不统一就无法比较"),
 "03-neijing-sixiang": (3, "《内经》针灸学术思想", "《内经》的针灸思想是成体系，还是散在条文里", "《灵枢》多言针、《素问》多言理，读成「一部书一个思想」就会漏掉两书分工"),
 "04-nanjing-shanghan": (4, "《难经》与《伤寒杂病论》针灸学术思想", "《难经》补了什么，《伤寒论》用针不多为何仍是针灸必读", "《伤寒论》以方为主，针法只零星出现，容易被读成「与针灸无关」"),
 "05-jintang-yijia": (5, "晋唐针灸医家学术思想", "针灸从「术」变成「学」，是在哪一步完成的", "《甲乙经》把穴位按经归位，这一步一旦没读懂，后面的铜人与大成都会被读成重复"),
 "06-songjinyuan-yijia": (6, "宋金元针灸医家学术思想", "铜人、子午流注、补泻手法为什么集中出现在宋金元", "技术爆炸期最容易被讲成发明清单，讲不清「为什么会在这时爆发」"),
 "07-mingdai-yijia": (7, "明代针灸医家学术思想", "《针灸大成》为什么成了后世标准", "它集大成，也把一些争议写法固化了；只讲「集大成」就掩盖了取舍"),
 "08-qingdai-yijia": (8, "清代针灸医家学术思想", "清代「重灸轻针」是学术选择还是环境所迫", "清代针法受限与灸法盛行并存，读成「衰落」或「发展」都是单向叙事"),
 "09-jindai-yijia": (9, "近代针灸医家学术思想", "针灸现代化是从谁开始的，改了什么", "近代同时发生「科学化」与「教育化」两条线，混为一谈就说不清传承断裂在哪"),
 "10-dangdai-liupai": (10, "当代针灸学术流派", "当代三大流派凭什么被称为流派", "流派认定依赖师承与技法标识，教材写得克制，容易被读成「名家介绍」"),
 "11-linchuang-chuancheng": (11, "针灸各家学说的临床应用与传承", "学说能不能落到一次具体的取穴与手法上", "传承最容易被写成口号；能落地的只有「谁在哪一症上改了什么手法」"),
 "12-shuzihua-ai": (12, "各家针灸学说与数字化AI时代", "各家学说能不能被结构化，结构化的代价是什么", "把医家主张抽成三元组会丢掉语境与争议，而争议恰恰是学说的核心"),
}

NAMES = ["黄帝", "岐伯", "扁鹊", "华佗", "张仲景", "皇甫谧", "葛洪", "孙思邈", "王焘", "王惟一",
         "窦汉卿", "窦默", "滑寿", "刘完素", "张从正", "李东垣", "朱丹溪", "忽泰必烈", "王国瑞",
         "徐凤", "高武", "汪机", "李梃", "杨继洲", "吴谦", "廖润鸿", "承淡安", "陆瘦燕", "朱琏",
         "石学敏", "贺普仁", "程莘农", "郭诚杰"]


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))


def first_cite(units):
    for u in units:
        m = re.search(r"《[^》]{2,24}·[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"]
    # 教材本章只写书名、不写篇名（清代章即如此）：用该书真实子目补足，并标明是补足
    for u in units:
        if "《医宗金鉴》" in u["prose"]:
            return ("《医宗金鉴·刺灸心法要诀》",
                    u["locator"] + "（教材正文只写书名《医宗金鉴》；篇名按该书子目补足：卷七十九–八十六《刺灸心法要诀》）")
    for u in units:
        m = re.search(r"《[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"] + "（教材此章只引书名，无篇名级引文）"
    return "《灵枢·九针十二原》", "教材·第3章·3.1.1"


def excerpt(u, n=130):
    t = re.sub(r"\s+", "", u["prose"])
    return t[:n] + ("…" if len(t) > n else "")


def build_doc(slug, units):
    n, title, question, hard = CH[slug]
    hs = sum(u["hanzi"] for u in units)
    cite, loc = first_cite(units)
    views, levels = {}, {}
    value = cites = 0
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
    persons = sorted(((nm, sum(u["prose"].count(nm) for u in units)) for nm in NAMES), key=lambda x: -x[1])
    persons = [p for p in persons if p[1]][:8]

    L = [f"# 第 {n} 章 · {title}", ""]
    L.append(f"> **MOTTO:** 「{cite}」——{loc}。本章要回答的是：{question}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {hard}。这不是记忆量的问题，是判据的问题：没有判据，任何一个医家都可以被讲成「他很重视针灸」，而这句话什么也没说。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（针灸的技术动作只在具体医家的手上被改动，脱离人物与年代，手法就成了没有来路的规矩）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（时代）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-各家针灸学说.xlsx`（{COUNTS['chapters']} 内容章 / {COUNTS['units']} 单元 / {COUNTS['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhenjiu-gejia/units.json`。本章数字由 `code/main.js` 现算。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 各家针灸学说（针灸推拿系） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；时代主 **{lkey} {levels[lkey]}**；引书 **{len(books)} 部 / {cites} 次**；数值 {value} |")
    L.append(f"| 教材对应 | 教材第 {n} 章（{len(units)} 小节） |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——这个问题在本章被拆成三层：谁提出了什么（主张）、他依据哪部书或哪种技法（依据）、这套东西落到手上是什么动作（应用）。"
             f"三层缺一层，就会把学说讲成故事。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("三辨（学说主张／文献依据／临证应用）与四位面（先秦两汉／晋唐／宋金元／明清近代）都是从正文里数出来的词频。"
             "它们回答的是「这一章主要在讲哪一类事」，不是「哪一类更重要」。")
    L.append("")
    L.append("| 三辨 | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tot_v = max(1, sum(views.values()))
    for k in ("学说主张", "文献依据", "临证应用"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tot_v * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（时代） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("先秦两汉", "晋唐", "宋金元", "明清近代"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    if slug in ("01-gaishu-yanbian", "02-liupai-xingcheng", "11-linchuang-chuancheng", "12-shuzihua-ai"):
        L.append("**本章不是断代章**，时代轴在这里只作背景：一个「概述／分类／传承／数字化」章会把各时代都提到，"
                 "因此重心落在明清近代并不说明本章讲的是明清——**这是横切章与断代章在同一指标下的必然错位**，读写都要留神。")
    else:
        L.append(f"四位面合计 {ltot} 次命中，重心落在 **{lkey}**。断代章的重心若不在本章年代，说明正文在引后代评述——"
                 "这一点在下面逐单元读里能看出来。")
    L.append("")
    if persons:
        L.append("**人物密度（本章前八）**：" + "、".join(f"{nm}×{c}" for nm, c in persons) +
                 "。人名频次只说明「被提到几次」，不说明「被评价多高」；讲成排名就是误读。")
        L.append("")
    L.append("## 三、逐单元读")
    L.append("")
    for u in units:
        L.append(f"### {u['sub']} {u['title']}")
        L.append("")
        L.append(f"> {excerpt(u)}")
        L.append("")
        L.append(f"- 定位：`{u['locator']}`")
        L.append(f"- 规模：{u['hanzi']:,} 汉字；三辨主 {max(u['measure']['views'], key=u['measure']['views'].get)}；"
                 f"时代主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/17-gejia-zhenjiu-xueshuo/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/时代重心、引书、人物密度")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 五、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材给的是「某某提出某某说」，丢掉的是这套说法在当时被谁反对、后来被谁改动。"
             "学派的价值一半在争议里，而争议不进教材的正文结构——本章能复算词频，不能复算「当年谁不同意」。")
    L.append("")
    L.append("**数字的边界。** 引书数与人物密度都是频次。"
             "引书多说明这位医家被反复转述，不等于他的主张被验证；人名出现多说明教材写他多，不等于临床上用他多。")
    L.append("")
    L.append("**方法的边界。** 本章按小节号从单元层直读，不经摘要模型；教材改版导致小节号变化时，`code/main.test.js` 会先失败，"
             "而不是安静地算出一个新数字。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化操作培训；"
             "所涉针刺、艾灸操作须在有资质的机构、由受训人员实施，本章不提供任何自行操作的指引。")
    L.append("")
    L.append("## 六、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_zjgejia_text.py                          # 教材 → 底本 + 单元层")
    L.append("python scripts/scaffold_zjgejia_chapter.py " + slug + "        # 本章 code/")
    L.append("node scripts/audit_curriculum.js | tail -3                     # 审计")
    L.append("```")
    L.append("")
    L.append("> 本章正文中出现的每一个数（单元数、汉字数、词频、引书、人物频次、数值命中）都能由上面命令重算；正文不保存独立于单元层的数字。")
    return "\n".join(L)


def build_quiz(slug, units):
    n, title, question, hard = CH[slug]
    others = [u["title"] for u in DATA["units"] if u["chapter"] != str(n)]
    level_top = max(units[0]["measure"]["levels"], key=lambda k: sum(u["measure"]["levels"][k] for u in units))
    qs = []

    def q(stage, question_, correct, pool, expl):
        opts = [correct] + [o for o in pool if o != correct][:3]
        assert len(opts) == 4, (slug, question_, opts)
        return {"stage": stage, "question": question_, "options": opts, "correct": 0, "explanation": expl}

    qs.append(q("pre", f"第 {n} 章「{title}」要回答的核心问题是什么？", question, others,
                f"见 docs/zh.md 的 PROBLEM 段：{hard}。"))
    qs.append(q("check", f"本章三辨中命中最多的维度是哪一项？",
                max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                ["学说主张", "文献依据", "临证应用", "以上均等"],
                "由 `node code/main.js` 现算，见正文第二节的分布表。"))
    qs.append(q("check", "本章四位面（时代）重心落在哪一段？", level_top,
                ["先秦两汉", "晋唐", "宋金元", "明清近代"],
                "由单元层时代词频相加得出；横切章与断代章的重心含义不同，正文有说明。"))
    qs.append(q("check", "本章从教材取了多少个小节？", f"{len(units)} 个小节",
                [f"{len(units) + 2} 个小节", f"{len(units) + 6} 个小节", f"{len(units) + 11} 个小节"],
                "见 `standards/zhenjiu-gejia/units.json`，并由 `code/main.test.js` 断言。"))
    qs.append(q("post", "本章的数字从哪里来？", "由 standards/zhenjiu-gejia/units.json 现算",
                ["正文里手打", "模型按印象生成", "教材翻页估算"], "正文不存独立数字；教材改动后 `node --test` 会先失败。"))
    qs.append(q("post", "把医家人名频次直接当「学术地位排名」，错在哪？",
                "频次只反映教材转述次数，不反映学术地位", others,
                "正文「数字的边界」段：人名多说明教材写他多，不等于临床用他多。"))
    return {"lesson": slug, "title": title, "subject": "17-gejia-zhenjiu-xueshuo", "questions": qs}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。本章讲的是医家与学说，最容易被写成人物小传；这里的用途正相反——要求产出**能被核对的产物**：一张「主张—依据—应用」三列表，或一段写清争议的说明。

具体用途有三类：

1. **备课**——把本章 {units} 个小节压成一张三列表：某人主张什么、依据哪部书、落到什么手法；每行带教材定位（`教材·第X章·X.X.X`），学生能自己回查；
2. **辨伪**——凡本章写「某家重视某法」而说不出具体手法与出处的，一律删；说不出的，就是没读懂；
3. **交接**——写半页纸说明「本章讲了谁、没讲谁、争议在哪」，交下一位授课者。

写作要求：所有数字给复算命令；教材未写的（如某家被谁反对）标明「教材未写」；涉及针刺、艾灸只写「须由受训人员实施」，不给自行操作步骤。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《各家针灸学说》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的医家与学说变成可核对的教学产物时（备课、辨伪、交接、复算）。

## 输入

- 单元层：`standards/zhenjiu-gejia/units.json`（本章按 chapter 号取）
- 代码：`departments/03-zhenjiu/17-gejia-zhenjiu-xueshuo/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨重心、时代重心、引书数、人物密度；
2. 读 `docs/zh.md` 第二节分布表，与脚本输出逐项对，不一致以脚本为准；
3. 做「主张—依据—应用」三列表时，依据列必须出现书名，应用列必须出现手法或穴位，缺一列即删该行；
4. 交付时附复算命令；教材未写的内容标「教材未写」。

## 边界

- 人名频次≠学术地位；引书次数≠学说被验证；
- 横切章（概述／分类／传承／数字化）的时代重心天然偏后，不能读成断代；
- 针刺、艾灸的操作本技能不给自行指引。

**免责声明：** 教学材料，不构成诊疗建议。
"""


def main():
    targets = sys.argv[1:] or list(CH)
    for slug in targets:
        n = CH[slug][0]
        units = [u for u in DATA["units"] if u["chapter"] == str(n)]
        units.sort(key=lambda u: [int(x) for x in u["sub"].split(".")])
        cdir = os.path.join(SUBJ, "chapters", slug)
        os.makedirs(os.path.join(cdir, "docs"), exist_ok=True)
        os.makedirs(os.path.join(cdir, "outputs"), exist_ok=True)
        doc = build_doc(slug, units)
        open(os.path.join(cdir, "docs", "zh.md"), "w", encoding="utf-8").write(doc)
        quiz = build_quiz(slug, units)
        json.dump(quiz, open(os.path.join(cdir, "quiz.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        title = CH[slug][1]
        open(os.path.join(cdir, "outputs", f"prompt-{slug}.md"), "w", encoding="utf-8").write(
            PROMPT.format(title=title, n=n, units=len(units)))
        open(os.path.join(cdir, "outputs", f"skill-{slug}.md"), "w", encoding="utf-8").write(
            SKILL.format(slug=slug, slug_no=re.sub(r"^\d+-", "", slug), n=n, title=title))
        print(f"第 {n} 章 {title} · docs {hanzi(doc):,} 汉字 · quiz {len(quiz['questions'])} 题 · units {len(units)}")


if __name__ == "__main__":
    main()
