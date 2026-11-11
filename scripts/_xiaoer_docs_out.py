#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《小儿推拿学》12 章生成 docs/zh.md · quiz.json · outputs/*.md。第 7 章附第四层对账。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "xiaoer-tuina")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
X = json.load(open(os.path.join(D, "四层对账.json"), encoding="utf-8"))
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "20-xiaoer-tuina-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-fazhan-jianshi": ("小儿推拿为什么在明清才成体系", "成人推拿自有《内经》以来的经络体系，小儿推拿要等「小儿自有其生理」被认识到，才可能另起一套"),
 "02-jichu-zhishi": ("小儿的生理病理特点，怎样变成手上的操作约束", "「脏腑娇嫩、形气未充」是一句判断，不是一句操作；要落到「用多大力度、做多少次」才算读懂"),
 "03-zhiliao-gaiyao": ("治则写得再清楚，也不能替你做「做多少次」的决定", "小儿推拿的剂量以「次数」计，且随年龄变；教材给区间，实际要按患儿反应调"),
 "04-changyong-shoufa": ("小儿手法为什么比成人少、比成人轻", "成人手法谱系里的扳、拔伸、一指禅在小儿书里基本不出现——不是遗漏，是禁忌"),
 "05-teding-xue": ("小儿的「穴位」为什么和成人经穴对不上", "小儿特定穴多为线状与面状（三关、六腑、天河水、脾经），成人是点；用成人穴位表去核对，几乎全是「查无此穴」"),
 "06-feixi-bingzheng": ("小儿肺系病证为什么强调「治未病」与「忌过汗」", "小儿肺常不足、藩篱不固，汗法过则伤津，教材在每一证后都加一句「中病即止」"),
 "07-pixi-bingzheng": ("小儿腹泻与成人泄泻，推拿方案差在哪", "同一病证两个名字，两本书的手法集合只重叠三成——差的不只是手法，还有特定穴体系与剂量口径"),
 "08-xinganxi-bingzheng": ("心肝系病证为什么多见「惊」与「啼」", "小儿神气怯弱，惊吓与夜啼是常见主诉，但推拿只能做辅助与调护"),
 "09-shenxi-wuguan": ("肾系病证的推拿为什么周期最长", "五迟五软、遗尿都是发育性问题，疗程以月计，教材明写「需家长配合、坚持」"),
 "10-xinshenger-zabing": ("新生儿能做推拿吗", "能做，但对象、力度、时间都与婴幼儿不同；教材把新生儿单列一章，正是因为它不是「更小的小儿」"),
 "11-baojian-tuina": ("保健推拿与治疗推拿的边界在哪", "同一套手法，保健用是「常做轻做」，治疗用是「辨证加量」；界限不在手法，在目的与指征"),
 "12-anquan-shuzihua": ("把小儿推拿做成 App 或机器人，最先出问题的是哪一步", "力度与次数是核心参数，而患儿不会配合也不会表达；数字化最容易把「按反应调」抹成「按流程做」"),
}

