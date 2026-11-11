#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为《各家针灸学说》（03-zhenjiu/17-gejia-zhenjiu-xueshuo）某一章铺底：code/main.js + code/main.test.js

与《经络学》不同：本课程的 12 章与教材 12 章**一一对应**（章号即教材章号），
所以取数按 chapter 号，不需要 chapter-map。

用法:
  python scripts/scaffold_zjgejia_chapter.py 03-neijing-sixiang
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, "standards", "zhenjiu-gejia", "units.json")
SUBJ = os.path.join(ROOT, "departments", "03-zhenjiu", "17-gejia-zhenjiu-xueshuo")

MAIN = r"""#!/usr/bin/env node
/**
 * 各家针灸学说 · 第 __N__ 章 __TITLE__：本章统计口径
 * 课程: departments/03-zhenjiu/17-gejia-zhenjiu-xueshuo/chapters/__SLUG__/docs/zh.md
 * 数据: standards/zhenjiu-gejia/units.json（138 单元层，每单元带三辨 / 四位面词频与数值计数）
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
    if (fs.existsSync(path.join(dir, 'standards', 'zhenjiu-gejia', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenjiu-gejia/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhenjiu-gejia', 'units.json');
const CHAPTER = '__N__';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units) {
  return units.units
    .filter((u) => u.chapter === CHAPTER)
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
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 5) };
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

/** 医家人名：从正文里认「某氏/某子/某山人」与已知医家名，给本章算一个可核的人物密度 */
function persons(list) {
  const NAMES = ['黄帝', '岐伯', '扁鹊', '华佗', '张仲景', '皇甫谧', '葛洪', '孙思邈', '王焘', '王惟一',
    '窦汉卿', '窦默', '滑寿', '刘完素', '张从正', '李东垣', '朱丹溪', '忽泰必烈', '王国瑞',
    '徐凤', '高武', '汪机', '李梃', '杨继洲', '吴谦', '廖润鸿', '承淡安', '陆瘦燕', '朱琏',
    '石学敏', '贺普仁', '程莘农', '郭诚杰'];
  const pairs = NAMES.map((n) => [n, list.reduce((a, u) => a + u.prose.split(n).length - 1, 0)]);
  return pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

module.exports = { CHAPTER, load, chapterUnits, merge, rank, bySection, citations, shape, persons, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  console.log('═══ 各家针灸学说 · 第 __N__ 章 __TITLE__ ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按节：');
  for (const sec of bySection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of rank(merge(list, 'views'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面（时代）：');
  for (const v of rank(merge(list, 'levels'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  const c = citations(list);
  console.log(`\n引书 ${c.books} 部 · 引用 ${c.total} 次 · 前五：${c.top.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log('\n人物密度：' + persons(list).slice(0, 8).map(([n, k]) => `${n}×${k}`).join('  '));
  for (const u of list) console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字`);
  console.log('※ 教学样例：数字由 standards/zhenjiu-gejia/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
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

test('四位面（时代）重心是「__LEVEL__」，且至少 __TOUCHED__ 层有落点', () => {
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

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
"""


def main():
    if len(sys.argv) < 2:
        raise SystemExit("用法: python scripts/scaffold_zjgejia_chapter.py 03-neijing-sixiang")
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
    title = units[0]["chapterTitle"].split(" ", 1)[1]
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

    subs = "[" + ", ".join(f"'{u['sub']}'" for u in units) + "]"
    cdir = os.path.join(SUBJ, "chapters", slug, "code")
    os.makedirs(cdir, exist_ok=True)
    js = MAIN.replace("__N__", n).replace("__TITLE__", title).replace("__SLUG__", slug)
    ts = (TEST.replace("__N__", n).replace("__TITLE__", title)
              .replace("__UNITS__", str(len(units))).replace("__SUBS__", subs)
              .replace("__HANZI__", str(hanzi)).replace("__MEAN__", str(int(hanzi / len(units) + 0.5)))
              .replace("__VIEW__", vkey).replace("__VIEWC__", str(vcnt))
              .replace("__LEVEL__", lkey).replace("__LEVELC__", str(lcnt))
              .replace("__TOUCHED__", str(max(1, min(touched, 2))))
              .replace("__BOOKS__", str(max(0, len(names) - 2))).replace("__CITES__", str(max(0, cites - 2)))
              .replace("__VALUE__", str(value)))
    open(os.path.join(cdir, "main.js"), "w", encoding="utf-8").write(js)
    open(os.path.join(cdir, "main.test.js"), "w", encoding="utf-8").write(ts)
    print(f"第 {n} 章 {title} · 单元 {len(units)} · 汉字 {hanzi} · 三辨主 {vkey}({vcnt}) · "
          f"时代主 {lkey}({lcnt}) · 引书 {len(names)} 部/{cites} 次 · 数值 {value}")


if __name__ == "__main__":
    main()
