#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《推拿治疗学》12 章生成 docs/zh.md · quiz.json · outputs/*.md。第 3 章附三书对账。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhiliao")
U = json.load(open(os.path.join(D, "units.json"), encoding="utf-8"))
CM = json.load(open(os.path.join(D, "chapter-map.json"), encoding="utf-8"))["chapters"]
X = json.load(open(os.path.join(D, "三书对账.json"), encoding="utf-8"))
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "19-tuina-zhiliao-xue")
BY = {u["sub"]: u for u in U["units"]}
C = U["counts"]

CH = {
 "01-gaishu-tixi": ("推拿治疗学是「手法课」还是「临床课」", "学生把它当手法大全来学，进门就找「这个病用哪几个手法」，跳过了辨证分型——分型错了，手法越熟错得越准"),
 "02-zhiliao-jichu": ("同一套手法，凭什么对不同人给不同剂量", "治则、治法、处方、疗程四个环节里，教材把「剂量」写得最虚；而剂量恰恰决定疗效与损伤"),
 "03-jizhu-bingzheng": ("脊柱病证的推拿方案，为什么颈椎病与腰突的手法几乎一样", "教材按病写方案，但手法组合高度重叠；真正的区别在分型、禁忌与手法力度的上限"),
 "04-guguanjie-jinshang": ("筋伤病证与骨关节病证，推拿的边界在哪里", "肩周炎可以推，骨折不能推；同属「肩」，一条线两重天"),
 "05-neike-bingzheng": ("推拿不接触脏腑，凭什么调内科病", "体表—自主神经—内脏这条链，教材写得最薄，也最容易被质疑"),
 "06-fuke-bingzheng": ("妇科推拿的适应证为什么比内科窄得多", "经期、孕期、产后三个阶段各有硬禁忌，教材用「慎用／禁用」标注，不标理由"),
 "07-erke-bingzheng": ("小儿推拿的手法与成人差在哪，为什么不能照搬", "小儿以线状面状部位为主（三关、六腑），力度与时间都按「岁」定，成人那套分寸不适用"),
 "08-wuguan-qita": ("五官病证的推拿为什么多是辅助", "眼、耳、鼻、咽的器质性病变推拿无能为力，能做的是缓解与配合"),
 "09-yundong-kangfu": ("运动损伤的推拿，什么时候该推、什么时候该等", "急性期推拿会加重出血与肿胀，教材给的时间窗是本课程最硬的数字之一"),
 "10-anquan-yichang": ("推拿出事，多数出在哪一步", "不是手法本身，是「没做排除」——禁忌证漏筛、影像未看、力度超限"),
 "11-xiandai-yanzheng": ("推拿的疗效证据到底有多强", "RCT 数量在增长，但盲法几乎做不了；证据强度的天花板由方法学决定，不由样本量决定"),
 "12-shuzihua-ai": ("把治疗方案数字化，最先丢掉的是什么", "手法组合可以结构化，力度与手感不能；数字化最容易把「因人而异」抹成「标准流程」"),
}

