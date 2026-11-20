#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/promote_course_to_textbook.py —— 存量转出版件：教学章 docs → 教材章

为什么要有这一步
----------------
看板上「未接出版线」的课，绝大多数不是没写，而是正文写在了教学章的
`departments/<dept>/<slug>/chapters/<ch>/docs/zh.md` 里（本库实测 55 门 / 482 章 /
491.6 万字）。教材线要的不是重写，而是**按教材章契约把已有的源正文层重排一遍**：
章首块、N.1 出处表、N.2–N.5、免责句位置、思考题、延伸阅读。

这条流水线只做机械部分，判断部分（N.2「为什么可以这样翻译」、N.5「争议与本项目立场」）
必须人来写，写在 `standards/<slug>/promote-hand.json` 里。脚本缺这两段就报错，
**不给占位符**——占位符一旦进了教材，读者就只能读到空话。

用法
----
  python scripts/promote_course_to_textbook.py --slug 13-linchuang-keyan-fangfa
  python scripts/promote_course_to_textbook.py --slug 13-linchuang-keyan-fangfa --check

输入（都在 standards/<slug>/ 下）
  promote.json       —— 章分组与章名（人是作者：分组按底本章来，章名按内容起）
  promote-hand.json  —— 每章的 N.2 / N.5 / 思考题（人工判断层）
  units.json         —— 单元层（每单元带 source = 底本 书名:第N章·节）
  chapter-map.json   —— 教学章 ↔ 单元

输出
  textbooks/<dept>/<slug>/NN-第N章-<章名>.md
  textbooks/<dept>/<slug>/附录B-教学章与教材章对照.md

门（--check 时全部现算，任一不符退 1）
  1. promote.json 的 src 必须覆盖本章全部单元的底本来源，且全书不重不漏；
  2. 章数 = promote.json 章数 = 教学章数（本脚本只做 1:1，不替人拆并）；
  3. N.1 表行数 = 本章单元数；
  4. 免责句必须落在 N.5 之后、思考题之前；
  5. N.2 / N.5 各 ≥200 汉字（不许「待补」占位）；
  6. 与磁盘逐字节一致（幂等）。
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r"[\u4e00-\u9fff]")


def hanzi(s):
    return len(HANZI.findall(s or ""))


