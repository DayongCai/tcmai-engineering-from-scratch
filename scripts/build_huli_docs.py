#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_huli_docs.py —— 护理系通用章材料生成器（docs / quiz / outputs）

用法：
  python scripts/build_huli_docs.py <standards 子目录>

需要三份输入（都在 standards/<sub>/ 下）：
  chapter-map.json  —— 课程章 ← 教材章 + 单元列表（已由 setup 产出）
  axes.json         —— 三辨/四位面词表（供正文写「三辨＝A/B/C」）
  doc-config.json   —— 本课的写法口径：标题、母本、链条一句话、每章的「问题/难点」与引文兜底

为什么另写一份而不再克隆单科脚本：
  单科脚本里混着上一门课的句子（如「中药是混合物」「中药系第 16 门」），克隆五次就带五次错。
  这里所有与学科相关的句子都来自 doc-config.json，脚本本身不含任何学科词。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r"[\u4e00-\u9fff]")


def hanzi(s):
    return len(HANZI.findall(s or ""))


def excerpt(prose, limit=900, markdown=False):
    """取单元正文作为「逐单元读」的引子（不改写原文）。

    markdown=True 时保留段落与标题结构（外源课用：正文里带「## 条文原文与转述」，
    压成一整段会把条文块和引文一起压没），并放宽截断。
    """
    t = re.sub(r"【[^】]*】", "", prose)
    if markdown:
        t = "\n".join(ln.rstrip() for ln in t.strip().split("\n"))
        t = re.sub(r"\n{3,}", "\n\n", t)
        return t if len(t) <= limit else t[:limit].rstrip() + "……"
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= limit:
        return t
    cut = t[:limit]
    for sep in ("。", "；"):
        i = cut.rfind(sep)
        if i > limit * 0.5:
            return cut[: i + 1]
    return cut + "……"


def pick_cite(units, cfg, slug):
    """优先用 doc-config 给的篇名级引文；否则取本章正文里出现的第一个《书名》。"""
    fb = (cfg.get("fallback") or {}).get(slug)
    if fb:
        return fb[0], fb[1]
    for u in units:
        m = re.search(r"《[^》]{2,24}》", u["prose"])
        if m:
            return m.group(0), u["locator"] + "（教材此章只引书名）"
    return cfg.get("defaultCite", ["《中国药典·一部》", "教材此章无篇名级引文"])[0], cfg.get("defaultCite")[1]