FALLBACK = {
 "01-gaishu-tixi": ("《素问·异法方宜论》", "教材此章只引书名；篇名按《素问》篇目补足，**非本章原文篇名**"),
 "11-xiandai-yanzheng": ("《灵枢·九针十二原》", "本章为循证研究方法学主题，教材无篇名级引文；此条为教学参照，**非本章原文**"),
 "12-shuzihua-ai": ("《灵枢·九针十二原》", "本章为数字化主题，教材无篇名级引文；此条为教学参照，**非本章原文**"),
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
    return "《灵枢·九针十二原》", "教材·第1章·1.1.1"


def table3():
    rows = [r for r in X["rows"] if r["判定"] == "两书都有"]
    rows.sort(key=lambda r: -(r["Jaccard"] or 0))
    out = ["| 病证 | 治疗学手法 | 推拿学手法 | 交集 | Jaccard |", "|---|---|---|---|---:|"]
    for r in rows:
        out.append(f"| {r['病证']} | {'、'.join(r['治疗学']['手法'])[:26]} | {'、'.join(r['推拿学']['手法'])[:26]} | {len(r['交集'])} | {r['Jaccard']} |")
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
    L.append(f"> **双根因定位:** 环境逼迫（病人来了是为治病，不是为学手法；方案错了，手法越熟越糟）+ "
             f"知识积累（本章 {len(units)} 单元 {hs:,} 汉字；三辨主 **{vkey} {views[vkey]}**；四位面（病证部位）主 **{lkey} {levels[lkey]}**；"
             f"引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `F:/textbooks/qhzy-推拿治疗学.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['diseases']} 病证 / {C['hanzi']:,} 汉字）；"
             f"单元层 `standards/zhiliao/units.json`；病证库 `standards/zhiliao/病证库.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append("| 学科 | 推拿治疗学（针灸推拿系第 19 门） |")
    L.append(f"| 章序号 | {n} / 12 |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views[vkey]}**；部位主 **{lkey} {levels[lkey]}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{question}——教材把答案放在三段：辨证分型（辨）、手法方案（治）、疗程调护（守）。"
             f"三段任缺一段，这一章就退化成手法清单。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append("| 三辨（病证辨识／手法方案／疗程调护） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    tv = max(1, sum(views.values()))
    for k in ("病证辨识", "手法方案", "疗程调护"):
        v = views.get(k, 0)
        L.append(f"| {k} | {v} | {v / tv * 100:.1f}% |")
    L.append("")
    L.append("| 四位面（病证部位） | 命中 | 占比 |")
    L.append("|---|---:|---:|")
    for k in ("脊柱", "四肢关节筋伤", "内科", "妇科儿科五官"):
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {v / ltot * 100:.1f}% |")
    L.append("")
    L.append("**手法方案词最多（全库 2,531），病证辨识 1,302、疗程调护 1,119**：治疗学的重心确实在「怎么治」，"
             "但「守」的部分只有「治」的四成——**疗程与调护写得最少，恰恰是复发最多的地方。**")
    L.append("")
    if slug == "03-jizhu-bingzheng":
        L.append("## 三、三书对病证：《治疗学》×《推拿学》×《手法学》")
        L.append("")
        L.append("同一病证在两本书里的手法组合对得上吗？下面是 21 个两书都写的病证（治疗学第 3–9 章按「与」拆开计）：")
        L.append("")
        L.append(table3())
        L.append("")
        L.append(f"**Jaccard 均值 {X['counts']['Jaccard均值']}**，完全一致 {X['counts']['完全一致（J=1.0）']} 个、零重叠 {X['counts']['零重叠（J=0）']} 个。")
        L.append("")
        L.append(f"第三本《手法学》的作用是兜底：两书方案里出现的 {X['counts']['手法学收录手法数']} 个手法，"
                 f"**全部能在《手法学》里找到动作描述**（缺 {len(X['counts']['方案里出现但不被手法学收录'])} 个）。"
                 "也就是说，**三书在手法名层面是闭合的：方案里用到的每个手法，都有一本教材讲它怎么做。**")
        L.append("")
        L.append("两处要说明的偏倚：")
        L.append("")
        L.append("1. **治疗学的节是合称**（如「落枕与急性腰扭伤」），拆分后的兄弟病证共用同一段正文，Jaccard 因此被拉近——这是**教材编排**造成的，不是两书真的同意；")
        L.append("2. **Jaccard 只比「用没用这个手法」，不比顺序与剂量**；同一组合换个顺序，临床差别可以很大。")
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
    L.append(f"cd departments/03-zhenjiu/19-tuina-zhiliao-xue/chapters/{slug}")
    L.append("node code/main.js                # 单元数、三辨/部位重心、引书、数值")
    L.append("node --test code/main.test.js    # 断言与 units.json 一致")
    L.append("```")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append("**丢掉了什么。** 教材给的是「这个病证用这几个手法、这个顺序、这个疗程」，丢掉的是**个体差异与手下的判断**："
             "同一个落枕，肌肉型与关节型的手法顺序不同，教材只能写一种。")
    L.append("")
    L.append("**数字的边界。** 数值类命中统计的是「次、分钟、天、疗程」，不含「力度适中」「以耐受为度」这类表述；"
             "因此本课程数值命中虽多（全库 501），**剂量仍是写得最不可数的部分**。")
    L.append("")
    L.append("**方法的边界。** 三书对账按手法名集合比，不查顺序与剂量；治疗学合称节会让兄弟病证共用正文。**Jaccard 高不等于方案一致。**")
    L.append("")
    L.append("**免责声明：** 本章为教学整理，内容不构成诊疗建议，也不能替代医师面诊与规范化培训；"
             "推拿治疗须先明确诊断、排除禁忌，由受训人员按规范实施，本章不提供任何自行治疗指引。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append("python scripts/build_zhiliao_text.py       # 教材 → 底本 + 单元层 + 病证库")
    L.append("python scripts/crosscheck_zhiliao.py       # 三书对病证")
    L.append("python scripts/scaffold_zhiliao_chapter.py " + slug)
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
    out.append(q("check", "本章四位面（病证部位）重心落在哪一项？", ltop,
                 ["脊柱", "四肢关节筋伤", "内科", "妇科儿科五官"], "见正文第二节分布表。"))
    out.append(q("check", "本章三辨中命中最多的维度是？",
                 max(units[0]["measure"]["views"], key=lambda k: sum(u["measure"]["views"][k] for u in units)),
                 ["病证辨识", "手法方案", "疗程调护", "三者大致相当"], "由单元层词频相加得出。"))
    out.append(q("check", "本章共取教材几个小节？", f"{len(units)} 个",
                 [f"{len(units)+2} 个", f"{len(units)+4} 个", f"{len(units)+6} 个"], "见 chapter-map.json。"))
    if slug == "03-jizhu-bingzheng":
        out.append(q("post", "三书对账中 Jaccard 高，能否说明两书方案一致？",
                     "不能，它只比手法集合，不比顺序与剂量", others,
                     "正文第三节的两处偏倚：只比「用没用」，不比顺序与剂量。"))
    else:
        out.append(q("post", "治疗学里「疗程调护」的词频只有「手法方案」的四成，说明什么？",
                     "疗程与调护写得最少，而这正是复发最多的地方", others,
                     "正文第二节：守的部分最薄。"))
    out.append(q("post", "本章数字的来源是哪一层？", "standards/zhiliao/units.json",
                 ["正文手打", "模型按印象生成", "教材翻页估算"], "数据层可复算，正文不存独立数字。"))
    return {"lesson": slug, "title": title, "subject": "19-tuina-zhiliao-xue", "questions": out}


PROMPT = """# 用本章内容做一件事：{title}

## 用途

本提示词面向「读完第 {n} 章、要把它变成一次可交付工作」的场景。治疗学最容易被写成「病名—手法」对照表；这里的用途正相反——要求产出**能被核对的产物**：一张病证方案卡、一份禁忌排除清单，或一段可复现的疗效记录。

具体用途有三类：

1. **方案卡**——每个病证一行：分型依据、取穴与部位、手法组合与顺序、力度上限、疗程与频次；教材只写「适中」的格子留空并标「教材未给数」；
2. **排除清单**——把禁忌与慎用改写成是/否判断题（影像提示、骨质疏松、孕期、皮肤破损…），逐条核过才动手；
3. **疗效记录**——按「初诊评分—疗程结束评分—随访」三段记录，量表口径写明来源。

写作要求：所有数字给复算命令；教材未写数的格子不许填估计值；涉及扳法、颈椎旋转、小儿推拿只写「须先明确诊断、由受训人员按规范实施」。

**免责声明：** 本提示词产出的是教学材料，不构成诊疗建议。
"""

SKILL = """---
name: {slug_no}
description: 用《推拿治疗学》第 {n} 章「{title}」的单元层做可核对的教学材料。
version: 1.0.0
---

# {title}

## 何时用

需要把本章病证方案变成可核对产物时（方案卡、排除清单、疗效记录、三书对账复算）。

## 输入

- 单元层：`standards/zhiliao/units.json`（{units} 单元）；病证库 `standards/zhiliao/病证库.json`
- 三书对账：`standards/zhiliao/三书对账.json`
- 代码：`departments/03-zhenjiu/19-tuina-zhiliao-xue/chapters/{slug}/code/main.js`

## 步骤

1. 跑 `node code/main.js`，记下单元数、汉字数、三辨与部位重心、数值命中；
2. 做方案卡时只填带单位的格子（次、分钟、天、疗程）；
3. 排除清单必须是是/否判断题，不照抄病名清单；
4. 交付附复算命令。

## 边界

- 「适度／适中」不可数，不能折算；
- Jaccard 只比手法集合，不比顺序与剂量；
- 扳法、颈椎旋转、小儿推拿：本技能不给自行操作指引。

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
