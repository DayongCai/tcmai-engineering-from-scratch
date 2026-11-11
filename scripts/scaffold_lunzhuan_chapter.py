#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为中医临床轮转某一章铺底：code/main.js + code/main.test.js（都由单元层现算，不手打数字）。

用法:
  python scripts/scaffold_lunzhuan_chapter.py 01-xinbing-lunzhuan

它只写两件事：
  1. code/main.js      —— 通用统计脚本，只换 CHAPTER 常量；
  2. code/main.test.js —— 断言按本章实测值生成（单元数/字数/三辨主/四位面主/引书/数值）。
正文 docs、quiz、outputs 仍需人工撰写 —— 脚本不代替写作，只把可对账的部分固定下来。
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, "standards", "lunzhuan", "units.json")
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "21-zhongyi-linchuang-lunzhuan")

MAIN_TEMPLATE = r"""#!/usr/bin/env node
/**
 * 中医临床轮转 · 第 __N__ 章 __TITLE__：本章统计口径
 * 课程: departments/01-zhongyi/21-zhongyi-linchuang-lunzhuan/chapters/__SLUG__/docs/zh.md
 * 数据: standards/lunzhuan/units.json（10 单元层，每单元带三辨 / 四位面词频与数值计数）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：正文引用的每个规模、重心、引书数，都由本脚本从单元层读出。
 * 手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'lunzhuan', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/lunzhuan/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'lunzhuan', 'units.json');
const CHAPTER = '__N__';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

function merge(list, field) {
  const out = {};
  for (const u of list) for (const [k, v] of Object.entries(u.measure[field])) out[k] = (out[k] || 0) + v;
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function bySection(list) {
  const out = new Map();
  for (const u of list) {
    const key = u.sec || '（未标节）';
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) {
      counter.set(m[1], (counter.get(m[1]) || 0) + 1);
    }
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

function shape(list) {
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi,
    mean: list.length ? Math.round(hanzi / list.length) : 0,
    valueLike: list.reduce((a, u) => a + u.measure.valueLike, 0),
    digits: list.reduce((a, u) => a + u.measure.digits, 0),
  };
}

/** 方与法：单元层没有独立方剂字段，改从正文里认「治法动词」记号（儿科以疏风宣肺、消食健脾、平肝息风为主） */
function methods(list) {
  const VERBS = ['疏肝', '补肾', '健脾', '养血', '活血', '化瘀', '调经', '固冲', '止带', '安胎', '清热', '利湿'];
  const out = {};
  for (const v of VERBS) out[v] = list.reduce((a, u) => a + u.prose.split(v).length - 1, 0);
  return Object.entries(out).filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

module.exports = { CHAPTER, load, chapterUnits, merge, rank, bySection, citations, shape, methods, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  const views = rank(merge(list, 'views'));
  const levels = rank(merge(list, 'levels'));
  const books = citations(list);

  console.log('═══ 中医临床轮转 · 第 __N__ 章 __TITLE__ ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按节：');
  for (const sec of bySection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of views) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面覆盖：');
  for (const v of levels) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log(`\n引书 ${books.books} 部 · 引用 ${books.total} 次 · 前三：${books.top.map(([n, c]) => `${n}(${c})`).join('、')}`);
  console.log('\n治法动词命中：' + methods(list).map(([v, c]) => `${v}×${c}`).join('  '));
  console.log('\n单元清单：');
  for (const u of list) {
    console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字\t${(u.tri && u.tri.view.primary) || '—'}/${(u.tri && u.tri.level.primary) || '—'}`);
  }
}
"""

TEST_TEMPLATE = r"""#!/usr/bin/env node
/**
 * 第 __N__ 章 __TITLE__ —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/lunzhuan/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, __UNITS__);
  assert.deepStrictEqual(list.map((u) => u.sub), __SUBS__);
});

test('规模：__HANZI__ 字 · 平均 __MEAN__ 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, __HANZI__);
  assert.strictEqual(s.mean, __MEAN__);
});

test('三辨重心是「__VIEW__」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '__VIEW__');
  assert.strictEqual(views[0].count, __VIEWC__);
});

test('四位面重心是「__LEVEL__」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['__LEVEL__'], __LEVELC__);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= __TOUCHED__, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥__BOOKS__ 部、≥__CITES__ 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= __BOOKS__, `引书 ${c.books}`);
  assert.ok(c.total >= __CITES__, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 __VALUE__ 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, __VALUE__);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`派生·第${CHAPTER}章·`), u.locator);
});
"""


