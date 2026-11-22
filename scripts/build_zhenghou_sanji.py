#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_sanji.py —— 中医证候学：按「基本理论—基本方法—基本技能」重建 12 章正文

## 为什么要重建

原课程是**一章一门**（风/寒/暑/湿/燥/火/气/瘀/痰/饮/食/虚），那是辞典的**各论目录**，
不是一门课的教学结构：学生学完知道有十二门，却不知道证候学自己的理论、方法与技能是什么。

《中医证候学》第一章「病证概论」（上卷印张 113–139，10 节 / 27,241 汉字）本来就是三段的：
节 1–7 讲**基本理论**（证是什么、由什么构成、怎么命名分类、边界在哪），
节 8–9 讲**基本方法**（传变、辨证求因、审因定位），节 10 讲**基本技能**（论治）。
本脚本照这个分段把 12 章重排，并把辞典的实测数据（12 门 / 45 类 / 291 证 / 1866 候 / 张量 1052）
作为每章的「可算证据」接进来。

各论十二门不丢：它们留在 `standards/zhenghou-cidian/`（结构/正文层/张量）与
`textbooks/01-zhongyi/14-zhongyi-zhenghou-xue/`（12 章辞典正文 + 附录），作为本课程的**语料与案例库**。

## 产物

    departments/01-zhongyi/14-zhongyi-zhenghou-xue/
      chapters.json                 12 章索引（code = S01…S12，S = 三基）
      chapters/<slug>/docs/zh.md    正文（引用概论原文 + 辞典实测）
      chapters/<slug>/code/main.js  本章统计口径（数字全部现算）
      chapters/<slug>/code/main.test.js
      chapters/<slug>/quiz.json     6 题
      chapters/<slug>/outputs/      课堂产出模板

用法：
    python scripts/build_zhenghou_sanji.py            # 写全部
    python scripts/build_zhenghou_sanji.py --check     # 只比对（漂移退出 1）
