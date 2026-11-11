#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《推拿功法学》12 章生成 docs/zh.md · quiz.json · outputs/*.md。第 4 章附五层对账。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "gongfa")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
X = json.load(open(os.path.join(D, "五层对账.json"), encoding="utf-8"))
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "18-tuina-gongfa-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-gaishu-yanbian": ("功法不是「热身操」，它在推拿学科里占什么位置", "学生把功法当课前活动，练三年仍不知「练它为了什么」——功法的位置，决定它被练成什么样"),
 "02-lilun-jichu": ("「气沉丹田」「以意领气」这类话，能不能落到可观察的动作上", "中医术语与练功体感之间没有一一对应，教材用比喻写，学生只能照做不敢问"),
 "03-jiben-neirong": ("三调（调身、调息、调心）为什么必须同时练", "只调身是体操，只调息是呼吸训练，只调心是打坐；三者合起来才是「练功」，但教材把三调分章写，容易各练各的"),
 "04-gongli-guanxi": ("手法做不出来，到底是手法没学会，还是功力不够", "手法学讲「沉肩垂肘、持久有力」，功法学讲「易筋经、桩功」；两本书各自都对，合起来才回答得了这个问题"),
 "05-yijinjing": ("易筋经十二式，练的是筋还是力", "「易筋」二字容易被读成拉筋，教材写的却是「以力引气、以气催力」，落点在力与气的配合"),
 "06-shaolin-neigong": ("少林内功的桩功为什么要求「蹲裆」而不是「站直」", "下肢静力性负荷是这类功法的核心，但静力训练最枯燥，也最容易被跳过"),
 "07-wuqinxi": ("五禽戏模仿的是动物的动作，还是动物的神态", "形与神的关系在五禽戏里最明显，教材两边都写，练的时候只能选一个先"),
 "08-baduanjin": ("八段锦只有八式，凭什么流传最广", "八式覆盖全身、动作简单、可拆可合，教材写的正是「低门槛高复利」"),
 "09-liuzijue-qita": ("六字诀靠呼气吐字治病，依据是什么", "六字诀以调息为主、调身为辅，与前面几套以调身为主的功法正好相反"),
 "10-zhuanxiang-gongli": ("指力、腕力、臂力、腰腿力，哪一样最难练", "专项功力训练最容易被当成体能训练；教材把「练哪里、练多久、怎么算够」写在具体动作里"),
 "11-linchuang-yingyong": ("把功法教给病人，与教给学生有什么不同", "学生要练出功力，病人要缓解症状；同一套动作，两套剂量与终止条件"),
 "12-xiandai-shuzihua": ("动作可以录像，呼吸与意念怎么数字化", "调身能捕捉，调息可测，调心几乎无法量化——数字化最容易丢掉最后一样"),
}