def main():
    if len(sys.argv) < 2:
        raise SystemExit("用法: python scripts/scaffold_lunzhuan_chapter.py 01-xinbing-lunzhuan")
    slug = sys.argv[1]
    m = re.match(r"^(\d{2})-", slug)
    if not m:
        raise SystemExit("章节目录名须以两位章号开头")
    n = str(int(m.group(1)))

    data = json.load(open(UNITS, encoding="utf-8"))
    units = [u for u in data["units"] if u["chapter"] == n]
    if not units:
        raise SystemExit(f"units.json 里没有第 {n} 章")
    units.sort(key=lambda u: [int(x) for x in u["sub"].split(".")])
    title = units[0]["chapterTitle"]
    hanzi = sum(u["hanzi"] for u in units)
    views = Counter()
    levels = Counter()
    for u in units:
        views.update(u["measure"]["views"])
        levels.update(u["measure"]["levels"])
    all_names = set()
    cites = 0
    for u in units:
        for x in re.findall(r"《([^》]+)》", u["prose"]):
            all_names.add(x)
            cites += 1
    books = len(all_names)
    value = sum(u["measure"]["valueLike"] for u in units)
    vkey, vcnt = views.most_common(1)[0]
    lkey, lcnt = levels.most_common(1)[0]
    touched = sum(1 for v in levels.values() if v > 0)

    subs = "[" + ", ".join(f"'{u['sub']}'" for u in units) + "]"
    outs = {
        "main.js": (MAIN_TEMPLATE
                    .replace("__N__", n).replace("__TITLE__", title).replace("__SLUG__", slug)),
        "main.test.js": (TEST_TEMPLATE
                         .replace("__N__", n).replace("__TITLE__", title)
                         .replace("__UNITS__", str(len(units))).replace("__SUBS__", subs)
                         .replace("__HANZI__", str(hanzi))
                         .replace("__MEAN__", str(int(hanzi / len(units) + 0.5)))
                         .replace("__VIEW__", vkey).replace("__VIEWC__", str(vcnt))
                         .replace("__LEVEL__", lkey).replace("__LEVELC__", str(lcnt))
                         .replace("__TOUCHED__", str(max(1, touched - 1)))
                         .replace("__BOOKS__", str(max(0, books - 2)))
                         .replace("__CITES__", str(max(0, cites - 2)))
                         .replace("__VALUE__", str(value))),
    }
    # 教材本章不引古籍（如第 3、11 章是现代急诊内容）时，把「引书成规模」换成「引书为 0」的断言
    if books == 0:
        outs["main.test.js"] = re.sub(
            r"test\('引书成规模.*?\n\}\);\n",
            "test('本章教材不引古籍（引书 0 部）：属现代急诊／重症内容', () => {\n"
            "  const c = citations(list);\n"
            "  assert.strictEqual(c.books, 0);\n"
            "  assert.strictEqual(c.total, 0);\n"
            "});\n",
            outs["main.test.js"], flags=re.S)
    cdir = os.path.join(SUBJ, "chapters", slug, "code")
    os.makedirs(cdir, exist_ok=True)
    outs["main.js"] = outs["main.js"] + """
// 教学样例声明：契约要求每章输出含临床边界声明（tests/test_chapter_code.js）
if (require.main === module) {
  console.log('※ 教学样例：数字由 standards/lunzhuan/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
"""
    for fn, text in outs.items():
        open(os.path.join(cdir, fn), "w", encoding="utf-8").write(text)
    print(f"第 {n} 章 {title} · 单元 {len(units)} · 汉字 {hanzi} · 三辨主 {vkey}({vcnt}) · 四位面主 {lkey}({lcnt}) · 引书 {books} 部/{cites} 次 · 数值 {value}")
    print("写好:", ", ".join(os.path.join("code", f) for f in outs))


if __name__ == "__main__":
    main()