"""
import argparse
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from zhenghou_sanji_content import CHAPTERS  # noqa: E402
from zhenghou_sanji_content_bu import CHAPTERS_BU  # noqa: E402
CHAPTERS.update(CHAPTERS_BU)

DEPT = os.path.join(ROOT, "departments", "01-zhongyi", "14-zhongyi-zhenghou-xue")
GL = os.path.join(ROOT, "standards", "zhenghou-cidian", "正文-概论.json")
STRUCT = os.path.join(ROOT, "standards", "zhenghou-cidian", "结构.json")
UNITS = os.path.join(ROOT, "standards", "zhenghou", "units.json")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 每章的经典锚点：只引能核到篇名的句子（《素问》《伤寒论》《史记》《汉书》）
CLASSIC = {
    1: ("《伤寒论·辨太阳病脉证并治》", "篇题把「脉、证、并治」写在一起：病与证一处记录、一处处置——三级诊断的起点在篇名里。"),
    2: ("《素问·至真要大论》", "病机十九条把症状归到病机（「诸风掉眩，皆属于肝」），本书的「证象—候—证」是这条思路的结构化。"),
    3: ("《素问·至真要大论》", "「诸暴强直，皆属于风」——以病因名证的传统由此而来；本书补的是病位与层级。"),
    4: ("《素问·玉机真藏论》", "「五脏受气于其所生，传之于其所胜」：传变有方向，这就是「外延」的古典表述。"),
    5: ("《素问·皮部论》", "「百病之始生也，必先于皮毛」：表里相传的经典依据。"),
    6: ("《素问·至真要大论》", "「诸暴强直，皆属于风」「诸病水液澄彻清冷，皆属于寒」——求因看的是特性，不是单一症状。"),
    7: ("《素问·痹论》", "「饮食自倍，肠胃乃伤」：内生之因的经典依据之一。"),
    8: ("《素问·至真要大论》", "「诸风掉眩，皆属于肝」「诸寒收引，皆属于肾」：定位的古典样本——同一病机落不同病位。"),
    9: ("《素问·至真要大论》", "「必伏其所主，而先其所因」：先抓主导，再论其余——取舍规则的源头。"),
    10: ("《素问·至真要大论》", "「谨守病机，各司其属」：论治以病机为据，不以证名为终点。"),
    11: ("《汉书·艺文志·方技略》", "最早把医籍按「医经、经方」分类的目录——分类与检索意识，从汉代就开始了。"),
    12: ("《史记·扁鹊仓公列传》", "仓公「诊籍」是现存最早的病案记录：证候要能被别人复核，这条要求两千年没变。"),
    25: ("《素问·五运行大论》", "「天地阴阳者，不以数推，以象之谓也」——象是可阅的外部，数只是推演；证象学的合法性在这里。"),
    26: ("《伤寒论·辨厥阴病脉证并治》", "「厥」为阴阳气不相顺接：危候看的是气血能否顺接，不是症状的轻重。"),
    27: ("《素问·至真要大论》", "「气有多少，病有盛衰，治有缓急，方有大小」：法随病机而设，方随法之缓急而分。"),
}
CN = "一二三四五六七八九十"


def load():
    gl = json.load(io.open(GL, encoding="utf-8"))
    st = json.load(io.open(STRUCT, encoding="utf-8"))
    un = json.load(io.open(UNITS, encoding="utf-8"))
    return gl, st, un


def sec_index(gl):
    return {s["no"]: s for s in gl["sections"]}


def unit_lookup(un):
    return {u["locator"]: u for u in un["units"]}


def doc_title(slug):
    """各论章的章题以正文 H1 为真源（`# 第 N 章 · 痰证门（M09）` → `痰证门（M09）`）。"""
    p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
    if not os.path.exists(p):
        return None
    head = ""
    with io.open(p, encoding="utf-8") as f:
        for ln in f:
            if ln.startswith("# "):
                head = ln.rstrip("\n")
                break
    m = re.match(r"^#\s*第\s*[0-9一二三四五六七八九十百]+\s*章\s*[·・:：\-—]?\s*(.+?)\s*$", head)
    if m:
        return m.group(1)
    return head[2:].strip() or None


def pick_units(spec, un):
    """按章 spec 取单元：secs 全节；items 形如 '一·（一）' 或 '9'（整节）。"""
    idx = unit_lookup(un)
    out = []
    for s in spec["secs"]:
        for u in un["units"]:
            if u["sec"] != s:
                continue
            if u["level"] == 1:
                out.append(u)
            elif not spec["items"] and u["level"] == 2:
                out.append(u)
    for it in spec["items"]:
        for u in un["units"]:
            if it.isdigit():
                if u["sec"] == int(it) and u["level"] == 1:
                    out.append(u)
                continue
            tail = "·" + it if not it.startswith("一") and not it.startswith("二") else "·" + it
            if u["locator"].endswith(tail) or ("·" + it) in u["locator"]:
                out.append(u)
    # 去重、保序
    seen, res = set(), []
    for u in out:
        if u["locator"] in seen:
            continue
        seen.add(u["locator"])
        res.append(u)
    return res


def excerpt(text, n=520):
    """引文取前 n 字，断在句号上；超出加省略号并注明全文所在。"""
    t = text.replace("\n", "")
    if len(HANZI.findall(t)) <= n:
        return t
    cut = 0
    for i, ch in enumerate(t):
        if ch in "。；":
            if len(HANZI.findall(t[:i])) >= n:
                cut = i + 1
                break
    return t[:cut] + "……（全文见 `standards/zhenghou-cidian/正文-概论.json`）"


def docs_md(spec, gl, st, un, units):
    secs = spec["secs"]
    gl_chars = sum(s["chars"] for s in gl["sections"] if s["no"] in secs)
    names = "、".join("第%s节 %s" % (CN[s["no"] - 1], s["title"]) for s in gl["sections"] if s["no"] in secs)
    sz = st["counts"]
    lines = []
    A = lines.append
    A("# 第 %d 章 · %s" % (spec["n"], spec["title"]))
    A("")
    A("> **MOTTO:** %s" % spec["motto"])
    A(">")
    A("> **PROBLEM:** %s" % spec["problem"])
    A(">")
    A("> **双根因定位:** %s" % spec["roots"])
    A("")
    A("**母本出处:** 《中医证候学》第一章 病证概论 %s（上卷印张 113–139）。原文层 "
      "`standards/zhenghou-cidian/正文-概论.json`（OCR 逐字，校勘见其 `校勘` 字段）；"
      "单元层 `standards/zhenghou/units.json`（51 单元）。本章数字由 `code/main.js` 现算。" % names)
    A("")
    A("## 课程信息")
    A("")
    A("| 项目 | 内容 |")
    A("|---|---|")
    A("| 学科 | 中医证候学（中医系第 14 门） |")
    A("| 章序号 | %d / 27（%s） |" % (spec["n"], spec["part"]))
    A("| 三基定位 | %s |" % spec["part"])
    A("| 对应概论 | %s |" % names)
    A("| 本单元层 | %d 条（%s） |" % (len(units), "、".join(u["locator"] for u in units[:4]) + ("…" if len(units) > 4 else "")))
    A("| 概论本篇字数 | %d 汉字 |" % gl_chars)
    A("| 辞典规模 | %d 门 · %d 类 · %d 证 · %d 候 · 张量 %d 格 |" % (sz["men"], sz["lei"], sz["zhengInstances"], sz["houInstances"], sz["tensorCells"]))
    A("| 判据词 | **%s** |" % spec["judge"])
    A("")
    ck, cwhy = CLASSIC[spec["n"]]
    A("**经典锚点:** %s —— %s" % (ck, cwhy))
    A("")
    A("## 一、%s" % spec["title"].split("：")[0])
    A("")
    A(spec["intro"].strip())
    A("")
    A("## 二、概论原文（本章锚点）")
    A("")
    for u in units[:4]:
        A("**`%s`**" % u["locator"])
        A("")
        A("> " + excerpt(u["body"]))
        A("")
    A(spec["read"].strip())
    A("")
    A("## 三、辞典实测：这一章能被算出来的部分")
    A("")
    A(spec["data"].strip())
    A("")
    A("| 口径 | 值 | 来源 |")
    A("|---|---|---|")
    A("| 本章概论字数 | %d | 正文-概论.json |" % gl_chars)
    A("| 本章单元数 | %d | standards/zhenghou/units.json |" % len(units))
    A("| 全书门/类/证/候 | %d / %d / %d / %d | 结构.json |" % (sz["men"], sz["lei"], sz["zhengInstances"], sz["houInstances"]))
    A("| 张量非零格 | %d | 张量.json |" % sz["tensorCells"])
    A("")
    A("## 四、误判清单")
    A("")
    A(spec["misjudge"].strip())
    A("")
    A("## 五、代价与边界")
    A("")
    A(spec["boundary"].strip())
    A("")
    A("写厚这一章的代价写在这里：概论只有 2.7 万字，它是**总论**，讲的是规则不是病例；"
      "把它当全部证候学来学，会得到一套干净但干旱的框架。所以每章的实测表都把读者指回辞典正文层"
      "（1866 条候的原书释义）——**规则在概论，材料在辞典，两者不能互相替代**。")
    A("")
    A("## 六、验证")
    A("")
    A("```bash")
    A("node code/main.js                                # 本章统计（现算）")
    A("node --test code/main.test.js                    # 本章自检")
    A("python scripts/build_zhenghou_sanji.py --check    # 12 章正文是否仍与概论/辞典一致")
    A("```")
    A("")
    A("- [ ] " + "\n- [ ] ".join(spec["checks"]))
    A("")
    A("**免责声明**：本章为教学与工程用途的证候结构重建，不构成诊疗建议。任何证候判定都必须由执业中医师结合四诊完成。")
    A("")
    return "\n".join(lines)


MAIN_TMPL = r'''#!/usr/bin/env node
/**
 * 中医证候学 · 第 __N__ 章 __TITLE__（三基·__PART__）：本章统计口径
 * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/__SLUG__/docs/zh.md
 * 数据: standards/zhenghou-cidian/正文-概论.json（概论 10 节 / 27,241 汉字）
 *       standards/zhenghou-cidian/结构.json（12 门 / 45 类 / 291 证 / 1866 候）
 *       standards/zhenghou/units.json（概论切出的 51 单元）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章覆盖的概论节与单元、字数、以及辞典的规模口径。
 * 不写死任何一个计数 —— 母本一变，本章的表就跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou-cidian', '正文-概论.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenghou-cidian/正文-概论.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const GL = path.join(ROOT, 'standards', 'zhenghou-cidian', '正文-概论.json');
const STRUCT = path.join(ROOT, 'standards', 'zhenghou-cidian', '结构.json');
const UNITS = path.join(ROOT, 'standards', 'zhenghou', 'units.json');
const CHAPTER = __N__;
const SECS = __SECS__;      // 本章覆盖的概论节号
const ITEMS = __ITEMS__;    // 本章额外引证的小节尾号（空数组＝引整节）

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function gl() { return readJson(GL); }
function struct() { return readJson(STRUCT); }
function units() { return readJson(UNITS); }

function sectionStats(data) {
  const secs = data.sections.filter((s) => SECS.includes(s.no));
  return {
    sections: secs,
    chars: secs.reduce((a, s) => a + s.chars, 0),
    titles: secs.map((s) => '第' + '一二三四五六七八九十'[s.no - 1] + '节 ' + s.title),
  };
}

function chapterUnits(data) {
  const us = data.units.filter((u) => SECS.includes(u.sec));
  const base = us.filter((u) => u.level === 1 || (ITEMS.length === 0 && u.level === 2));
  const extra = ITEMS.length === 0 ? [] : us.filter((u) => u.level > 1 && ITEMS.some((t) => u.locator.endsWith('·' + t)));
  const all = [...base, ...extra].filter((u, i, a) => a.findIndex((x) => x.locator === u.locator) === i);
  return { units: all, chars: all.reduce((a, u) => a + u.hanzi, 0) };
}

function stats() {
  const g = gl(); const st = struct(); const un = units();
  const s = sectionStats(g); const cu = chapterUnits(un);
  return {
    chapter: CHAPTER,
    secs: SECS,
    sectionTitles: s.titles,
    sectionChars: s.chars,
    units: cu.units.length,
    unitChars: cu.chars,
    locators: cu.units.map((u) => u.locator),
    book: {
      men: st.counts.men, lei: st.counts.lei,
      zheng: st.counts.zhengInstances, hou: st.counts.houInstances,
      tensorCells: st.counts.tensorCells,
    },
    gl: { sections: g.sections.length, chars: g.counts.chars },
  };
}

function report() {
  const s = stats();
  const rows = [
    ['章', String(s.chapter)],
    ['覆盖概论', s.sectionTitles.join('；')],
    ['概论字数（汉字）', String(s.sectionChars)],
    ['本章单元', String(s.units) + '（' + s.unitChars + ' 字）'],
    ['辞典规模', s.book.men + ' 门 / ' + s.book.lei + ' 类 / ' + s.book.zheng + ' 证 / ' + s.book.hou + ' 候'],
    ['张量非零格', String(s.book.tensorCells)],
  ];
  for (const [k, v] of rows) console.log(k.padEnd(16, ' ') + ' ' + v);
  console.log('— 数字全部由 standards/zhenghou-cidian/ 与 standards/zhenghou/units.json 现算；本课只讲规则与判据，不构成诊疗建议。');
  return s;
}

if (require.main === module) report();

module.exports = { CHAPTER, SECS, ITEMS, load: { gl, struct, units }, stats, sectionStats, chapterUnits, hanzi };
'''

TEST_TMPL = r'''#!/usr/bin/env node
/**
 * 第 __N__ 章 __TITLE__ 单元测试：断言全部从母本现算，不写死数字。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const lib = require('./main.js');

const g = lib.load.gl();
const st = lib.load.struct();
const un = lib.load.units();
const s = lib.stats();

test('本章覆盖的概论节都在母本里', () => {
  assert.deepStrictEqual(s.secs, lib.SECS);
  for (const no of lib.SECS) assert.ok(g.sections.some((x) => x.no === no), '概论缺第 ' + no + ' 节');
});

test('概论字数与逐节相加一致', () => {
  const manual = g.sections.filter((x) => lib.SECS.includes(x.no)).reduce((a, x) => a + (x.chars || 0), 0);
  assert.strictEqual(s.sectionChars, manual);
  assert.ok(s.sectionChars > 300, '本章概论字数过少：' + s.sectionChars);
});

test('单元数与 units.json 的逐条遍历一致', () => {
  const manual = lib.chapterUnits(un).units.length;
  assert.strictEqual(s.units, manual);
  assert.ok(s.units >= 1);
});

test('每个 locator 都能在 units.json 里回查', () => {
  const all = new Set(un.units.map((u) => u.locator));
  for (const loc of s.locators) assert.ok(all.has(loc), '回查不到单元 ' + loc);
});

test('辞典规模口径与结构.json 同源', () => {
  assert.strictEqual(s.book.men, st.counts.men);
  assert.strictEqual(s.book.hou, st.counts.houInstances);
  assert.ok(s.book.zheng >= s.book.men);
});

test('正文里的免责与边界声明存在', () => {
  const p = require('node:path').join(__dirname, '..', 'docs', 'zh.md');
  const md = require('node:fs').readFileSync(p, 'utf8');
  assert.ok(md.includes('不构成诊疗建议'), '缺免责声明');
  assert.ok(md.includes('概论原文'), '缺原文锚点一节');
});
'''

OUT_PROMPT = """# 课堂产出模板 · 第 {n} 章 {title}