def build_doc(sub, cfg, cm, slug, units, ax, meta):
    n, title = cm[slug]["n"], cm[slug]["title"]
    qa = (cfg.get("chapterQ") or {}).get(slug) or [
        f"{title}这一章要解决什么",
        f"本章把「{title}」拆成可观察、可执行、可复核的几步",
    ]
    question, hard = qa
    hs = sum(u["hanzi"] for u in units)
    views, levels = {}, {}
    value = 0
    books = set()
    cites = 0
    for u in units:
        for k, v in u["measure"]["views"].items():
            views[k] = views.get(k, 0) + v
        for k, v in u["measure"]["levels"].items():
            levels[k] = levels.get(k, 0) + v
        value += u["measure"]["valueLike"]
        for b in re.findall(r"《([^》]+)》", u["prose"]):
            books.add(b)
            cites += 1
    vkey = max(views, key=views.get) if views else "—"
    lkey = max(levels, key=levels.get) if levels else "—"
    vnames = list(ax["views"].keys())
    lnames = list(ax["levelsA"].keys())
    cite, loc = pick_cite(units, cfg, slug)

    L = [f"# 第 {n} 章 · {title}", ""]
    L.append(f"> **MOTTO:** 「{cite}」——{loc}。本章要回答的是：{question}。")
    L.append(">")
    L.append(f"> **PROBLEM:** {hard}。")
    L.append(">")
    L.append(f"> **双根因定位:** 环境逼迫（{cfg['objectPressure']}）+ 知识积累（本章 {len(units)} 单元 "
             f"{hs:,} 汉字；三辨主 **{vkey} {views.get(vkey, 0)}**；四位面（{cfg['levelLabel']}）主 "
             f"**{lkey} {levels.get(lkey, 0)}**；引书 **{len(books)} 部 {cites} 次**；数值类命中 {value}）")
    L.append("")
    L.append(f"**教材出处:** `{cfg['xlsx']}`（{meta['chapters']} 内容章 / {meta['units']} 单元 / "
             f"{meta['hanzi']:,} 汉字）；单元层 `standards/{sub}/units.json`；本章取数见 `chapter-map.json`。")
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append(f"| 学科 | {cfg['courseTitle']} |")
    L.append(f"| 章序号 | {n} / {len(cm)} |")
    L.append(f"| 本章规模 | {len(units)} 单元 · {hs:,} 汉字 |")
    L.append(f"| 本章重心 | 三辨主 **{vkey} {views.get(vkey, 0)}**；{cfg['levelLabel']}主 "
             f"**{lkey} {levels.get(lkey, 0)}**；数值 {value} |")
    L.append("")
    L.append("## 一、这一章的问题")
    L.append("")
    L.append(f"{hard}。本章走的是{cfg['courseTitle']}的固定链：**{cfg['chain']}**。"
             f"链上每一环都有它的判据：前一环答不上来，后一环就只能照着做而不知道为什么。")
    L.append("")
    L.append("## 二、三辨与四位面：本章的实测分布")
    L.append("")
    L.append(f"三辨＝**{'／'.join(vnames)}**。本章的实测：")
    L.append("")
    L.append("| 辨 | 本章计数 |")
    L.append("|---|--:|")
    for k in vnames:
        L.append(f"| {k} | {views.get(k, 0)} |")
    L.append("")
    L.append(f"四位面（{cfg['levelLabel']}）＝**{'／'.join(lnames)}**，本章主导为 **{lkey}（{levels.get(lkey, 0)}）**。")
    tot = sum(levels.values()) or 1
    L.append("")
    L.append("| 位面 | 计数 | 占比 |")
    L.append("|---|--:|--:|")
    for k in lnames:
        v = levels.get(k, 0)
        L.append(f"| {k} | {v} | {round(v / tot * 100, 1)}% |")
    L.append("")
    L.append("## 三、逐单元读")
    L.append("")
    for u in units:
        L.append(f"### {u['sub']} {u['title']}")
        L.append("")
        L.append(excerpt(u["prose"], cfg.get("excerptLimit", 900), bool(cfg.get("preserveMarkdown"))))
        L.append("")
        L.append(f"*单元规模：{u['hanzi']:,} 汉字；出处 `{u['locator']}`；本单元数值类命中 {u['measure']['valueLike']}。*")
        L.append("")
    L.append("## 四、本章的结构与术语（数据现算）")
    L.append("")
    seg_titles = []
    for u in units:
        for s in u.get("segments", []):
            if s.get("title"):
                seg_titles.append(s["title"])
    L.append("| 项 | 值 |")
    L.append("|---|---|")
    L.append(f"| 节 / 小节 / 单元 | {len({u['sub'].rsplit('.', 1)[0] for u in units})} / {len(units)} / {len(units)} |")
    L.append(f"| 汉字 | **{hs:,}** |")
    L.append(f"| 段（教材分段） | {len(seg_titles)} |")
    L.append(f"| 引书 | {len(books)} 部 / {cites} 次 |")
    L.append(f"| 带单位参数 | {value} 处 |")
    L.append("")
    if seg_titles:
        L.append("**教材分段标题（原样，未改写）**：")
        L.append("")
        for t in seg_titles:
            L.append(f"- {t}")
        L.append("")
        L.append("这些标题就是本章的骨架：读一遍标题，能说出每段解决什么问题，这一章才算读懂；"
                 "说不出，就回到「三、逐单元读」找对应段落。")
        L.append("")
    L.append("## 五、章内可执行验证")
    L.append("")
    L.append("```bash")
    L.append(f"cd {cfg['deptPath']}/chapters/{slug}")
    L.append("node --test code/main.test.js")
    L.append("node code/main.js")
    L.append("```")
    L.append("")
    L.append("`code/main.js` 的数字全部读 `standards/" + sub + "/units.json` 现算，不手打；"
             "输出里带「※ 教学样例」标记与边界声明。改了单元层，这一章的图与数会跟着变。")
    L.append("")
    L.append("## 六、代价与边界")
    L.append("")
    L.append(f"1. **{cfg['courseTitle']}给的是判断框架，不是操作参数**：本章的「怎么做」只到类别与要点，"
             "具体参数以现行规范与所在机构制度为准；")
    L.append("2. **个案不进入正文**：正文里的例子一律是合成说明，不含可定位的真实机构、人名与时间地点；")
    L.append(f"3. **不替代专业判断**：本章内容用于教学，不构成诊疗或护理意见；临床处置由具备资质的人员依规范作出，"
             f"发现异常按{cfg['reportRule']}报告与转介；")
    L.append(f"4. **母本的限度**：本课只有一本书的覆盖（{meta['units']} 单元），"
             f"教材未展开的部分（{cfg['gapNote']}）不在本章凭空补写。")
    L.append("")
    L.append("**免责声明：** 本章为教学材料，不构成医学意见、诊断或护理指导；一切照护与处置以现行规范、"
             "临床路径与所在机构制度为准。")
    L.append("")
    L.append("## 七、复算入口")
    L.append("")
    L.append("```bash")
    L.append(f"python scripts/build_huli_course.py {sub} \"{cfg['xlsx']}\"   # 工作簿 → 底本 + 单元层")
    L.append(f"python scripts/build_huli_docs.py {sub}                             # 重写本课 18 章材料")
    L.append("node scripts/audit_curriculum.js                                  # 契约与内容门")
    L.append("```")
    L.append("")
    return "\n".join(L)


