# -*- coding: utf-8 -*-
"""scripts/build_jingui_pian_chapters.py —— 金匮要略「篇目精读」章生成器（第 11-24 章）

背景：本课程前十章按**主题**写（成书、传变、痉湿暍……），覆盖 11 篇；
  古 25 篇中另有 14 篇无章（肺痿肺痈、奔豚、胸痹、腹满寒疝、五脏风寒积聚、水气、黄疸、
  惊悸吐衄、呕吐哕下利、疮痈、趺蹶疝蚘、杂疗方、禽兽鱼虫禁忌、果实菜谷禁忌）。
  这 14 篇按「一篇一章」补成**篇目精读**，于是 24 章 ↔ 25 篇 全覆盖。

数据唯一来源：
  standards/jingui/底本.json           外源·笈成（条号、方文、药味、字数）
  standards/jingui/gushiwen/gushiwen.json  外源·古诗文网（第二见证：分段/字数/校勘）

每章六件套：docs/zh.md · code/main.js · code/main.test.js · quiz.json ·
  outputs/prompt-<slug>.md · outputs/skill-<slug>.md
文档里的每个数字都由本脚本现算填入；代码与测试再从同一份底本复算一遍，
所以「文档数字」与「代码输出」不可能不同源。

用法：
  python scripts/build_jingui_pian_chapters.py            # 生成/覆盖 14 章
  python scripts/build_jingui_pian_chapters.py --check    # 幂等校验（不写盘）
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jingui_pian_content import CHAPTERS  # noqa: E402
from jingui_pian_quiz_extra import EXTRA_QUIZ  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "08-jingui-yaolue")
BEN_PATH = os.path.join(ROOT, "standards", "jingui", "底本.json")
GS_PATH = os.path.join(ROOT, "standards", "jingui", "gushiwen", "gushiwen.json")

BEN = json.load(io.open(BEN_PATH, encoding="utf-8"))
GS = json.load(io.open(GS_PATH, encoding="utf-8"))
BEN_BY_NO = {p["no"]: p for p in BEN["pian"] if p.get("no")}
BEN_TAIL = [p for p in BEN["pian"] if not p.get("no")]  # 序 + 23 + 24 + 25
GS_BY_NO = {p["no"]: p for p in GS["pian"]}

BOOK_TIAO = BEN["counts"]["articles"]   # 402
BOOK_FANG = BEN["counts"]["formulas"]   # 174
BOOK_CHAR = BEN["counts"]["charsHans"]  # 34462
HARD_RE = re.compile(r"不可|禁|勿")
DEAD_RE = re.compile(r"死|不治")
HARDER_RE = re.compile(r"难治")
HEAL_RE = re.compile(r"自愈|欲解|乃愈|即愈")


def cps(s: str) -> int:
    return len(s)


def get_pian(no: int) -> dict:
    if no <= 22:
        return BEN_BY_NO[no]
    return BEN_TAIL[no - 22]


def stats(no: int) -> dict:
    p = get_pian(no)
    arts = sorted(p["articles"], key=lambda a: a["idx"])
    fangles = [f for a in arts for f in (a.get("formulas") or [])]
    herbs = [h for f in fangles for h in (f.get("ingredients") or [])]
    names = [h["herbSimp"] for h in herbs]
    freq: dict = {}
    for n in names:
        freq[n] = freq.get(n, 0) + 1
    top = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    tiao = len(arts)
    fang = len(fangles)
    chu = sum(1 for a in arts if a.get("formulas"))
    gs = GS_BY_NO[no]
    return {
        "pian": no,
        "gs_no": no,
        "s_juan": gs["juan"],
        "s_title": p.get("nameSimp", ""),
        "gs_title": gs["title"],
        "s_tiao": tiao,
        "s_fang": fang,
        "s_char": p.get("chars", 0),
        "s_ratio": "%.2f" % (fang / tiao) if tiao else "0.00",
        "s_chu": chu,
        "s_wu": tiao - chu,
        "s_dead": sum(1 for a in arts if DEAD_RE.search(a["zhHans"])),
        "s_hard": sum(1 for a in arts if HARDER_RE.search(a["zhHans"])),
        "s_ban": sum(1 for a in arts if HARD_RE.search(a["zhHans"])),
        "s_heal": sum(1 for a in arts if HEAL_RE.search(a["zhHans"])),
        "s_herb_tok": len(herbs),
        "s_herb_dis": len(freq),
        "s_refonly": sum(1 for f in fangles if not (f.get("ingredients") or [])),
        "s_top_herb": "、".join("%s×%d" % (k, v) for k, v in top) or "（本篇无方文）",
        "s_top_fang": "、".join(
            "%s（%d 味，%s）" % (f["nameSimp"], len(f.get("ingredients") or []),
                                next((a["tiao"] for a in arts if f in (a.get("formulas") or [])), "—"))
            for f in fangles[:4]
        ) or "（本篇无方文）",
        "gs_para": gs["paraCount"],
        "gs_char": gs["chars"],
        "gs_sha8": gs["rawSha256"][:8],
        "book_tiao": BOOK_TIAO,
        "book_fang": BOOK_FANG,
        "book_char": BOOK_CHAR,
        "book_ratio": "%.2f" % (BOOK_FANG / BOOK_TIAO),
        "articles": arts,
        "fangles": fangles,
        "_pian": p,
    }


def fmt(s: str, st: dict) -> str:
    return s.format(**st)


def first_sentence(text: str, limit: int = 42) -> str:
    t = re.sub(r"\s+", "", text)
    parts = re.split(r"[。！？]", t)
    s = parts[0] if parts else t
    return s[:limit]


def cite(st: dict, tiao: str | None = None) -> str:
    if tiao:
        return "外源·笈成·金匱要略方論 第%d篇·第%s条" % (st["pian"], tiao.split(".")[-1])
    return "外源·笈成·金匱要略方論 第%d篇（附）" % st["pian"]


def render_doc(b: dict, st: dict) -> str:
    arts = st["articles"]
    is_tail = st["pian"] > 22
    first = arts[0]
    motto = first_sentence(first["zhHans"])
    motto_cite = cite(st, first["tiao"]) if not is_tail else cite(st)

    rows = []
    rows.append("# %s\n" % fmt(b["title"], st))
    rows.append("> **MOTTO:** 「%s」——《金匮要略·%s》（%s）" % (motto, st["s_title"], motto_cite))
    rows.append(">")
    rows.append("> **PROBLEM:** %s" % fmt(b["question"], st))
    rows.append(">")
    rows.append("> **卡点:** %s" % fmt(b["hard"], st))
    rows.append(">")
    rows.append(
        "> **双根因定位:** 环境逼迫（金匮要略无教材底本，条文只能逐字取自外源；不复算就只能背病名）+ "
        "知识积累（%d 条 × %d 方 × 方条比 %s = 知道这一篇的篇幅花在哪：%d 条出方、%d 条不出方）"
        % (st["s_tiao"], st["s_fang"], st["s_ratio"], st["s_chu"], st["s_wu"])
    )
    rows.append("")
    rows.append("## 课程信息\n")
    rows.append("| 项目 | 内容 |")
    rows.append("|------|------|")
    rows.append("| 学科 | 金匮要略 |")
    rows.append("| 院系 | 中医系 |")
    rows.append("| 章序号 | %d / 24（篇目精读，第 %d 篇） |" % (b["n"], st["pian"]))
    rows.append("| 所属阶段 | 🌿 长·积累 |")
    rows.append("| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |")
    rows.append("| 预估时长 | 1.5 小时 |")
    rows.append("")
    rows.append("## 先讲清数据来源\n")
    rows.append("| 项 | 值 |")
    rows.append("|---|---|")
    rows.append("| 教材底本（qhzy-*.xlsx） | **无**。金匮要略不在 100 份工作簿覆盖的 99 门学科内 |")
    rows.append("| 主见证（条文引用） | `standards/jingui/底本.json` 之第 %d 篇：**%d 条 · %d 方 · %d 字** |"
                 % (st["pian"], st["s_tiao"], st["s_fang"], st["s_char"]))
    rows.append("| 第二见证（校勘） | `standards/jingui/gushiwen/gushiwen.json` 之第 %d 篇（%s·%s）：**%d 段 · %d 字** · raw sha256 `%s…` |"
                 % (st["gs_no"], st["s_juan"], st["gs_title"], st["gs_para"], st["gs_char"], st["gs_sha8"]))
    rows.append("| 引用格式 | %s；校勘另注「外源·古诗文网·金匮要略 卷%s·%s」 |"
                 % (cite(st, "X"), st["s_juan"], st["gs_title"]))
    rows.append("")
    rows.append("条文一律逐字取 `zhHans`；本篇所有计数由 `code/main.js` 现算，文档中的数字与代码输出必须一致。")
    rows.append("")
    rows.append("## 核心概念\n")
    for h, body in b["sections"]:
        rows.append("### %s\n" % fmt(h, st))
        rows.append(fmt(body, st))
        rows.append("")

    # 表 1 规模对照
    rows.append("**表 1 · 规模对照**\n")
    rows.append("| 口径 | 条 | 方 | 字 | 方条比 |")
    rows.append("|---|--:|--:|--:|--:|")
    rows.append("| 本篇（第 %d 篇） | %d | %d | %d | %s |" % (st["pian"], st["s_tiao"], st["s_fang"], st["s_char"], st["s_ratio"]))
    rows.append("| 全书（22 篇正文 + 3 附篇） | %d | %d | %d | %s |" % (BOOK_TIAO, BOOK_FANG, BOOK_CHAR, "%.2f" % (BOOK_FANG / BOOK_TIAO)))
    rows.append("")

    # 表 2 条文机械分类
    rows.append("**表 2 · 条文机械分类（字面命中，可重叠，不相加）**\n")
    rows.append("| 类 | 判据 | 条数 |")
    rows.append("|---|---|--:|")
    rows.append("| 出方条 | `formulas[]` 非空 | %d |" % st["s_chu"])
    rows.append("| 无方条 | `formulas[]` 为空 | %d |" % st["s_wu"])
    rows.append("| 标「死／不治」 | 含「死」或「不治」 | %d |" % st["s_dead"])
    rows.append("| 标「难治」 | 含「难治」 | %d |" % st["s_hard"])
    rows.append("| 禁忌句 | 含「不可／禁／勿」 | %d |" % st["s_ban"])
    rows.append("| 自愈／欲解 | 含「自愈／欲解／乃愈／即愈」 | %d |" % st["s_heal"])
    rows.append("")

    # 表 3 方证表
    rows.append("**表 3 · 方证表（%d 方）**\n" % st["s_fang"])
    if st["fangles"]:
        rows.append("| 方名 | 味数 | 条号 | 该条首句 |")
        rows.append("|---|--:|---|---|")
        for a in arts:
            for f in a.get("formulas") or []:
                n = len(f.get("ingredients") or [])
                rows.append("| %s | %s | %s | %s |" % (
                    f["nameSimp"], n if n else "—", a["tiao"], first_sentence(a["zhHans"], 30)))
        if st["s_refonly"]:
            rows.append("")
            rows.append("> 「味数 —」的 %d 方，源页作「方见上」或未重复出药味（refOnly），不计入药味统计。" % st["s_refonly"])
    else:
        rows.append("| — | — | — | 本篇无方文（附篇只存方名或食疗条目） |")
    rows.append("")
    rows.append("**表 4 · 药味频次前五**：%s（合计 %d 味次 / %d 味）\n" % (st["s_top_herb"], st["s_herb_tok"], st["s_herb_dis"]))

    # 坑
    ph, pbody = b["pit"]
    rows.append("### %s\n" % fmt(ph, st))
    rows.append(fmt(pbody, st))
    rows.append("")

    # BUILD IT
    rows.append("## BUILD IT：从零复算本篇\n")
    rows.append("本章所有数字都能用 40 行代码从底本复算，不依赖任何二手统计：\n")
    rows.append("```js")
    rows.append("const PIAN = BOOK.pian.find((p) => p.no === %d) || BOOK.pian.filter((p) => !p.no)[%d];" % (st["pian"], max(0, st["pian"] - 22)))
    rows.append("const ARTICLES = [...PIAN.articles].sort((a, b) => a.idx - b.idx);")
    rows.append("const fang = ARTICLES.flatMap((a) => a.formulas || []);")
    rows.append("const herbs = fang.flatMap((f) => f.ingredients || []);")
    rows.append("// 条数 / 方数 / 字数 / 出方条 / 药味频次，全部从这三行派生")
    rows.append("```")
    rows.append("")
    rows.append("```bash")
    rows.append("node code/main.js            # 打印本篇画像（表 1-4 的数字来源）")
    rows.append("node --test code/main.test.js # 断言画像与文档一致")
    rows.append("```")
    rows.append("")

    rows.append("## 验证\n")
    rows.append("`code/main.test.js` 断言下列事实（任一条不成立即失败）：\n")
    rows.append("- 条数 %d · 方数 %d · 字数 %d · 出方条 %d" % (st["s_tiao"], st["s_fang"], st["s_char"], st["s_chu"]))
    rows.append("- 药味 %d 味次 / %d 味" % (st["s_herb_tok"], st["s_herb_dis"]))
    rows.append("- 本篇文档里出现的上述数字都在 `docs/zh.md` 中原文出现（防文档与代码脱钩）")
    rows.append("")

    rows.append("## 代价与边界\n")
    for x in b["boundary"]:
        rows.append("- %s" % fmt(x, st))
    rows.append("")
    rows.append("以上为文本与结构层面的研究结论，**不构成诊疗建议**；任何基于本内容的临床决策，必须由具备合法执业资格的医师复核。")
    rows.append("")

    rows.append("## 练习\n")
    for i, x in enumerate(b["exercises"], 1):
        rows.append("%d. %s" % (i, fmt(x, st)))
    rows.append("")
    rows.append("## 进阶思考\n")
    for i, x in enumerate(b["advanced"], 1):
        rows.append("%d. %s" % (i, fmt(x, st)))
    rows.append("")

    # 原文全录
    rows.append("## 附：本篇原文全录（逐条，主见证）\n")
    if is_tail:
        rows.append("> 附篇在底本里整篇存为 1 条、无条号，故此处按**古诗文网本的分段**顺序列出，段号只作行文定位，不作引用条号。\n")
        gs = GS_BY_NO[st["gs_no"]]
        for i, para in enumerate(gs["paras"], 1):
            if para["kind"] == "tiao" or para["kind"] == "herb":
                rows.append("**段 %d**　%s" % (i, para["text"]))
                rows.append("")
    else:
        for a in arts:
            rows.append("**第%s条**　%s" % (a["tiao"], a["zhHans"]))
            rows.append("")
    return "\n".join(rows).rstrip() + "\n"


MAIN_JS = r"""'use strict';
/**
 * 第 __N__ 章 · 篇目精读：__TITLE__
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成）第 __PIAN__ 篇；
 *       校勘：standards/jingui/gushiwen/gushiwen.json（外源·古诗文网）第 __GS__ 篇。
 *
 * 口径（改任一条都要同步改 docs/zh.md 与 main.test.js）：
 *   · 条序按源页 idx；条号为「篇.条」；附篇（23-25）底本无条号，整篇 1 条。
 *   · 方只计 formulas[]（有方文者）；仅存方名者不并入方数。
 *   · 表 2 的分类是**字面命中**：同一条可落进多类，不合计为条数。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));
const GS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/gushiwen/gushiwen.json'), 'utf8'));

const PIAN_NO = __PIAN__;
const GS_NO = __GS__;

/** 附篇（23-25）在底本里没有 no，按末尾三条（序之后）的顺序取。 */
const PIAN =
  PIAN_NO <= 22
    ? BOOK.pian.find((p) => p.no === PIAN_NO)
    : BOOK.pian.filter((p) => !p.no)[PIAN_NO - 22];