## 用途

把本章的规则套到你手上的四诊资料上，产出下面五行。写完之后交给同学复算：他能算出同一个证名与候名，这份记录才算成立；算不出，说明中间某一步缺证据。本模板只用于教学演练，不产生诊疗结论。

| 行 | 写什么 | 判据来源 |
|---|---|---|
| 1 证象清单 | 症象/脉象/舌象归并成哪几条证象 | 概论第 2、4 节；附录 G |
| 2 求因 | 支持了哪几条病因特性（不是只写结论） | 概论第 9 节一（15 条） |
| 3 定位 | 首位病位 + 兼位，依据哪一组证象 | 概论第 9 节二（12 条 + 表 13–39） |
| 4 证名与候名 | 病因＋双病位 / 病层＋病机状态 | 概论第 3、5、6 节 |
| 5 取舍与治法方向 | 排除了什么；治法方向（不给方药） | 概论第 7、10 节 |

## 填写示例（以风门卫气失宣候为例）

- 第 1 行：恶寒无汗、头身疼痛、鼻塞流清涕、苔薄白、脉浮紧 → 「卫气失宣」这一条证象。
- 第 2 行：支持「风性疏泄」（清涕、汗不出而恶风）与「风性紧暴」（起病急、脉浮紧）。
- 第 3 行：首位病位肺卫（主症在肺与表），无兼位。
- 第 4 行：证名肺卫风寒证；候名卫气失宣候（L01-Z01-H001）。
- 第 5 行：排除里热（无口渴、舌不红、脉不数）；治法方向辛温宣散，兼化痰（隐性病因）。