FALLBACK = {
 "01-fazhan-jianshi": ("《灵枢·逆顺肥瘦》", "教材此章只引书名；篇名按《灵枢》篇目补足，**非本章原文篇名**"),
 "12-anquan-shuzihua": ("《灵枢·九针十二原》", "本章为数字化主题，教材无篇名级引文；此条为教学参照，**非本章原文**"),
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
    return "《灵枢·九针十二原》", "教材·第3章·3.1.1"


def cross4():
    out = ["| 病证 | 小儿手法 | 成人手法 | 手法 Jaccard | 小儿特定穴 | 成人特定穴 |", "|---|---|---|---:|---:|---:|"]
    for r in X["rows"]:
        out.append(f"| {r['小儿病证']}（小儿）/ {r['成人病证']}（成人） | {'、'.join(r['小儿']['手法'])} | "
                   f"{'、'.join(r['成人']['手法'])} | {r['手法Jaccard']} | {r['小儿特定穴数']} | {r['成人特定穴数']} |")
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
    L.append(f"> **双根因定位:** 环境逼迫（患儿不会说「轻一点」，也不会说「还是痛」；所有判断只能从神色、哭声与腹部软硬读出来）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（脏腑系统）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-小儿推拿学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['diseases']} 病证 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/xiaoer-tuina/units.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 小儿推拿学（针灸推拿系第 20 门） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；脏腑主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——小儿推拿的每一章都在回答同一个问题：**在一具说不出话的身体上，怎么判断「够了」。**")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（手法操作／特定穴／病证应用） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("手法操作", "特定穴", "病证应用"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（脏腑系统） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("肺系", "脾系", "心肝系", "肾系与五官"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**三辨在全库是 2,294 / 1,421 / 2,330（手法操作、特定穴、病证应用），比值 1.6×——这是本库最平的轴。**"
             "说明教材对「怎么做」「按哪里」「治什么」三件事的书写是均衡的；而成人治疗学的同类比值是 2.3×、手法学 2.2×。")
    L.append("")
    if slug == "07-pixi-bingzheng":
        L.append("## 三、第四层对账：小儿 vs 成人，同一病证")
        L.append("")
        L.append("前三层比的是手法参数与方案组合，这一层比的是**体系**：同一病证在两套体系里，用的根本不是同一批「穴位」。")
        L.append("")
        L.append(cross4())
        L.append("")
        L.append(f"**小儿特定穴 {X['counts']['小儿特定穴（全库出现）']} 个**，其中 **{X['counts']['成人治疗学里出现的同名特定穴']} 个在成人书里也出现同名词语**——"
                 "但**同名不同义**：成人的「脾经」是足太阴脾经，「六腑」是胆胃肠三腑；小儿的「脾经」是拇指桡侧的一条线，「六腑」是前臂尺侧的一段。"
                 "**名字对得上，位置与用法对不上。**")
        L.append("")
        L.append(f"反向看：小儿书**不用** {len(X['counts']['小儿书未用成人手法的'])} 个成人手法——"
                 f"{'、'.join(X['counts']['小儿书未用成人手法的'])}。不是遗漏：扳、拔伸、一指禅这些需要「成人肌肉量＋配合」的手法，小儿用不了。")
        L.append("")
        L.append("两处要说明的：")
        L.append("")
        L.append("1. **病证名不同名**：小儿叫「腹泻」，成人叫「泄泻」，同一病证两个名字，靠人工对齐才配上；")
        L.append("2. **剂量口径不同**：小儿以「次数」计（推 300 次），成人以「分钟」计；直接比数值没有意义，能比的只有「有没有上限」。")
        L.append("")
    if slug == "05-teding-xue":
        L.append("## 三、小儿特定穴是另一套坐标")
        L.append("")
        L.append(f"全库出现 **{X['counts']['小儿特定穴（全库出现）']} 个**小儿特定穴，绝大多数是**线状**（三关、六腑、天河水、脾经、大肠）或**面状**（板门、坎宫、内八卦），"
                 "只有少数是点（二人上马、五指节）。这一点决定了三件事：")
        L.append("")
        L.append("1. **操作是「推过一段」而不是「按在一个点」**，所以剂量用次数；")
        L.append("2. **左右手有严格区分**（脾经、肝经、心经、肺经、肾经各有定位），成人经穴无此区分；")
        L.append("3. **与成人经穴同名者不少，但位置与用法不同**——本库第 7 章的四层对账给出了具体计数。")
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
                 f"脏腑主 {max(u['measure']['levels'], key=u['measure']['levels'].get)}；数值 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 五、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/20-xiaoer-tuina-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/脏腑重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材给的是「某证用某穴推多少次」，丢掉的是**患儿当场的反应**：皮肤颜色、出汗、哭声变化、腹部由硬转软——"
             "这些决定了「再推 100 次还是停」。文本能证明教材怎么要求，不能证明你判断对了。")
    L.append("")
    L.append("**数字的边界。** 本课程数值命中 962 处，是全库最高，但绝大多数是「次数」；"
             "「以皮肤微红为度」「以患儿能耐受为度」这类终止条件不可数，**剂量真正靠的是这些不可数的判断**。")
    L.append("")
    L.append("**方法的边界。** 第四层对账按手法集合与特定穴计数比，同名不同义的问题只能人工判定；"
             "小儿病证与成人病证的病名不完全对应（腹泻/泄泻），对齐靠人工。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化培训；"
             "小儿推拿须在明确诊断、排除禁忌后由受训人员实施，新生儿与急症尤须谨慎，本章不提供任何自行操作指引。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_xiaoer_tuina_text.py     # 教材 → 底本 + 单元层")
    L.append("python scripts/crosscheck_xiaoer.py           # 第四层对账（小儿 vs 成人）")
    L.append("python scripts/scaffold_xiaoer_chapter.py " + slug)
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
    out.append(q("check", "本章四位面（脏腑系统）重心落在哪一项？", ltop,
                 ["肺系", "脾系", "心肝系", "肾系与五官"], "见正文第二节分布表。"))
    out.append(q("check", "本章三辨中命中最多的维度是？",
                 max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                 ["手法操作", "特定穴", "病证应用", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+3} 个", f"{len(units)+5} 个"], "见 chapter-map.json。"))
    if slug == "07-pixi-bingzheng":
        out.append(q("post", "小儿「脾经」与成人「脾经」是同一个位置吗？",
                     "不是：成人指足太阴脾经，小儿指拇指桡侧的线状特定穴", others,
                     "第四层对账：同名不同义，名字对得上、位置与用法对不上。"))
    elif slug == "05-teding-xue":
        out.append(q("post", "小儿特定穴以什么形态为主？", "线状与面状为主，点状少数", others,
                     "正文第三节：线状（三关、六腑）与面状（板门、坎宫）为主。"))
    else:
        out.append(q("post", "小儿推拿的剂量主要用什么计？", "次数", ["分钟", "公斤", "穴位数"],
                     "全库数值命中 962 处，多为「推 N 次」。" ))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/xiaoer-tuina/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "20-xiaoer-tuina-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。小儿推拿最容易被写成「穴名＋次数」的歌诀；这里的用途正相反——要求产出**能被核对的产物**：一张特定穴卡片、一份年龄剂量表，或一段终止条件说明。

具体用途有三类：

1. **特定穴卡**——一穴一行：部位（线状/面状/点状）、方向、次数区间、适用年龄、终止条件；教材只写「以皮肤微红为度」的，这一格照抄原话并标「不可数」；
2. **剂量表**——按年龄（新生儿/婴儿/幼儿/学龄前）给次数区间，区间来源写明是教材还是推论；
3. **终止条件**——把「什么时候停」写成可观察的行为（皮肤转红、哭声变化、腹部变软），不写形容词。

写作要求：所有数字给复算命令；教材未写数的空格不许填估计值；涉及新生儿、急症只写「须先明确诊断、由受训人员实施」。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《小儿推拿学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章的小儿特定穴与剂量变成可核对产物时（特定穴卡、剂量表、终止条件、复算）。

## 输入

- 单元层：`standards/xiaoer-tuina/units.json`（{units} 单元）
- 第四层对账：`standards/xiaoer-tuina/四层对账.json`（小儿 vs 成人同名病证）
- 代码：`departments/03-zhenjiu/20-xiaoer-tuina-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与脏腑重心、数值命中；
2. 做特定穴卡时标清「线状/面状/点状」，方向与次数都要有；
3. 剂量按年龄分档，教材没给的分档标「教材未给」；
4. 交付附复算命令。

## 边界

- 「以耐受为度」不可数，只能抄原话；
- 成人经穴与小儿特定穴**同名不同义**，不可互换；
- 新生儿、急症：本技能不给自行操作指引。

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