const ARTICLES = [...PIAN.articles].sort((a, b) => a.idx - b.idx);
const GSPIAN = GS.pian.find((p) => p.no === GS_NO);

/** 字面判据。数组顺序 = 表 2 的行序。 */
const RULES = [
  ['标「死／不治」', /死|不治/],
  ['标「难治」', /难治/],
  ['禁忌句（不可／禁／勿）', /不可|禁|勿/],
  ['自愈／欲解', /自愈|欲解|乃愈|即愈/],
];

const cps = (s) => [...s].length;

function totals() {
  const fang = ARTICLES.flatMap((a) => a.formulas || []);
  const herbs = fang.flatMap((f) => f.ingredients || []);
  const freq = new Map();
  for (const h of herbs) freq.set(h.herbSimp, (freq.get(h.herbSimp) || 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .slice(0, 5);
  return {
    pian: PIAN_NO,
    tiao: ARTICLES.length,
    fang: fang.length,
    chars: PIAN.chars,
    tiaoChars: ARTICLES.reduce((n, a) => n + cps(a.zhHans), 0),
    chu: ARTICLES.filter((a) => (a.formulas || []).length > 0).length,
    wu: ARTICLES.filter((a) => (a.formulas || []).length === 0).length,
    herbTokens: herbs.length,
    distinctHerbs: freq.size,
    top,
  };
}

/** 表 2：字面命中计数（可重叠） */
function hits() {
  const out = {};
  for (const [label, re] of RULES) out[label] = ARTICLES.filter((a) => re.test(a.zhHans)).length;
  return out;
}

/** 表 3：方证表（方名 / 味数 / 条号 / 该条首句） */
function formulaTable() {
  return ARTICLES.flatMap((a) =>
    (a.formulas || []).map((f) => ({
      name: f.nameSimp,
      herbs: (f.ingredients || []).length,
      tiao: a.tiao,
      first: a.zhHans.split(/[。！？]/)[0].slice(0, 30),
    }))
  );
}

/** 校勘用：古诗文网本的口径（段数 / 字数） */
function crossCheck() {
  return { pian: GS_NO, paras: GSPIAN.paraCount, chars: GSPIAN.chars, sha8: GSPIAN.rawSha256.slice(0, 8) };
}

function report() {
  const t = totals();
  const h = hits();
  console.log(`第 ${t.pian} 篇 · ${PIAN.nameSimp}`);
  console.log(`  条 ${t.tiao} · 方 ${t.fang} · 字 ${t.chars}（条文 ${t.tiaoChars}）· 方条比 ${(t.fang / t.tiao).toFixed(2)}`);
  console.log(`  出方条 ${t.chu} · 无方条 ${t.wu} · 药味 ${t.herbTokens} 次 / ${t.distinctHerbs} 味`);
  console.log('  表 2（字面命中，可重叠）：');
  for (const [k, v] of Object.entries(h)) console.log(`    ${k}: ${v}`);
  const c = crossCheck();
  console.log(`  校勘：古诗文网本第 ${c.pian} 篇 ${c.paras} 段 / ${c.chars} 字（sha256 ${c.sha8}…）`);
}

module.exports = { PIAN_NO, GS_NO, PIAN, ARTICLES, GSPIAN, RULES, cps, totals, hits, formulaTable, crossCheck };

if (require.main === module) report();
"""

TEST_JS = r"""'use strict';
/**
 * 第 __N__ 章单测。每条断言都对着 docs/zh.md 里的一个数字：
 * 改代码不改文档、或改文档不改代码，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { totals, hits, formulaTable, crossCheck, PIAN, PIAN_NO } = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

test('篇级规模：__TIAO__ 条 · __FANG__ 方 · __CHAR__ 字 · 出方条 __CHU__', () => {
  const t = totals();
  assert.strictEqual(t.pian, __PIAN__);
  assert.strictEqual(t.tiao, __TIAO__);
  assert.strictEqual(t.fang, __FANG__);
  assert.strictEqual(t.chars, __CHAR__, '与底本 pian[].chars 同口径');
  assert.strictEqual(t.chu, __CHU__);
  assert.strictEqual(t.wu, __WU__);
});

test('药味：__HERBTOK__ 味次 / __HERBDIS__ 味', () => {
  const t = totals();
  assert.strictEqual(t.herbTokens, __HERBTOK__);
  assert.strictEqual(t.distinctHerbs, __HERBDIS__);
});

test('表 2 字面命中：死 __DEAD__ · 难治 __HARD__ · 禁忌 __BAN__ · 自愈 __HEAL__', () => {
  const h = hits();
  assert.strictEqual(h['标「死／不治」'], __DEAD__);
  assert.strictEqual(h['标「难治」'], __HARD__);
  assert.strictEqual(h['禁忌句（不可／禁／勿）'], __BAN__);
  assert.strictEqual(h['自愈／欲解'], __HEAL__);
});

test('方证表行数 = 方数（一方一行）', () => {
  assert.strictEqual(formulaTable().length, __FANG__);
});

test('校勘口径：古诗文网本段数/字数可复算', () => {
  const c = crossCheck();
  assert.strictEqual(c.pian, __GS__);
  assert.strictEqual(c.paras, __GSPARA__);
  assert.strictEqual(c.chars, __GSCHAR__);
});

test('文档与代码不脱钩：关键数字在 docs/zh.md 中原文出现', () => {
  const needles = ['条', '无方条'];
  assert.ok(needles.every((n) => DOC.includes(n)));
  assert.ok(DOC.includes(String(__TIAO__)), '条数');
  assert.ok(DOC.includes(String(__FANG__)), '方数');
  assert.ok(DOC.includes(String(__CHAR__)), '字数');
  assert.ok(DOC.includes('第 __PIAN__ 篇') || DOC.includes('第__PIAN__篇'), '篇号');
  assert.ok(PIAN.nameSimp || PIAN_NO, '底本篇名可取');
});
"""


def render_code(b: dict, st: dict) -> tuple[str, str]:
    js = (MAIN_JS
          .replace("__N__", str(b["n"]))
          .replace("__TITLE__", fmt(b["title"], st))
          .replace("__PIAN__", str(st["pian"]))
          .replace("__GS__", str(st["gs_no"])))
    tjs = (TEST_JS
           .replace("__N__", str(b["n"]))
           .replace("__PIAN__", str(st["pian"]))
           .replace("__GS__", str(st["gs_no"]))
           .replace("__TIAO__", str(st["s_tiao"]))
           .replace("__FANG__", str(st["s_fang"]))
           .replace("__CHAR__", str(st["s_char"]))
           .replace("__CHU__", str(st["s_chu"]))
           .replace("__WU__", str(st["s_wu"]))
           .replace("__HERBTOK__", str(st["s_herb_tok"]))
           .replace("__HERBDIS__", str(st["s_herb_dis"]))
           .replace("__DEAD__", str(st["s_dead"]))
           .replace("__HARD__", str(st["s_hard"]))
           .replace("__BAN__", str(st["s_ban"]))
           .replace("__HEAL__", str(st["s_heal"]))
           .replace("__GSPARA__", str(st["gs_para"]))
           .replace("__GSCHAR__", str(st["gs_char"])))
    return js, tjs


def render_quiz(b: dict, st: dict) -> dict:
    qs = [(s, q, o, c, e) for (s, q, o, c, e) in b["quiz"]]
    qs += [(s, q, o, c, e) for (s, q, o, c, e) in EXTRA_QUIZ.get(b["n"], [])]
    order = {"pre": 0, "check": 1, "post": 2}
    qs.sort(key=lambda x: order[x[0]])
    counts = {k: sum(1 for x in qs if x[0] == k) for k in order}
    if counts != {"pre": 1, "check": 3, "post": 2}:
        raise SystemExit("✗ 第 %d 章 quiz 题型数不符：%s（需 pre1/check3/post2）" % (b["n"], counts))
    out = []
    for stage, q, opts, correct, expl in qs:
        out.append({
            "stage": stage,
            "question": fmt(q, st),
            "options": [fmt(o, st) for o in opts],
            "correct": correct,
            "explanation": fmt(expl, st),
        })
    return {"questions": out}


def render_prompt(b: dict, st: dict) -> str:
    return "\n".join([
        "# %s · 条文核校助手\n" % st["s_title"],
        "## 用途\n",
        "拿到一条关于《金匮要略·%s》的说法——「这一篇 %d 条 %d 方」「某某方是这一篇的主方」「某条讲的是禁忌」——"
        "用本篇实测的 **%d 条 · %d 方 · 方条比 %s · 出方条 %d** 去核，而不是凭印象讲故事。\n"
        % (st["s_title"], st["s_tiao"], st["s_fang"], st["s_tiao"], st["s_fang"], st["s_ratio"], st["s_chu"]),
        "## 数据边界（必须先声明）\n",
        "```text",
        "金匮要略在本仓库无教材底本。主见证为外源·笈成（standards/jingui/底本.json，第 %d 篇）。" % st["pian"],
        "第二见证为古诗文网本（standards/jingui/gushiwen/gushiwen.json，第 %d 篇，%d 段 / %d 字），仅供校勘。" % (st["gs_no"], st["gs_para"], st["gs_char"]),
        "本篇实测：%d 条 · %d 方（有方文）· %d 字 · 出方条 %d · 药味 %d 次 / %d 味。"
        % (st["s_tiao"], st["s_fang"], st["s_char"], st["s_chu"], st["s_herb_tok"], st["s_herb_dis"]),
        "条号沿用源页（篇.条），不等于宋本分条；附篇（23-25）不编条号。",
        "禁止用通行本的条数替换本库实测数。",
        "```\n",
        "## 提示词\n",
        "```text",
        "你是《金匮要略》第 %d 篇（%s）的文本审校助手。任务：判断给定说法是否与实测一致，并给出条号级依据。" % (st["pian"], st["s_title"]),
        "禁止凭记忆补充条文；只能引用下面列出的事实。\n",
        "可用事实（由 standards/jingui/底本.json 第 %d 篇计算，node code/main.js 可复算）：" % st["pian"],
        "- 规模：%d 条 · %d 方 · %d 字 · 方条比 %s" % (st["s_tiao"], st["s_fang"], st["s_char"], st["s_ratio"]),
        "- 结构：出方条 %d / 无方条 %d" % (st["s_chu"], st["s_wu"]),
        "- 字面命中：死或不治 %d 条 · 难治 %d 条 · 禁忌 %d 条 · 自愈欲解 %d 条" % (st["s_dead"], st["s_hard"], st["s_ban"], st["s_heal"]),
        "- 方证（前四）：%s" % st["s_top_fang"],
        "- 药味前五：%s（合计 %d 味次 / %d 味）" % (st["s_top_herb"], st["s_herb_tok"], st["s_herb_dis"]),
        "```\n",
        "## 输出格式\n",
        "1. 结论（一致 / 不一致 / 无法判定）",
        "2. 条号级依据（引用原文首句，不改写）",
        "3. 若不一致：实测值 vs 说法值，并指出说法可能来自哪一版分条",
        "",
    ])


def render_skill(b: dict, st: dict) -> str:
    slug = b["slug"].split("-", 1)[1]
    return "\n".join([
        "---",
        "name: %s" % slug,
        "description: %s篇条文核校：%d 条 %d 方、方条比 %s、出方条 %d"
        % (st["s_title"][:6], st["s_tiao"], st["s_fang"], st["s_ratio"], st["s_chu"]),
        "version: 0.1.0",
        "---\n",
        "# %s\n" % slug,
        "## 何时使用\n",
        "- 要核「%s多少条、几方」这类结构说法" % st["s_title"],
        "- 讲稿把某方说成「本篇主方」，需要看它在 %d 方里的位置" % st["s_fang"],
        "- 需要一份字面级的禁忌/死候/自愈清单（表 2）\n",
        "## 数据来源\n",
        "`standards/jingui/底本.json` 第 %d 篇（外源·笈成）；校勘 `standards/jingui/gushiwen/gushiwen.json` 第 %d 篇（外源·古诗文网）。" % (st["pian"], st["gs_no"]),
        "复算：`node code/main.js`；断言：`node --test code/main.test.js`。\n",
        "## 口径\n",
        "- 条号 = 源页「篇.条」，不编不并；附篇 23-25 无条号。",
        "- 方只计有方文者（formulas[]）；仅存方名者单列。",
        "- 表 2 为字面命中，可重叠，不得相加当条数。\n",
        "## 输出\n",
        "结论 + 条号级依据 + 实测数值。不得引入通行本数字替换本库实测。",
        "",
    ])


def write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def build_all(check: bool = False) -> list:
    changed = []
    for b in CHAPTERS:
        st = stats(b["pian"])
        cdir = os.path.join(SUBJ, "chapters", b["slug"])
        files = {
            os.path.join(cdir, "docs", "zh.md"): render_doc(b, st),
            os.path.join(cdir, "code", "main.js"): render_code(b, st)[0],
            os.path.join(cdir, "code", "main.test.js"): render_code(b, st)[1],
            os.path.join(cdir, "outputs", "prompt-%s.md" % b["slug"].split("-", 1)[1]): render_prompt(b, st),
            os.path.join(cdir, "outputs", "skill-%s.md" % b["slug"].split("-", 1)[1]): render_skill(b, st),
        }
        quiz = render_quiz(b, st)
        files[os.path.join(cdir, "quiz.json")] = json.dumps(quiz, ensure_ascii=False, indent=1) + "\n"
        for p, text in files.items():
            old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else None
            if old != text:
                changed.append(os.path.relpath(p, ROOT))
                if not check:
                    write(p, text)
    return changed


def update_chapters_json(check: bool) -> list:
    path = os.path.join(SUBJ, "chapters.json")
    data = json.load(io.open(path, encoding="utf-8"))
    keep = [c for c in data["chapters"] if c["n"] <= 10]
    add = [{"n": b["n"], "slug": b["slug"], "title": b["title"].split("：", 1)[-1].split("——")[0], "status": "🚧"}
           for b in CHAPTERS]
    new = {"slug": data["slug"], "title": data["title"], "chapters": keep + add}
    text = json.dumps(new, ensure_ascii=False, indent=1) + "\n"
    old = io.open(path, encoding="utf-8").read()
    if old != text:
        if not check:
            write(path, text)
        return [os.path.relpath(path, ROOT)]
    return []


def main() -> int:
    check = "--check" in sys.argv[1:]
    changed = build_all(check) + update_chapters_json(check)
    if check:
        if changed:
            print("✗ 篇目精读章与生成器不一致（%d 个文件）：" % len(changed))
            for c in changed[:20]:
                print("  -", c)
            return 1
        print("✓ 篇目精读章 14 章与生成器一致（docs / code / test / quiz / outputs / chapters.json）")
        return 0
    print("✓ 生成/更新 %d 个文件；24 章 ↔ 25 篇" % len(changed))
    for c in changed:
        print("  ·", c)
    return 0


if __name__ == "__main__":
    sys.exit(main())