## 自检

1. 每一步都能指回概论的具体一节；指不回，删掉这一步重写。
2. 结论里有几个病因、几个病位？超过两个，说明取舍没做（第 9 章）。
3. 有没有写「排除记录」？没写就等于没鉴别。

**边界**：本模板是思维训练工具，不构成诊疗建议；真实病例由执业中医师依四诊处置。
"""

OUT_SKILL = """---
name: {base}
description: 中医证候学第 {n} 章「{title}」的可复用技能卡：{problem_short} 用概论给的判据逐条对，产出可复核的证名与候名。
version: 1.0.0
---

# 技能卡 · 第 {n} 章 {title}

**一句话**：{problem_short}

## 三个动作

1. 认出本章管的那一类证据（判据词：{judge}）。
2. 按概论给的判据逐条对，写出「支持了哪一条」，不只写结论。
3. 把结论落到四级位置（门-类-证-候）或七步工序的某一步上，供复核。

## 两个不许

- 不许用症状代替依据（「有发热故为热」不合格）。
- 不许跳过排除记录（鉴别过什么都没写＝没鉴别）。

## 回查

- 原文：`standards/zhenghou-cidian/正文-概论.json`（概论十节，OCR 逐字，含校勘）
- 单元：`standards/zhenghou/units.json`（51 单元）
- 本章口径：`node code/main.js`（数字现算）