def build_quiz(cm, slug, units, cfg):
    """契约：questions[{stage,q,options×4,correct,explain}]，pre 1 / check 3 / post 2。"""
    n = cm[slug]["n"]
    title = cm[slug]["title"]
    qa = (cfg.get("chapterQ") or {}).get(slug) or ["本章要解决什么", "本章把内容拆成可执行的几步"]
    _q, hard = qa
    u0, u1 = units[0], units[-1]
    vnames = list(units[0]["measure"]["views"].keys())

    def item(stage, q, correct, options, explain):
        return {"stage": stage, "question": q, "options": options, "correct": correct, "explain": explain}

    return {"chapter": n, "title": title, "questions": [
        item("pre", f"学这一章之前，你认为「{title}」最先要判断的是什么？", 0,
             [f"先判断对象与场景：{hard}", "先记住操作步骤", "先看检查结果", "先按上一章照做"],
             f"本章的入口在对象与场景，不在步骤：{hard}。"),
        item("check", f"本章三辨（{'／'.join(vnames)}）里，主导的是哪一辨？", 0,
             [f"以单元层实测最高的一辨为准（见 code/main.js 输出）", "永远是第一辨", "由章号决定", "三辨等权，无法判断"],
             "三辨分布由 standards 单元层现算，code/main.js 会打印每一项计数。"),
        item("check", f"「{u0['title']}」这一单元解决的是什么问题？", 0,
             [f"它是本章的起点：{u0['locator']} 所讲的那一步", "它是本章的结论", "它是附录", "它与本章无关"],
             f"本章按单元顺序推进，第一个单元负责把问题立起来（{u0['locator']}）。"),
        item("check", "本章有哪些内容只能写到类别、不能给具体参数？", 0,
             ["操作参数、剂量与判定阈值", "病名与症状", "护理目标", "记录要点"],
             f"{cfg['courseTitle']}的正文明写类别与要点，参数以现行规范与机构制度为准。"),
        item("post", f"把「{title}」的判断压缩成三步，最该保留的是？", 0,
             ["识别对象 → 判据到类别 → 边界与报告", "背步骤 → 记数值 → 复述原文", "查文献 → 引结论 → 略过边界", "按经验处理"],
             "本章的链条是：" + cfg["chain"] + "。"),
        item("post", f"本章与「{u1['title']}」的关系是？", 0,
             ["末端单元把前面各步收束到边界与记录", "两者无关", "末端单元可跳过", "末端单元只是补充"],
             f"末单元 {u1['locator']} 负责把本章落到可执行的收尾。"),
    ]}