def read_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def read_text(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def split_book_chapter(source):
    """'卫生统计学:第7章·1.2' → ('卫生统计学', '7')"""
    m = re.match(r"^(.*?):第(\d+)章", str(source or ""))
    if not m:
        return None, None
    return m.group(1), m.group(2)



def book_display(name):
    """'qhzy-卫生信息管理.xlsx' → '卫生信息管理'（显示用，不用于匹配）"""
    return str(name).replace(".xlsx", "").replace("qhzy-", "")

def section_of(docs, heading_prefix):
    """取 docs 里某个二级标题下的整段正文（到下一个同级或更高级标题为止）"""
    lines = docs.split("\n")
    out = []
    grab = False
    for ln in lines:
        if ln.startswith("## "):
            grab = ln.lstrip("# ").strip().startswith(heading_prefix)
            continue
        if grab:
            out.append(ln)
    return "\n".join(out).strip()


def unit_blocks(docs):
    """docs「三、逐单元读」里的 ### 单元块 → {sub: (title, body)}"""
    body = section_of(docs, "三、")
    blocks = {}
    cur = None
    buf = []
    for ln in body.split("\n"):
        m = re.match(r"^### (\S+) (.+)$", ln)
        if m:
            if cur:
                blocks[cur] = (cur_title, "\n".join(buf).strip())
            cur, cur_title = m.group(1), m.group(2)
            buf = []
            continue
        if cur:
            buf.append(ln)
    if cur:
        blocks[cur] = (cur_title, "\n".join(buf).strip())
    return blocks


def strip_meta(body):
    """去掉「*单元规模：…*」这一行，规模改由脚本现算，避免两处数字打架"""
    return "\n".join(ln for ln in body.split("\n") if not ln.strip().startswith("*单元规模：")).strip()


def first_sentence(text, limit=60):
    t = re.sub(r"\s+", " ", strip_meta(text)).strip()
    cut = re.split(r"[。；]", t)[0]
    return (cut[:limit] + "…") if len(cut) > limit else cut


def build_chapter(cfg, books, units, cfg_ch, hand, docs, quiz, units_total):
    n = cfg_ch["n"]
    title = cfg_ch["title"]
    ch_units = [u for u in units if str(u.get("chapter")) == str(cfg_ch["teaching"])]
    if not ch_units:
        raise SystemExit(f"[promote] 教学第 {cfg_ch['teaching']} 章没有单元")

    # ── 门 1：单元底本来源必须落在本章 src 声明里 ──
    declared = set()
    for s in cfg_ch["src"]:
        for c in s["chapters"]:
            declared.add((s["book"], str(c)))
    actual = set()
    for u in ch_units:
        b, c = split_book_chapter(u.get("source"))
        actual.add((b, c))
    if actual != declared:
        missing = sorted(actual - declared)
        extra = sorted(declared - actual)
        raise SystemExit(
            f"[promote] 第 {n} 章 src 与单元实际来源不符：单元里有 {missing}，声明里多出 {extra}"
        )

    hz = sum(hanzi(u.get("body") or u.get("prose") or "") for u in ch_units)
    book_names = "、".join(f"《{b}》第 {'、'.join(str(c) for c in s['chapters'])} 章" for b, s in
                           ((s["book"], s) for s in cfg_ch["src"]))
    books_line = "、".join(
        f"《{book_display(s['book'])}》第 {'、'.join(str(c) for c in s['chapters'])} 章"
        for s in cfg_ch["src"]
    )

    L = []
    L.append(f"# 第 {n} 章 · {title}")
    L.append("")
    L.append(
        f"> **层次**：本文件是**源正文层**（底本正文搬运，未改写）。底本为**合成底本**：{books_line}；"
        f"全书 {units_total['chapters']} 个底本章 / {units_total['units']} 单元 / {units_total['hanzi']:,} 汉字，"
        f"本章 {len(ch_units)} 单元 / {hz:,} 汉字。"
    )
    L.append(
        "> **出处**：逐单元 locator 见 N.1 表；底本工作簿见 `standards/"
        f"{cfg['slug']}/units.json` 的 `source.file`。教学章 `docs/zh.md` 顶部的「教材出处」一行"
        "存在路径前缀重复与书名错误（套用他课模板遗留），本章不沿用，改由单元层 source 现算。"
    )
    L.append(f"> **本章要回答的问题：** {cfg_ch['question']}")
    L.append(
        "> **免责**：本章为教学整理，不构成诊断或治疗建议；研究方案须经机构伦理审查与导师／团队评审。"
    )
    L.append("")
    L.append("---")
    L.append("")

    # ── N.1 概念与出处 ──
    L.append(f"## N.1 概念与出处")
    L.append("")
    L.append(
        f"本章 {len(ch_units)} 个单元来自 {books_line}。下表逐单元给出 `教材·第N章·X.Y` 级 locator："
        "左侧是本章的单元序号，中间是底本位置，右侧是该单元第一句——**只要底本换版，这张表就对不上**，"
        "这就是它的用处。"
    )
    L.append("")
    L.append("| 单元 | 底本 locator | 底本来源 | 汉字 | 首句 |")
    L.append("|---:|---|---|---:|---|")
    for i, u in enumerate(ch_units, 1):
        body = u.get("body") or u.get("prose") or ""
        L.append(
            f"| {i} | `{u.get('locator') or ''}` | {u.get('source') or ''} | {hanzi(body):,} | {first_sentence(body)} |"
        )
    L.append("")

    # ── 逐单元读：底本正文 ──
    blocks = unit_blocks(docs)
    L.append("## 逐单元读（底本正文）")
    L.append("")
    L.append(
        "以下逐单元正文取自底本，未改写；每单元末尾的规模与出处由 `standards/"
        f"{cfg['slug']}/units.json` 现算。"
    )
    L.append("")
    used = 0
    for u in ch_units:
        sub = str(u.get("sub") or "")
        title_u = str(u.get("title") or "")
        # 正文取单元层全文（docs 的「逐单元读」是 900 字节选，搬它会与「本章 X 汉字」对不上）
        body = strip_meta(u.get("body") or u.get("prose") or "")
        got = blocks.get(sub)
        if got:
            used += 1
        if not body and got:
            body = strip_meta(got[1])
        L.append(f"### {sub} {title_u}")
        L.append("")
        L.append(body)
        L.append("")
        L.append(
            f"*单元规模：{hanzi(u.get('body') or u.get('prose') or ''):,} 汉字；出处 `{u.get('locator') or ''}`。*"
        )
        L.append("")

    # ── N.2 / N.3 / N.4 / N.5 ──
    L.append("## N.2 为什么可以这样翻译")
    L.append("")
    L.append(hand["n2"].strip())
    L.append("")

    L.append("## N.3 这个翻译丢掉了什么")
    L.append("")
    cost = section_of(docs, "六、")
    cost = "\n".join(ln for ln in cost.split("\n") if "免责声明" not in ln).strip()
    # 教学章的「母本的限度」可能残留他课模板句（「教材为提纲型，原文仅数百字/章」）。
    # 那句与底本实测相反（本课 21 个底本章 / 331,606 汉字），照搬进教材就是假话：改写为实测陈述。
    if "数百字/章" in cost:
        cost = re.sub(
            r"4\. \*\*母本的限度\*\*：[^\n]*",
            "4. **母本的限度**：本课底本是合成底本（%d 个底本章 / %d 单元 / %s 汉字），"
            "本课按四篇顺序组为 %d 章；底本没有写的内容，本章不凭空补写。"
            % (units_total["chapters"], units_total["units"], "{:,}".format(units_total["hanzi"]), len(cfg["chapters"])),
            cost,
        )
    if cost:
        L.append(cost)
    else:
        L.append(
            "本章的边界写在下面三条：一是方法给的是判断框架而不是操作参数，具体参数以现行规范与所在机构制度为准；"
            "二是正文中的示例均为合成说明，不含可定位的真实机构与个人信息；三是本章不替代专业判断。"
        )
    L.append("")

    L.append("## N.4 与相邻学科的接口")
    L.append("")
    L.append(
        "本章的概念在相邻课程里被继续使用，方向是固定的：\n\n"
        "- **《流行病学》**：用本章的率、标化与推断方法计算人群指标，本课提供工具，流行病学提供问题域；\n"
        "- **《循证医学》**：读证据要先读懂效应量与置信区间，这正是 N.1 与第 3 章的推断基础；\n"
        "- **《卫生经济学》**：成本效果分析的分母来自本章的率与生存指标；\n"
        "- **《中医药数据科学》**：模型输出的解释要以本章的变量类型与偏倚概念为前提，否则模型越好越容易误读。\n\n"
        f"本课与这些课的分工界线写在 `standards/{cfg['slug']}/doc-config.json` 的链条句里。"
    )
    L.append("")

    L.append("## N.5 争议与本项目立场")
    L.append("")
    L.append(hand["n5"].strip())
    L.append("")
    L.append(
        "> **免责**：本章为教学整理，不构成诊断或治疗建议；研究方案须经机构伦理审查与导师／团队评审。"
    )
    L.append("")

    # ── 本章小结 ──
    L.append("## 本章小结")
    L.append("")
    L.append(f"- 本章 {len(ch_units)} 单元 / {hz:,} 汉字，来自 {books_line}；逐单元出处见 N.1。")
    L.append("- 判断顺序：先定设计与资料类型，再选方法，最后守住结论边界。")
    L.append(f"- 本章的边界见 N.3；争议与本项目立场见 N.5。")
    L.append("")

    # ── 思考题 ──
    L.append("## 思考题")
    L.append("")
    for i, q in enumerate(hand.get("check") or [], 1):
        L.append(f"{i}. {q}")
    qs = (quiz or {}).get("questions") or []
    if qs:
        L.append("")
        L.append(f"章末自测（{len(qs)} 题，取自本章 `quiz.json`）：")
        L.append("")
        for i, q in enumerate(qs[:4], 1):
            L.append(f"- {q.get('question')}")
    L.append("")

    # ── 延伸阅读 ──
    L.append("## 延伸阅读")
    L.append("")
    for s in cfg_ch["src"]:
        book = s["book"].replace(".xlsx", "")
        for c in s["chapters"]:
            t = books[s["book"]]["titles"].get(str(c), "")
            L.append(f"- 《{book}》第 {c} 章「{t}」——本章第 {c} 章的底本出处。")
    L.append("")
    L.append(
        f"> 复算：`python scripts/promote_course_to_textbook.py --slug {cfg['slug']} --check`；"
        f"单元层 `standards/{cfg['slug']}/units.json`；教学章 `departments/{cfg['dept']}/{cfg['slug']}/chapters/`。"
    )
    L.append("")
    return "\n".join(L), used, len(blocks), hz


# ── 派生底本课（无同名母本、底本由其他课程数据聚合）────────────────────
DOC_SKIP = ("课程信息", "本章产出", "验证", "检查清单", "代价与边界",
            "三辨与四位面", "章内可执行验证", "复算入口")


def docs_body(docs):
    """取教学章正文段：跳过课程信息/本章产出/验证/检查清单/代价与边界这些教学操作层"""
    out = []
    grab = False
    for ln in docs.split("\n"):
        if ln.startswith("## "):
            grab = not any(ln.lstrip("# ").strip().startswith(k) for k in DOC_SKIP)
            if grab:
                out.append("### " + ln.lstrip("# ").strip())
            continue
        if ln.startswith("# "):
            continue
        if grab:
            out.append(ln)
    return "\n".join(out).strip()


def build_chapter_derived(cfg, units, cfg_ch, hand, docs, quiz, units_total):
    n = cfg_ch["n"]
    title = cfg_ch["title"]
    src_ch = [str(x) for x in (cfg_ch.get("srcChapters") or [cfg_ch["teaching"]])]
    # 自建章必须显式给空的 srcChapters：否则 teaching 号会与底本章号撞上（方剂学教学第 12 章 = 底本第 12 章「补益剂」）
    self_built = bool(cfg_ch.get("selfBuilt")) and not cfg_ch.get("srcChapters")
    ch_units = [] if self_built else [u for u in units if str(u.get("chapter")) in src_ch]
    if not ch_units and not self_built:
        raise SystemExit(f"[promote] 第 {n} 章（源章 {src_ch}）没有单元；若为自建章请在 promote.json 标 selfBuilt")
    prefixes = cfg.get("locatorPrefixes") or ["派生", "教材"]
    for u in ([] if self_built else ch_units):
        if not any(str(u.get("locator", "")).startswith(x) for x in prefixes):
            raise SystemExit(f"[promote] 第 {n} 章单元 locator 前缀不在 {prefixes}：{u.get('locator')}")

    if cfg.get("bodyFrom") == "units" and not self_built:
        chunks = []
        for u in ch_units:
            chunks.append(f"### {u.get('sub') or ''} {u.get('title') or ''}".strip())
            chunks.append("")
            chunks.append(strip_meta(u.get("body") or u.get("prose") or ""))
            chunks.append("")
        body = "\n".join(chunks).strip()
    else:
        body = docs_body(docs)
    if not body:
        raise SystemExit(f"[promote] 第 {n} 章取不到正文（bodyFrom={cfg.get('bodyFrom', 'docs')}）")

    L = []
    L.append(f"# 第 {n} 章 · {title}")
    L.append("")
    nature = cfg.get("derivedDesc") or "无同名母本教材，底本由其他课程的单元层聚合而来"
    ref = cfg["basis"].get("reference")
    L.append(
        f"> **层次**：本文件是**{cfg.get('layerLabel') or '派生底本层'}**——" + nature + f"（`{cfg['basis']['evidence']}`）"
        + (f"；参照层 `{ref}`。" if ref else "。")
    )
    unit_hz = sum(hanzi(u.get("body") or u.get("prose") or "") for u in ch_units)
    if hanzi(body) < unit_hz * 0.9:
        L.append(
            f"> **节选标注**：单元层原文 {unit_hz:,} 汉字，本章正文 {hanzi(body):,} 汉字——"
            "教学章 `docs/zh.md` 的「逐单元读」是节选，**教材章继承节选，不冒充全文**；"
            f"回全文请查 `standards/{cfg['slug']}/units.json`。"
        )
    if hanzi(body) < 6000:
        L.append(
            f"> **薄章标注**：本章正文 {hanzi(body):,} 汉字（讲义原文，未扩写）；"
            "学术型教材章基准约 6,000 字，本章未达，**按薄章如实标注，不以扩写冒充**。"
        )
    L.append(f"> **本章要回答的问题：** {cfg_ch['question']}")
    L.append(f"> **免责**：{cfg.get('disclaimer') or '本章为教学整理，不构成诊断或治疗建议；具体处置须由具备资质的人员依规范作出。'}")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## N.1 概念与出处")
    L.append("")
    L.append(
        f"本章 {len(ch_units)} 个单元，locator 形式为 `派生·第N章·X.Y`：**它不是某本书的第几章，"
        "而是本库证候层聚合出的单元编号**。底本没有「原书页码」可引，能核的是这些数字能从 "
        "`standards/zhenghou/证候库.json` 现算（见本章末复算入口）。"
    )
    L.append("")
    # 有母本 locator 的（source 里带「第N章」）就把母本列出来，读者能回原书核
    if self_built:
        L.append("本章是本库**自建章**：底本没有对应章节，内容由本课程组实测数据与教学经验写成，"
                 "不出自任何一本书，因此 N.1 不列「书名第 N 章」，只列本章的依据文件。")
        L.append("")
    has_src = any("第" in str(u.get("source") or "") for u in ch_units)
    if has_src:
        L.append("| 单元 | 派生 locator | 母本出处 | 单元标题 |")
        L.append("|---:|---|---|---|")
        for i, u in enumerate(ch_units, 1):
            L.append(f"| {i} | `{u.get('locator') or ''}` | {u.get('source') or ''} | {u.get('title') or ''} |")
    else:
        L.append("| 单元 | 派生 locator | 单元标题 |")
        L.append("|---:|---|---|")
        for i, u in enumerate(ch_units, 1):
            L.append(f"| {i} | `{u.get('locator') or ''}` | {u.get('title') or ''} |")
    L.append("")
    L.append("## 讲义正文")
    L.append("")
    L.append(body)
    L.append("")
    L.append("## N.2 为什么可以这样翻译")
    L.append("")
    L.append(hand["n2"].strip())
    L.append("")
    L.append("## N.3 这个翻译丢掉了什么")
    L.append("")
    cost = section_of(docs, "代价与边界")
    cost = "\n".join(ln for ln in cost.split("\n") if "免责" not in ln).strip()
    L.append(cost or "本章的边界：分类是工作分类，不是诊断；数据是聚合数据，不是人群调查；结论限于本库口径。")
    L.append("")
    L.append("## N.4 与相邻学科的接口")
    L.append("")
    ifaces = cfg.get("interfaces") or []
    if ifaces:
        lines = ["本章的概念在相邻课程里被继续使用：", ""]
        for it in ifaces:
            lines.append(f"- **{it['course']}**：{it['how']}")
        lines += ["", f"派生关系与聚合方法见 `{cfg['basis']['method']}`。"]
        L.append("\n".join(lines))
    else:
        L.append(f"本章概念进入相邻课程的方式见 `{cfg['basis']['method']}` 的依赖说明。")
    L.append("")
    L.append("## N.5 争议与本项目立场")
    L.append("")
    L.append(hand["n5"].strip())
    L.append("")
    L.append(f"> **免责**：{cfg.get('disclaimer') or '本章为教学整理，不构成诊断或治疗建议；具体处置须由具备资质的人员依规范作出。'}")
    L.append("")
    L.append("## 本章小结")
    L.append("")
    L.append(f"- 本章 {len(ch_units)} 单元；派生 locator 见 N.1，聚合方法见 `{cfg['basis']['method']}`。")
    if cfg.get("summaryPoint"):
        L.append(f"- {cfg['summaryPoint']}")
    L.append("- 本章的边界见 N.3；学界的争议与本项目立场见 N.5。")
    L.append("")
    L.append("## 思考题")
    L.append("")
    for i, q in enumerate(hand.get("check") or [], 1):
        L.append(f"{i}. {q}")
    qs = (quiz or {}).get("questions") or []
    if qs:
        L.append("")
        L.append(f"章末自测（{len(qs)} 题，取自本章 `quiz.json`）：")
        L.append("")
        for q in qs[:4]:
            L.append(f"- {q.get('question')}")
    L.append("")
    L.append("## 延伸阅读")
    L.append("")
    L.append(f"- `{cfg['basis']['evidence']}`——证据层：132 证候 / 14 族的实测底本。")
    L.append(f"- `{cfg['basis']['reference']}`——参照层：九质通行定义。")
    L.append(f"- `{cfg['basis']['method']}`——聚合方法与口径说明。")
    L.append("")
    L.append(
        f"> 复算：`python scripts/promote_course_to_textbook.py --slug {cfg['slug']} --check`；"
        f"教学章 `departments/{cfg['dept']}/{cfg['slug']}/chapters/`。"
    )
    L.append("")
    return "\n".join(L), len(ch_units), len(ch_units), hanzi(body)


def build_appendix(cfg, chapters_meta):
    L = []
    L.append("# 附录B · 教学章与教材章对照")
    L.append("")
    L.append(
        "本课教学计划 8 章与教材 8 章 **一对一**，但**章名不同**：教学章名是叙事壳"
        "（问题→设计→抽样→偏倚→检验→回归→复现→执行），教材章名按底本实际内容命名。"
        "读教材时按下表对照。"
    )
    L.append("")
    L.append("| 教学章 | 教学章名 | 教材章 | 教材章名 | 底本来源 |")
    L.append("|---:|---|---:|---|---|")
    for c in cfg["chapters"]:
        src = "；".join(
            f"《{book_display(s['book'])}》第 {'、'.join(str(x) for x in s['chapters'])} 章"
            for s in c["src"]
        ) or "派生底本（证候层聚合）"
        L.append(f"| 第 {c['teaching']} 章 | {chapters_meta[str(c['teaching'])]} | 第 {c['n']} 章 | {c['title']} | {src} |")
    L.append("")
    L.append("## 为什么两套章名并存")
    L.append("")
    L.append(
        "教学章名承担「这门课怎么讲」的叙事，教材章名承担「这一章讲的是哪本书的哪几章」的可核性。"
        "叙事名与底本内容不对应时（本课即如此：教学第 2 章名为「研究设计与对照」，实际装的是 t 检验、"
        "方差分析与卡方检验），教材若沿用叙事名，读者按章名找不到内容；若教学沿用底本名，教学计划的"
        "推进顺序又被打断。折案是两套并存 + 这张对照表 + 教材 N.1 里的逐单元 locator。"
    )
    L.append("")
    if cfg.get("knownIssues"):
        L.append("## 已登记的教学侧问题")
        L.append("")
        for i, s in enumerate(cfg["knownIssues"], 1):
            L.append(f"{i}. {s}")
        L.append("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--all", action="store_true", help="跑 standards/*/promote.json 里登记的全部课")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.all:
        slugs = sorted(d for d in os.listdir(os.path.join(ROOT, "standards"))
                       if os.path.exists(os.path.join(ROOT, "standards", d, "promote.json")))
        rc = 0
        for sl in slugs:
            print(f"── {sl}")
            rc |= _run_one(sl, a.check)
        return rc
    if not a.slug:
        ap.error("要么 --slug <name>，要么 --all")

    return _run_one(a.slug, a.check)


def _run_one(slug, check):
    sd = os.path.join(ROOT, "standards", slug)
    cfg = read_json(os.path.join(sd, "promote.json"))
    hand = read_json(os.path.join(sd, "promote-hand.json"))["chapters"]
    units_doc = read_json(os.path.join(sd, "units.json"))
    units = units_doc["units"]
    # chapter-map 只在「书名底本」课上存在；派生课没有，读它会把脚本卡在第一步
    cm = read_json(os.path.join(sd, "chapter-map.json")) if os.path.exists(os.path.join(sd, "chapter-map.json")) else {}
    # standards 目录名（slug）与院系学科名（subject）不是一回事：
    # 纪律课用同一串（13-linchuang-keyan-fangfa），tizhi 这种短名只有 standards 侧叫这个
    subj = cfg.get("subject", cfg["slug"])
    cj = read_json(os.path.join(ROOT, "departments", cfg["dept"], subj, "chapters.json"))
    meta = read_json(os.path.join(ROOT, "departments", cfg["dept"], subj, "meta.json"))

    # ── 门 2：章数 1:1 ──
    if len(cfg["chapters"]) != len(cj["chapters"]):
        raise SystemExit(f"[promote] 教材章 {len(cfg['chapters'])} ≠ 教学章 {len(cj['chapters'])}")
    if len(cfg["chapters"]) != meta.get("chaptersTarget"):
        raise SystemExit(f"[promote] 章数 {len(cfg['chapters'])} ≠ meta.chaptersTarget {meta.get('chaptersTarget')}")

    # ── 门 1（全书）：src 声明的底本覆盖面必须 = 单元实际来源集合 ──
    all_declared = set()
    for c in cfg["chapters"]:
        for s in c["src"]:
            for x in s["chapters"]:
                all_declared.add((s["book"], str(x)))
    derived = cfg.get("mode") in ("derived", "units")
    all_actual = set()
    for u in units:
        b, cc = split_book_chapter(u.get("source"))
        all_actual.add((b, cc))
    if derived:
        all_declared, all_actual = set(), set()   # 派生课没有「书名:第N章」可核，改为核 locator 前缀
    if all_declared != all_actual:
        raise SystemExit(
            f"[promote] 全书 src 覆盖不符：缺 {sorted(all_actual - all_declared)}，多 {sorted(all_declared - all_actual)}"
        )

    units_total = {
        "chapters": len(cfg["chapters"]) if derived else len(all_actual),
        "units": len(units),
        "hanzi": sum(hanzi(u.get("body") or u.get("prose") or "") for u in units),
    }

    out_dir = os.path.join(ROOT, "textbooks", cfg["dept"], subj)
    os.makedirs(out_dir, exist_ok=True)

    chapters_meta = {str(c["n"]): c["title"] for c in cj["chapters"]}
    written = []
    stats = []
    for c in cfg["chapters"]:
        n = c["n"]
        h = hand.get(str(n))
        if not h:
            raise SystemExit(f"[promote] promote-hand.json 缺第 {n} 章（N.2/N.5 必须人写）")
        for k in ("n2", "n5"):
            if hanzi(h.get(k)) < 200:
                raise SystemExit(f"[promote] 第 {n} 章 {k} 只有 {hanzi(h.get(k))} 汉字，低于 200（不许占位）")
        slug_dir = os.path.join(ROOT, "departments", cfg["dept"], subj, "chapters", c["teachingSlug"])
        docs = read_text(os.path.join(slug_dir, "docs", "zh.md"))
        quiz_p = os.path.join(slug_dir, "quiz.json")
        quiz = read_json(quiz_p) if os.path.exists(quiz_p) else {}
        if derived:
            text, used, nblocks, hz = build_chapter_derived(cfg, units, c, h, docs, quiz, units_total)
        else:
            text, used, nblocks, hz = build_chapter(cfg, cfg["books"], units, c, h, docs, quiz, units_total)

        # ── 门 3/4：表行数、免责位置 ──
        rows = len(re.findall(r"^\| \d+ \| `", text, re.M))
        _want = [] if c.get("selfBuilt") else [u for u in units if str(u.get("chapter")) in
                 [str(x) for x in (c.get("srcChapters") or [c["teaching"]])]]
        if rows != len(_want):
            raise SystemExit(f"[promote] 第 {n} 章 N.1 表 {rows} 行 ≠ 单元数")
        i55 = text.index("## N.5")
        i_q = text.index("## 思考题")
        if "不构成诊断或治疗建议" not in text[i55:i_q]:
            raise SystemExit(f"[promote] 第 {n} 章免责句不在 N.5 之后、思考题之前")
        _hz = hanzi(text)
        if _hz < 1800:
            raise SystemExit(
                f"[promote] 第 {n} 章只有 {_hz} 汉字，低于教材章下限 1,800（学术型目标 6,000）："
                "先把内容写够，薄章不许静默出版"
            )
        if "数百字/章" in text:
            raise SystemExit(f"[promote] 第 {n} 章 N.3 残留他课模板句「数百字/章」，与底本实测不符")
        if used != nblocks:
            raise SystemExit(f"[promote] 第 {n} 章逐单元读只匹配到 {used}/{nblocks} 个块")
        # 正文汉字必须与来源一致（±2%），防止「节选冒充全文」或漏段
        if derived:
            seg = text[text.index("## 讲义正文"):text.index("## N.2")]
            body_hz = hanzi(seg)
            if cfg.get("bodyFrom") == "units" and not c.get("selfBuilt"):
                _cu = [u for u in units if str(u.get("chapter")) in
                       [str(x) for x in (c.get("srcChapters") or [c["teaching"]])]]
                src_hz = sum(hanzi(u.get("body") or u.get("prose") or "") for u in _cu)
            else:
                src_hz = hanzi(docs_body(docs))
        else:
            seg = text[text.index("## 逐单元读"):text.index("## N.2")]
            body_hz = hanzi(seg)
            src_hz = sum(hanzi(u.get("body") or u.get("prose") or "") for u in
                         [x for x in units if str(x.get("chapter")) == str(c["teaching"])])
        if abs(body_hz - src_hz) > src_hz * 0.02:
            raise SystemExit(f"[promote] 第 {n} 章正文 {body_hz:,} 汉字与来源 {src_hz:,} 差超过 2%")

        fname = f"{n:02d}-第{n}章-{c['title']}.md"
        target = os.path.join(out_dir, fname)
        written.append((target, text))
        stats.append((n, c["title"], hz, len(text)))

    app_p = os.path.join(out_dir, "附录B-教学章与教材章对照.md")
    written.append((app_p, build_appendix(cfg, chapters_meta)))

    if check:
        bad = []
        for pth, text in written:
            disk = read_text(pth) if os.path.exists(pth) else ""
            if disk.replace("\r\n", "\n") != text.replace("\r\n", "\n"):
                bad.append(os.path.relpath(pth, ROOT))
        if bad:
            print("✗ DRIFT（重跑本脚本）: " + ", ".join(bad))
            return 1
        print(f"✓ {len(written) - 1} 章 + 附录B 与 promote.json / units.json 一致")
        return 0

    for pth, text in written:
        with open(pth, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    print(f"✓ 写出 {len(written) - 1} 章 + 附录B → textbooks/{cfg['dept']}/{subj}/")
    for n, t, hz, chars in stats:
        print(f"  第 {n} 章 {t}　{hz:,} 汉字 / {chars:,} 字符")
    return 0


if __name__ == "__main__":
    sys.exit(main())