**边界**：技能卡用于教学与工程复算，不构成诊疗建议。
"""


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)


def build():
    gl, st, un = load()
    files = {}
    idx = {"slug": "14-zhongyi-zhenghou-xue", "title": "中医证候学",
           "volume": "辞典（操作手册型）",
           "structure": "基本理论（1–4 章）· 基本方法（5–9 章）· 基本技能（10–12 章）",
           "chapters": []}
    for key in sorted(CHAPTERS):
        spec = CHAPTERS[key]
        # 章目录带码：01-s01-bing-zheng-hou（小写；仓库 L1 的 slug 规则禁大写）
        slug = "%02d-s%02d-%s" % (spec["n"],
                                  spec["n"] if spec["n"] <= 12 else spec["n"] - 12,
                                  key.split("-", 1)[1])
        units = pick_units(spec, un)
        idx["chapters"].append({
            "n": spec["n"], "slug": slug, "title": spec["title"], "status": "✅",
            "code": "S%02d" % (spec["n"] if spec["n"] <= 12 else spec["n"] - 12), "part": spec["part"],
            "secs": spec["secs"], "units": len(units),
            "judge": spec["judge"],
        })
        files[os.path.join(DEPT, "chapters", slug, "docs", "zh.md")] = docs_md(spec, gl, st, un, units)
        main = (MAIN_TMPL.replace("__N__", str(spec["n"])).replace("__TITLE__", spec["title"])
                .replace("__PART__", spec["part"]).replace("__SLUG__", slug)
                .replace("__SECS__", json.dumps(spec["secs"]))
                .replace("__ITEMS__", json.dumps(spec["items"], ensure_ascii=False)))
        files[os.path.join(DEPT, "chapters", slug, "code", "main.js")] = main
        files[os.path.join(DEPT, "chapters", slug, "code", "main.test.js")] = (
            TEST_TMPL.replace("__N__", str(spec["n"])).replace("__TITLE__", spec["title"]))
        quiz = {"lesson": slug, "title": spec["title"], "subject": "14-zhongyi-zhenghou-xue",
                "stage": "三基·" + spec["part"],
                "questions": [{"stage": ("pre" if i < 1 else "check" if i < 4 else "post"),
                               "question": q, "options": o, "correct": c, "explanation": e}
                              for i, (q, o, c, e) in enumerate(spec["quiz"])]}
        files[os.path.join(DEPT, "chapters", slug, "quiz.json")] = json.dumps(quiz, ensure_ascii=False, indent=2) + "\n"
        files[os.path.join(DEPT, "chapters", slug, "outputs", "prompt-%s.md" % slug[3:])] = OUT_PROMPT.format(
            n=spec["n"], title=spec["title"])
        files[os.path.join(DEPT, "chapters", slug, "outputs", "skill-%s.md" % slug[3:])] = OUT_SKILL.format(
            n=spec["n"], title=spec["title"], base=slug[3:],
            problem_short=spec["problem"].split("。")[0] + "。", judge=spec["judge"])
    # 各论十二门（13–24 章）：文件不由本脚本生成（辞典早期版本所出，现冻结为静态），
    # 只在 chapters.json 里登记 —— 课程是「三基为纲（1–12）+ 各论为目（13–24）」。
    croot = os.path.join(DEPT, "chapters")
    for men in st["men"]:
        n2 = men["n"] + 12
        hit = sorted(d for d in os.listdir(croot) if d.startswith("%02d-" % n2))
        if not hit:
            continue
        idx["chapters"].append({
            "n": n2, "slug": hit[0], "title": doc_title(hit[0]) or (men["zh"] + "门（各论·" + men["code"] + "）"),
            "status": "✅", "code": men["code"], "part": "各论", "secs": [], "units": 0,
            "judge": "门内判据",
        })
    idx["chapters"].sort(key=lambda c: c["n"])
    files[os.path.join(DEPT, "chapters.json")] = json.dumps(idx, ensure_ascii=False, indent=2) + "\n"
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    files = build()
    drift = []
    for p, txt in files.items():
        old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if old != txt:
            drift.append(p)
    if a.check:
        if drift:
            print("DRIFT: %d 个文件与母本不一致：" % len(drift))
            for p in drift[:12]:
                print("   " + os.path.relpath(p, ROOT))
            print("   请跑 python scripts/build_zhenghou_sanji.py")
            return 1
        print("✓ 三基 12 章正文一致（%d 文件）" % len(files))
        return 0
    for p, txt in files.items():
        write(p, txt)
    tot = sum(len(HANZI.findall(t)) for p, t in files.items() if p.replace("\\", "/").endswith("docs/zh.md"))
    print("✓ 三基 12 章：%d 文件 · 正文 %d 汉字（%d 章）" % (len(files), tot, len(CHAPTERS)))
    for key in sorted(CHAPTERS):
        spec = CHAPTERS[key]
        slug = "%02d-s%02d-%s" % (spec["n"],
                                  spec["n"] if spec["n"] <= 12 else spec["n"] - 12,
                                  key.split("-", 1)[1])
        md = files[os.path.join(DEPT, "chapters", slug, "docs", "zh.md")]
        print("   %2d %-26s %-6s %5d 字" % (spec["n"], spec["title"][:26], spec["part"][2:], len(HANZI.findall(md))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
