#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《经络学》10 章生成 docs/zh.md · quiz.json · outputs/*.md（数字全部读 units.json，不手打）。

用法: python scripts/_jl_docs_out.py [slug ...]
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, "standards", "jingluo", "units.json")
MAP = os.path.join(ROOT, "standards", "jingluo", "chapter-map.json")
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "01-jingluo-xue")

DATA = json.load(open(UNITS, encoding="utf-8"))
BYSUB = {u["sub"]: u for u in DATA["units"]}
CMAP = json.load(open(MAP, encoding="utf-8"))["chapters"]
COUNTS = DATA["counts"]

# 每章一句「这一章解决什么」的分析句（人工写，其余全部现算）
FRAME = {
 "01-zucheng-mingming": ("经络系统到底由哪几样东西组成，谁管走向、谁管深浅、谁管联络", "把「经络」当一根线的人，第一次看到十二经脉、奇经八脉、经别、经筋、皮部并列时会失序"),
 "02-shier-jingmai": ("十二经脉为什么必须按「手三阴—手三阳—足三阳—足三阴」这个次序走", "十二经的走向与交接是全书唯一有确定答案的一节，也最容易被背成顺口溜而丢掉机理"),
 "03-qijing-bamai": ("奇经八脉为什么被称为「奇」，它与十二经的关系是补充还是另一套系统", "奇经不直接络属脏腑、不参与十二经流注，学生常把它当作「多出来的八条经」"),
 "04-jingbie-jinjing": ("经别、经筋、皮部与十二经脉是什么关系，为什么教材把它们放在「纵横关系」里讲", "教材未单列经别经筋皮部章，材料散在「经络的纵横关系」与各经循行的属络描述中"),
 "05-biaoli-peishu": ("表里配属是解剖事实还是功能描述，它在主治上能不能被验证", "「肺与大肠相表里」人人会背，但能不能从主治上验出来，是本章唯一真问题"),
 "06-bingli-fanying": ("经脉病候与脏腑病候的边界在哪，循经感传算不算证据", "病候是经络学最像临床的一节，也最容易把「教科书描述」当成「临床证据」"),
 "07-jingluo-kongjian": ("把人体折成一张图时，取穴的坐标系统是怎么定出来的", "骨度分寸、体表标志、同身寸、简便取穴四套方法并存，学生常问「到底信哪个」"),
 "08-liuzhu-shijian": ("十二经流注的次序与时间节律（子午流注）之间，哪一部分是教材写的，哪一部分是推演", "教材写了流注次序，时间节律多在后世与临床用法里，两者不能混为一谈"),
 "09-jiepou-zhengyi": ("经络在解剖学上找不到对应结构，这件事该怎样被诚实地处理", "「经络实体」是中医与现代科学交锋最久的一处，教学上最忌两头讨好"),
 "10-tupu-jianku": ("把 20 章教材变成可检索的图谱，最小的可用单元是什么", "知识图谱与三维经络已被教材写进现代研究一节，但「建库」不是画图，是定单元与关系"),
}


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))


def first_cite(units):
    for u in units:
        m = re.search(r"《[^》]{2,24}·[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"]
    for u in DATA["units"]:
        m = re.search(r"《[^》]{2,24}·[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"] + "（全书首见引文，本章无直接引文）"
    return "《灵枢·经脉》", "教材·第4章·4.1.1"


def excerpt(u, n=120):
    t = re.sub(r"\s+", "", u["prose"])
    return t[:n] + ("…" if len(t) > n else "")