def main():
    sub = sys.argv[1] if len(sys.argv) > 1 else None
    if not sub:
        sys.exit("用法: build_huli_docs.py <standards 子目录>")
    base = os.path.join(ROOT, "standards", sub)
    cm = json.load(open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    ax = json.load(open(os.path.join(base, "axes.json"), encoding="utf-8"))
    cfg = json.load(open(os.path.join(base, "doc-config.json"), encoding="utf-8"))
    U = json.load(open(os.path.join(base, "units.json"), encoding="utf-8"))
    meta = U["counts"]
    BY = {u["sub"]: u for u in U["units"]}
    dept = os.path.join(ROOT, cfg["deptPath"])

    total = 0
    for slug in sorted(cm, key=lambda k: cm[k]["n"]):
        spec = cm[slug]
        units = [BY[k] for k in spec["units"]]
        d = os.path.join(dept, "chapters", slug)
        for p in ("docs", "outputs"):
            os.makedirs(os.path.join(d, p), exist_ok=True)
        doc = build_doc(sub, cfg, cm, slug, units, ax, meta)
        io.open(os.path.join(d, "docs", "zh.md"), "w", encoding="utf-8").write(doc)
        quiz = build_quiz(cm, slug, units, cfg)
        json.dump(quiz, io.open(os.path.join(d, "quiz.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        name = re.sub(r"^\d+-", "", slug)
        hs = sum(u["hanzi"] for u in units)
        prompt = f"""# {spec['title']} · 提示词

## 用途

给「{spec['title']}」这一章备课或自学时用的提示词。它不生成结论，只把本章的判据、规模和边界摆出来，
让使用者自己走一遍「{cfg['chain']}」这条链。

## 提示词

```
我在学《{cfg['courseTitle']}》第 {spec['n']} 章「{spec['title']}」，本章 {len(units)} 单元 / {hs:,} 汉字，
取自教材第 {'、'.join(str(x) for x in spec.get('srcChapters', []))} 章。

请按以下顺序带我走：
1. 先给本章要回答的问题，并说明它为什么不能直接套用上一章；
2. 再给三辨（{'／'.join(ax['views'].keys())}）在本章的实测分布，指出主导那一辨；
3. 然后按单元逐条读出「判据」——每条只写类别与要点，不给操作参数；
4. 最后给出三条边界：哪些内容只能写到类别、哪些必须由具备资质的人员作出、哪些情况按{cfg['reportRule']}报告。

要求：不编造教材没有的数字；引文写到《书名·篇名》级并标注是否本章原文篇名；
不确定的地方直接说「教材未展开」。
```

## 边界

本提示词用于教学准备，不构成诊疗或护理意见；具体操作以现行规范与所在机构制度为准。
"""
        io.open(os.path.join(d, "outputs", f"prompt-{slug}.md"), "w", encoding="utf-8").write(prompt)
        skill = f"""---
name: {name}
version: 1.0.0
description: {spec['title']}——按「{cfg['chain']}」走一遍本章判据
---

# {spec['title']}

## 什么时候用

需要把本章的判断讲清、或检验自己是否讲清时。

## 怎么用

1. 先读 `docs/zh.md` 的「一、这一章的问题」，确认要回答的是什么；
2. 跑 `node code/main.js`，看本章的规模、三辨与{cfg['levelLabel']}分布（数字由 `standards/{sub}/units.json` 现算）；
3. 按「三、逐单元读」的单元顺序，逐个说出判据类别；
4. 用 `quiz.json` 的 6 道题自检，答不上就回到对应单元。

## 边界

只写类别与要点，不写操作参数；不替代专业判断；异常按{cfg['reportRule']}报告。
"""
        io.open(os.path.join(d, "outputs", f"skill-{name}.md"), "w", encoding="utf-8").write(skill)
        total += 1
        print(f"第 {spec['n']} 章 {spec['title']} · docs {hanzi(doc):,} 汉字 · quiz 6 题")
    print(f"{sub}: {total} 章材料已生成")


if __name__ == "__main__":
    main()