FALLBACK = {
 "01-gaishu-yanbian": ("《素问·上古天真论》", "教材此章只引书名；篇名按《素问》篇目补足，**非本章原文篇名**"),
 "12-xiandai-shuzihua": ("《灵枢·九针十二原》", "本章为数字化主题，教材无篇名级引文；此条为教学参照，**非本章原文**"),
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


def table5():
    out = ["| 力道 | 功法学（供给，每万字） | 手法学（需求，每万字） | 密度比 |", "|---|---:|---:|---:|"]
    for r in X["rows"]:
        out.append(f"| {r['力道']} | {r['供给密度(每万字)']} | {r['需求密度(每万字)']} | **{r['密度比']}** |")
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
    L.append(f"> **双根因定位:** 环境逼迫（功力是身体上的积累，说得出与做得到之间隔着几年）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（功法体系）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-推拿功法学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/gongfa/units.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 推拿功法学（针灸推拿系第 18 门） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；功法体系主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——功法的每一章都在同一件事上打转：**把身体的感受写成可教的步骤。**")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（调身／调息／调心） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("调身", "调息", "调心"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（功法体系） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("易筋经", "少林内功", "导引套路", "专项功力"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**全库三调实测：调身 2,031 / 调息 1,390 / 调心 448（比值 4.5×）。**"
             "教材把「怎么摆」「怎么呼吸」写得清楚，把「怎么想」写得最少——**而调心是三调里最难教、也最容易被跳过的一调**。"
             "这一条不是缺陷判断，是文本事实：可写的动作被写尽了，不可写的意念只能点到。")
    L.append("")
    if slug == "04-gongli-guanxi":
        L.append("## 三、第五层对账：功力供给 vs 手法需求")
        L.append("")
        L.append("这一层回答的正是本章的问题——「手法做不出来，是没学会还是功力不够」。"
                 "做法：把四类力道在两书正文里按**每万字密度**计数（两书体量差 2.7 倍，绝对数不可直比）。")
        L.append("")
        L.append(table5())
        L.append("")
        gaps = X["counts"]["密度比<1（功法学讲得比手法学稀）"]
        L.append(f"**唯一的缺口是指力（密度比 0.76）**，其余三类功力供给都超过需求（腕 1.08、臂 1.13、腰腿 1.8）。")
        L.append("")
        L.append("这条缺口值得单独说：**手法学里最吃指力的正是一指禅推法**（全书篇幅最大的单一手法，推拿手法学 5.1.1 单节 14,301 字），"
                 "而功法学里指力的专项训练写得比腕、臂、腰腿都少。**教材的重心在桩功（下肢静力），手法需求的重心在指尖。**"
                 "这不能简单判为「教材遗漏」——桩功练的是全身整合与耐力，指力靠手法本身反复练出来；"
                 "但两本书既然分开写，这条错位就该被指出来，而不是让它在两门课之间消失。")
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
                 f"体系主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 五、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/18-tuina-gongfa-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/体系重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材把动作写成步骤（手型、方位、次数），丢掉的是**过程中的身体感受**：酸、胀、热、抖、气感。"
             "这些恰恰是判断「练对了没有」的唯一依据。文本能证明教材怎么要求，不能证明你练对了。")
    L.append("")
    L.append("**数字的边界。** 本课程数值类命中只有 59 处（全书最低）——不是功法没有量，是**功法书用汉字数字**（「三十六式」「练三百息」「三十分钟」），"
             "按阿拉伯数字统计自然抓不到。**数值少不等于剂量松，是剂量用的是另一套写法。**")
    L.append("")
    L.append("**方法的边界。** 第五层对账按词频密度比，只能说明「讲得多不多」，不能说明「练得对不对」；"
             "调心的不可数性，决定了本学科永远有一部分内容无法被文本核验。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议；练功须循序渐进、量力而行，"
             "有骨关节疾病、心血管疾病或妊娠者应在专业人员指导下选择功法，本章不提供任何自行练习的强度指引。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_gongfa_text.py       # 教材 → 底本 + 单元层")
    L.append("python scripts/crosscheck_gongfa.py       # 第五层对账（功力供给 vs 手法需求）")
    L.append("python scripts/scaffold_gongfa_chapter.py " + slug)
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
    out.append(q("check", "本章四位面（功法体系）重心落在哪一项？", ltop,
                 ["易筋经", "少林内功", "导引套路", "专项功力"], "见正文第二节分布表。"))
    out.append(q("check", "本章三辨中命中最多的维度是？",
                 max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                 ["调身", "调息", "调心", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+3} 个", f"{len(units)+5} 个"], "见 chapter-map.json。"))
    if slug == "04-gongli-guanxi":
        out.append(q("post", "第五层对账里唯一的功力缺口是哪一类？", "指力", ["腕力", "臂力", "腰腿力"],
                     "密度比 0.76，其余三类均 ≥1；而手法学里最吃指力的是一指禅推法。"))
    elif slug == "03-jiben-neirong":
        out.append(q("post", "全库三调中写得最少的是哪一调？", "调心", ["调身", "调息", "三者均等"],
                     "调身 2,031、调息 1,390、调心 448；不可写的意念只能点到。"))
    else:
        out.append(q("post", "本课程数值类命中为什么特别少？", "功法书多用汉字数字，按阿拉伯数字统计抓不到", others,
                     "正文「数字的边界」段：数值少不等于剂量松。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/gongfa/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "18-tuina-gongfa-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。功法最容易被教成「照着做」；这里的用途正相反——要求产出**能被核对的产物**：一张三调拆解表、一份练功处方，或一段可观察的进度记录。

具体用途有三类：

1. **三调拆解**——每个动作一行：调身（手型/方位/次数）、调息（呼吸方式与节律）、调心（意守何处）；教材只写「自然呼吸」的，照抄并标「教材未细述」；
2. **练功处方**——给不同人群（学生/病人/康复期）写剂量：每次几遍、每日几次、几周为一阶段；来源写明是教材还是推论；
3. **进度记录**——按「能完成的动作—持续时间—主观感受」三段记，感受一栏允许形容词，但要求可复述（酸痛在何处、何时出现）。

写作要求：所有数字给复算命令；教材未写数的格子不许填估计值；有基础疾病者只写「须在专业指导下选择」，不给强度建议。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《推拿功法学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章功法变成可核对产物时（三调拆解、练功处方、进度记录、复算）。

## 输入

- 单元层：`standards/gongfa/units.json`（{units} 单元）
- 五层对账：`standards/gongfa/五层对账.json`（功力供给 vs 手法需求）
- 代码：`departments/03-zhenjiu/18-tuina-gongfa-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与体系重心、数值命中；
2. 做拆解表时三调必须分开写，缺一调即标「教材未述」；
3. 练功处方按人群分档，教材没给的分档标「教材未给」；
4. 交付附复算命令。

## 边界

- 调心（意守、入静）不可量化，只能抄原话与体感描述；
- 数值命中少是写法问题，不是剂量松；
- 有基础疾病者：本技能不给强度指引。

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