def build_doc(slug, spec):
    n, title, keys = spec["n"], spec["title"], spec["units"]
    units = [BYSUB[k] for k in keys]
    hanzi_sum = sum(u["hanzi"] for u in units)
    cite, cite_loc = first_cite(units)
    focus, why = FRAME[slug]

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
    ltot = sum(levels.values())
    tchapters = sorted({int(u["chapter"]) for u in units})

    L = []
    L.append(f"# 第 {n} 章 · {title}")
    L.append("")
    L.append(f"> **MOTTO:** 「{cite}」——{cite_loc}。本章要回答的是：{focus}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {why}。分不清的具体后果不是考试扣分，而是动手时把不该扎的地方扎了、把该查的经脉漏了。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（针灸临床以经脉为坐标系，取穴、配穴、辨经都从这里出发，教材无从回避）+ "
             f"知识积累（本章 {len(units)} 单元 {hanzi_sum:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-经络腧穴学.xlsx`（{COUNTS['chapters']} 内容章 / {COUNTS['units']} 单元 / "
             f"{COUNTS['hanzi']:,} 汉字）；单元层 `standards/jingluo/units.json`；本章取数映射见 `standards/jingluo/chapter-map.json`。")
    L.append("本章所有数字由 `code/main.js` 现算，不在正文里手打。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 经络学（针灸推拿系第 1 门） |")
    L.append(f"| 章序号 | {n} / 10 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hanzi_sum:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；四位面主 **{lkey} {levels[lkey]}**；引书 **{len(books)} 部 / {cites} 次**；数值 {value} |")
    L.append(f"| 教材对应 | 教材第 {'、'.join(str(c) for c in tchapters)} 章（{len(units)} 小节） |")
    L.append("")
    L.append("## 一、这一章在整门课里的位置")
    L.append("")
    L.append(f"经络学按知识结构分 10 章，教材按「一经一章」分 {COUNTS['chapters']} 章，两者不同构。"
             f"本章取教材第 {'、'.join(str(c) for c in tchapters)} 章的 {len(units)} 个小节，"
             f"合计 {hanzi_sum:,} 汉字，占教材单元层 {COUNTS['hanzi']:,} 字的 {hanzi_sum / COUNTS['hanzi'] * 100:.1f}%。")
    L.append("")
    L.append("同一小节可能被两章复用（例如「走向交接与流注次序」既服务于十二经走向，也服务于流注时间节律）。"
             "复用不掩盖：`chapter-map.json` 里能看到每一次取用的单元号，读者可以自己核。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("三辨（循行／定位／主治）与四位面（手三阴／手三阳／足三阳／足三阴）不是先验的分类，"
             "而是从教材正文里数出来的词频。本章的实测值如下——数字回答了「这一章主要在讲哪一类事」。")
    L.append("")
    L.append("| 三辨 | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("循行", "定位", "主治"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / max(1, sum(views.values())) * 100:.1f}% |")
    L.append("")
    L.append("| 四位面 | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("手三阴", "手三阳", "足三阳", "足三阴"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / max(1, ltot) * 100:.1f}% |")
    L.append("")
    if ltot == 0:
        L.append("**本章四位面全为 0**：教材这一部分不按经脉分区写（腧穴概论与现代研究都是横向论题），"
                 "四位面在此**不适用**。这不是数据缺失，是口径不匹配——如实写出比强行归类更可核。")
    else:
        L.append(f"四位面合计 {ltot} 次命中，重心落在 **{lkey}**。这一分布说明本章的材料本身是有经脉归属的；"
                 "凡重心偏离本章主题的，正文下面逐条说明偏差从哪来。")
    L.append("")
    L.append("## 三、逐单元读")
    L.append("")
    for u in units:
        L.append(f"### {u['sub']} {u['title']}")
        L.append("")
        L.append(f"> {excerpt(u, 150)}")
        L.append("")
        L.append(f"- 定位：`{u['locator']}`")
        L.append(f"- 规模：{u['hanzi']:,} 汉字；三辨主 {max(u['measure']['views'], key=u['measure']['views'].get)}；"
                 f"数值类命中 {u['measure']['valueLike']}")
        L.append(f"- 小节要点：{u['brief'] or u['title']}")
        L.append("")
    L.append("## 四、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd departments/03-zhenjiu/01-jingluo-xue/chapters/{slug}")
    L.append("node code/main.js        # 打印本章单元数、三辨/四位面重心、引书与数值计数")
    L.append("node --test code/main.test.js   # 断言与 units.json 一致（改教材会先响）")
    L.append("```")
    L.append("")
    L.append("## 五、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材的定位描述是「可以照着找」的文字，但它丢掉了三样东西：个体的胖瘦与体位差异、"
             "手下触感的训练过程、以及同一条经在不同流派里的取穴差异。这三样只能在人身上学，读文本学不到。"
             "本章的字数与词频能证明「教材写了什么」，不能证明「你找得到」。")
    L.append("")
    L.append("**数字的边界。** 三辨与四位面的命中数是词频，不是重要性排序。词早与词晚、词疏与词密，"
             "反映的是构词与时代，不直接等于临床权重。凡本章出现「某类命中极少」的地方，都要回头看语料，"
             "不要直接读成「教材不重视」。")
    L.append("")
    L.append("**方法的边界。** 本章的取数是按小节号从单元层直接读，不经过摘要模型；"
             "因此若教材修订导致小节号变化，`code/main.test.js` 会先失败，而不是安静地算出一个新数字。")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化操作培训；"
             "针刺、艾灸等操作须在有资质的机构、由受训人员实施，本章不提供任何自行操作的指引。")
    L.append("")
    L.append("## 六、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_jingluo_text.py          # 教材 → 底本 + 单元层")
    L.append("python scripts/scaffold_jingluo_chapter.py " + slug + "   # 生成本章 code/")
    L.append("node scripts/audit_curriculum.js | tail -3     # 审计")
    L.append("```")
    L.append("")
    L.append("> 复算说明：本章正文中出现的每一个数（单元数、汉字数、词频、引书、数值命中）都能由上面两条命令重算；"
             "正文不保存任何独立于单元层的数字。")
    return "\n".join(L)


