#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《经络学》（03-zhenjiu/01-jingluo-xue）某一章铺底：code/main.js + code/main.test.js

与其它课程的 scaffold 不同：本课程的 10 章按知识结构重组，一章要跨多章教材，
所以取数不按 chapter 号，而按 `standards/zhongyao-shangpin/chapter-map.json` 里的单元号清单（如 `4.1.1`）。

用法:
  python scripts/scaffold_zhongyao_huaxue_chapter.py 01-huaxue-leixing
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, "standards", "zhongyao-shangpin", "units.json")
MAP = os.path.join(ROOT, "standards", "zhongyao-shangpin", "chapter-map.json")
SUBJ = os.path.join(ROOT, "departments", "02-zhongyao", "17-zhongyao-shangpin-xue")

MAIN = r"""#!/usr/bin/env node
/**
 * 中药化学 · 第 __N__ 章 __TITLE__：本章统计口径
 * 课程: departments/02-zhongyao/17-zhongyao-shangpin-xue/chapters/__SLUG__/docs/zh.md
 * 数据: standards/zhongyao-shangpin/units.json（55 单元层，每单元带三辨=结构特征/理化性质/提分与检识 与 四位面=生源途径 词频）
 * 取数: standards/zhongyao-shangpin/chapter-map.json（课程章 → 教材单元号）
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
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyao-shangpin', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhongyao-shangpin/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhongyao-shangpin', 'units.json');
const CHAPTER = '__N__';
const KEYS = __KEYS__;

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units) {
  return units.units
    .filter((u) => KEYS.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = `教材第${u.chapter}章`;
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
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
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

/** 取穴与刺灸的操作词：本章正文里出现多少处「定位／分寸／直刺／灸」类的可执行指令 */
function hands(list) {
  const WORDS = ['定位', '骨度', '分寸', '同身寸', '直刺', '斜刺', '平刺', '艾灸', '温针灸', '留针', '禁针', '禁灸'];
  const pairs = WORDS.map((w) => [w, list.reduce((a, u) => a + u.prose.split(w).length - 1, 0)]);
  return Object.fromEntries(pairs).constructor === Object
    ? pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1])
    : pairs;
}

module.exports = { CHAPTER, KEYS, load, chapterUnits, merge, rank, byBookSection, citations, shape, hands, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  console.log('═══ 中药化学 · 第 __N__ 章 __TITLE__ ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按教材章：');
  for (const sec of byBookSection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of rank(merge(list, 'views'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面覆盖：');
  for (const v of rank(merge(list, 'levels'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  const c = citations(list);
  console.log(`\n引书 ${c.books} 部 · 引用 ${c.total} 次 · 前三：${c.top.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log('\n操作词命中：' + hands(list).map(([w, k]) => `${w}×${k}`).join('  '));
  for (const u of list) console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字`);
  console.log('※ 教学样例：数字由 standards/zhongyao-shangpin/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
"""

TEST = r"""#!/usr/bin/env node
/**
 * 第 __N__ 章 __TITLE__ —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
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

test('四位面重心是「__LEVEL__」，且至少 __TOUCHED__ 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['__LEVEL__'], __LEVELC__);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= __TOUCHED__);
});

test('引书成规模：≥__BOOKS__ 部、≥__CITES__ 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= __BOOKS__, `引书 ${c.books}`);
  assert.ok(c.total >= __CITES__, `引用 ${c.total}`);
});

test('数值计数与单元层一致（__VALUE__ 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, __VALUE__);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
"""

NOLEVEL_TEST = """test('本章四位面不适用：教材此部分不按经脉分区写', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.deepStrictEqual(Object.values(levels), [0, 0, 0, 0]);
});
"""


def main():
    if len(sys.argv) < 2:
        raise SystemExit("用法: python scripts/scaffold_zhongyao_huaxue_chapter.py 01-huaxue-leixing")
    slug = sys.argv[1]
    _m = json.load(open(MAP, encoding="utf-8"))
    cmap = _m.get("chapters", _m)
    if slug not in cmap:
        raise SystemExit(f"chapter-map.json 里没有 {slug}")
    spec = cmap[slug]
    n, title, keys = str(spec["n"]), spec["title"], spec["units"]

    data = json.load(open(UNITS, encoding="utf-8"))
    bysub = {u["sub"]: u for u in data["units"]}
    missing = [k for k in keys if k not in bysub]
    if missing:
        raise SystemExit(f"单元号不存在：{missing}")
    units = [bysub[k] for k in keys]
    keys = sorted(keys, key=lambda s: [int(x) for x in s.split(".")])
    units = [bysub[k] for k in keys]
    hanzi = sum(u["hanzi"] for u in units)
    views, levels = Counter(), Counter()
    for u in units:
        views.update(u["measure"]["views"])
        levels.update(u["measure"]["levels"])
    names, cites = set(), 0
    for u in units:
        for x in re.findall(r"《([^》]+)》", u["prose"]):
            names.add(x)
            cites += 1
    value = sum(u["measure"]["valueLike"] for u in units)
    vkey, vcnt = views.most_common(1)[0]
    lkey, lcnt = levels.most_common(1)[0]
    touched = sum(1 for v in levels.values() if v > 0)

    subs = "[" + ", ".join(f"'{k}'" for k in keys) + "]"
    cdir = os.path.join(SUBJ, "chapters", slug, "code")
    os.makedirs(cdir, exist_ok=True)
    js = (MAIN.replace("__N__", n).replace("__TITLE__", title).replace("__SLUG__", slug)
             .replace("__KEYS__", subs))
    ts = (TEST.replace("__N__", n).replace("__TITLE__", title)
              .replace("__UNITS__", str(len(units))).replace("__SUBS__", subs)
              .replace("__HANZI__", str(hanzi)).replace("__MEAN__", str(int(hanzi / len(units) + 0.5)))
              .replace("__VIEW__", vkey).replace("__VIEWC__", str(vcnt))
              .replace("__LEVEL__", lkey).replace("__LEVELC__", str(lcnt))
              .replace("__TOUCHED__", str(max(1, min(touched, 2))))
              .replace("__BOOKS__", str(max(0, len(names) - 1))).replace("__CITES__", str(max(0, cites - 2)))
              .replace("__VALUE__", str(value)))
    if lcnt == 0:
        # 本章教材不按经脉分区写（腧穴概论、现代研究）：四位面不适用，改写断言而不伪造数据
        start = ts.index("test('四位面重心是")
        end = ts.index("test('引书成规模")
        ts = ts[:start] + NOLEVEL_TEST + "\n" + ts[end:]
        js = js.replace("四位面覆盖：", "四位面（本章不适用，全 0）：")
    open(os.path.join(cdir, "main.js"), "w", encoding="utf-8").write(js)
    open(os.path.join(cdir, "main.test.js"), "w", encoding="utf-8").write(ts)
    print(f"第 {n} 章 {title} · 单元 {len(units)} · 汉字 {hanzi} · 三辨主 {vkey}({vcnt}) · "
          f"四位面主 {lkey}({lcnt}) · 引书 {len(names)} 部/{cites} 次 · 数值 {value}")


if __name__ == "__main__":
    main()