def build_quiz(slug, spec):
    n, title, keys = spec["n"], spec["title"], spec["units"]
    units = [BYSUB[k] for k in keys]
    others = [u["title"] for u in DATA["units"] if u["sub"] not in keys]

    def q(stage, question, correct, pool, expl):
        opts = [correct] + [o for o in pool if o != correct][:3]
        assert len(opts) == 4, (slug, question, opts)
        return {"stage": stage, "question": question, "options": opts, "correct": 0, "explanation": expl}

    u0, u1 = units[0], units[min(1, len(units) - 1)]
    qs = [
        q("pre", f"第 {n} 章「{title}」主要解决什么问题？", title, others,
          f"见 docs/zh.md 的 PROBLEM 段：本章要回答的是「{FRAME[slug][0]}」。"),
        q("check", f"「{u0['title']}」属于本章哪一小节？", u0["title"], others,
          f"教材 {u0['locator']}（{u0['hanzi']:,} 汉字）。"),
        q("check", "本章四位面的重心是哪一类？", max(units[0]["measure"]["levels"], key=lambda k: sum(u["measure"]["levels"][k] for u in units)),
          ["手三阴", "手三阳", "足三阳", "足三阴"],
          "由 `node code/main.js` 现算，见正文第二节的分布表。"),
        q("check", f"本章共取教材几个小节？", f"{len(units)} 个小节", ["3 个小节", "6 个小节", "13 个小节", "20 个小节"],
          "见 `standards/jingluo/chapter-map.json`，并由 `code/main.test.js` 断言。"),
        q("post", "本章的数字（单元数/字数/词频）从哪里来？", "由 standards/jingluo/units.json 现算",
          ["正文里手打", "模型按印象生成", "教材翻页估算"],
          "本章不存独立数字；改教材后 `node --test` 会先失败。"),
        q("post", "若教材修订导致小节号变化，最先出问题的是哪一步？", "code/main.test.js 的断言", others,
          "测试断言写在可对账的结构上（小节号、规模、重心），因此会先响。"),
    ]
    return {"lesson": slug, "title": title, "subject": "01-jingluo-xue", "questions": qs}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。它不要求你复述教材，而是要求你产出**能被别人核对的产物**：一张表、一段可重跑的命令、或一份写清边界的说明。

具体用途有三类：

1. **备课**——把本章 {units} 个小节的标题与要点整理成一节课的板书骨架，每个小节配一条教材定位（`教材·第X章·X.X.X`），学生课后可以自己回查原文；
2. **自查**——拿 `node code/main.js` 的输出与本章正文的数字对照，凡是正文写了而脚本算不出的数，一律视为该删或该补；
3. **交接**——把「本章讲什么、不覆盖什么、边界在哪」写成半页纸，交给下一位授课者，他不必读完全部教材就能判断这一章能不能直接讲。

写作要求：所有数字必须给出复算命令；凡是教材没写的内容，标明「教材未写」，不要用常识补；凡涉及操作（取穴、针刺、艾灸），只写「须由受训人员实施」，不给自行操作的步骤。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《经络学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章内容变成可核对的教学产物时（备课、出题、交接、复算）。

## 输入

- 单元层：`standards/jingluo/units.json`（本章取数见 `standards/jingluo/chapter-map.json`）
- 代码：`departments/03-zhenjiu/01-jingluo-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨重心、四位面重心、引书数与数值命中；
2. 读本章 `docs/zh.md` 的第二节分布表，与脚本输出逐项对；不一致以脚本为准；
3. 需要出题时，用本章小节号与小节标题做选项，干扰项取自其它章，不自造术语；
4. 交付时附复算命令；凡教材未写的内容标「教材未写」。

## 边界

- 词频不等于重要性：词早词晚、词疏词密反映构词与时代；
- 本章数字只证明「教材写了什么」，不证明临床效果；
- 涉及针刺、艾灸的操作，本技能不提供自行操作指引。

**免责声明：** 教学材料，不构成诊疗建议。
"""


def main():
    targets = sys.argv[1:] or list(CMAP)
    for slug in targets:
        spec = CMAP[slug]
        cdir = os.path.join(SUBJ, "chapters", slug)
        os.makedirs(os.path.join(cdir, "docs"), exist_ok=True)
        os.makedirs(os.path.join(cdir, "outputs"), exist_ok=True)
        doc = build_doc(slug, spec)
        open(os.path.join(cdir, "docs", "zh.md"), "w", encoding="utf-8").write(doc)
        quiz = build_quiz(slug, spec)
        json.dump(quiz, open(os.path.join(cdir, "quiz.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        n, title = spec["n"], spec["title"]
        p = PROMPT.format(title=title, n=n, units=len(spec["units"]))
        open(os.path.join(cdir, "outputs", f"prompt-{slug}.md"), "w", encoding="utf-8").write(p)
        s = SKILL.format(slug=slug, slug_no=re.sub(r"^\d+-", "", slug), n=n, title=title)
        open(os.path.join(cdir, "outputs", f"skill-{slug}.md"), "w", encoding="utf-8").write(s)
        print(f"第 {n} 章 {title} · docs {hanzi(doc):,} 汉字 · quiz {len(quiz['questions'])} 题")


if __name__ == "__main__":
    main()
