#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/scaffold_huli_chapter.py —— 护理系通用章脚手架（code/main.js + main.test.js）

用法：
  python scripts/scaffold_huli_chapter.py waike-huli departments/05-huli/08-waike-huli-xue 05-bingfazheng
  python scripts/scaffold_huli_chapter.py waike-huli departments/05-huli/08-waike-huli-xue --all

为什么通用：一章的代码只依赖三件东西——本课单元层、本课章映射、本章 slug。
把这三件做成参数后，建课不必再复制脚本（复制就会带上一门课的错路径）。
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MAIN = r"""#!/usr/bin/env node
/**
 * __COURSE__ · 第 __N__ 章 __TITLE__：本章统计口径
 * 课程: __DEPTMARK__/chapters/__SLUG__/docs/zh.md
 * 数据: standards/__SUB__/units.json（__UNITS__ 单元层，每单元带三辨与四位面词频）
 * 取数: standards/__SUB__/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章规模、三辨分布、四位面分布、引书数与数值命中，都由本脚本从单元层读出。
 * 手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', '__SUB__', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/__SUB__/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', '__SUB__', 'units.json');
const MAP = path.join(ROOT, 'standards', '__SUB__', 'chapter-map.json');
const CHAPTER = '__N__';
const SLUG = '__SLUG__';

const loadAll = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadMap = () => JSON.parse(fs.readFileSync(MAP, 'utf8'));

function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

function chapterUnits() {
  const keys = chapterKeys();
  const all = loadAll();
  return all.units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function summarize(units) {
  const views = {};
  const levels = {};
  let hanzi = 0;
  let values = 0;
  let cites = 0;
  const books = new Set();
  for (const u of units) {
    hanzi += u.hanzi;
    values += (u.measure && u.measure.valueLike) || 0;
    for (const [k, v] of Object.entries((u.measure && u.measure.views) || {})) views[k] = (views[k] || 0) + v;
    for (const [k, v] of Object.entries((u.measure && u.measure.levels) || {})) levels[k] = (levels[k] || 0) + v;
    for (const m of (u.prose || '').matchAll(/《([^》]+)》/g)) { books.add(m[1]); cites += 1; }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
  return { views, levels, hanzi, values, cites, books: books.size, viewTop: top(views), levelTop: top(levels) };
}

function main() {
  const units = chapterUnits();
  const s = summarize(units);
  const cm = loadMap().chapters[SLUG];
  const all = loadAll();

  console.log(`__COURSE__ · 第 ${CHAPTER} 章 ${cm.title}`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${s.hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${cm.srcChapters.join('、')}`);
  console.log('');
  console.log('三辨分布（单元层 measure.views 求和）：');
  for (const [k, v] of Object.entries(s.views).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}`);
  }
  console.log(`  → 主导一辨：${s.viewTop[0]}（${s.viewTop[1]}）`);
  console.log('');
  console.log(`四位面（${Object.keys(all.levels).join('／')}）分布：`);
  const ltot = Object.values(s.levels).reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of Object.entries(s.levels).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}（${((v / ltot) * 100).toFixed(1)}%）`);
  }
  console.log(`  → 主导位面：${s.levelTop[0]}（${s.levelTop[1]}）`);
  console.log('');
  console.log(`引书 ${s.books} 部 / ${s.cites} 次；数值类命中 ${s.values} 处。`);
  console.log('');
  console.log('※ 教学样例：数字由 standards/__SUB__/units.json 现算，不手打；改教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, CHAPTER, SLUG };
"""

TEST = r"""'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const MAP = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'standards', '__SUB__', 'chapter-map.json');
const UNITS = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'standards', '__SUB__', 'units.json');
const { chapterKeys, chapterUnits, summarize, CHAPTER, SLUG } = require('./main.js');

test('本章映射存在且非空', () => {
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
});

test('单元都能在单元层找到', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  for (const u of units) assert.ok(u.sub && u.hanzi > 0);
});

test('规模与单元层一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(s.hanzi > 1000, `汉字过少：${s.hanzi}`);
});

test('三辨与四位面都取自单元层，不写死', () => {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const s = summarize(chapterUnits());
  assert.deepStrictEqual(Object.keys(s.views).sort(), Object.keys(all.views).sort());
  assert.deepStrictEqual(Object.keys(s.levels).sort(), Object.keys(all.levels).sort());
});

test('主导一辨与主导位面可复算', () => {
  const s = summarize(chapterUnits());
  for (const [k, v] of Object.entries(s.views)) assert.ok(v <= s.viewTop[1], `${k} 超过主导项`);
  for (const [k, v] of Object.entries(s.levels)) assert.ok(v <= s.levelTop[1], `${k} 超过主导位面`);
});

test('脚本可运行且输出含教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 80, '输出过短');
  assert.match(out, /教学样例：数字由 standards\/__SUB__\/units\.json 现算/);
  assert.match(out, /不构成临床判断依据/);
});

test('章节号与章映射一致', () => {
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters;
  assert.strictEqual(String(cm[SLUG].n), String(CHAPTER));
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/__SLUG__/docs/zh.md'), '头部注释未指向本章');
});
"""


def build(sub, dept_rel, slug):
    base = os.path.join(ROOT, "standards", sub)
    cm = json.load(open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    U = json.load(open(os.path.join(base, "units.json"), encoding="utf-8"))
    cfg = json.load(open(os.path.join(base, "doc-config.json"), encoding="utf-8"))
    if slug not in cm:
        raise SystemExit(f"chapter-map.json 中没有 {slug}")
    spec = cm[slug]
    code = os.path.join(ROOT, dept_rel, "chapters", slug, "code")
    os.makedirs(code, exist_ok=True)
    main = (MAIN.replace("__COURSE__", cfg["courseTitle"])
                .replace("__DEPTMARK__", dept_rel)
                .replace("__SUB__", sub)
                .replace("__UNITS__", str(U["counts"]["units"]))
                .replace("__N__", str(spec["n"]))
                .replace("__TITLE__", spec["title"])
                .replace("__SLUG__", slug))
    io.open(os.path.join(code, "main.js"), "w", encoding="utf-8").write(main)
    testjs = (TEST.replace("__SUB__", sub).replace("__SLUG__", slug).replace("__N__", str(spec["n"])))
    io.open(os.path.join(code, "main.test.js"), "w", encoding="utf-8").write(testjs)
    return spec


def main():
    if len(sys.argv) < 4:
        raise SystemExit("用法: scaffold_huli_chapter.py <sub> <dept路径> <slug|--all>")
    sub, dept_rel, what = sys.argv[1], sys.argv[2], sys.argv[3]
    base = os.path.join(ROOT, "standards", sub)
    cm = json.load(open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    targets = sorted(cm, key=lambda k: cm[k]["n"]) if what == "--all" else [what]
    for slug in targets:
        spec = build(sub, dept_rel, slug)
        print(f"第 {spec['n']} 章 {spec['title']} · 单元 {len(spec['units'])} · code/ 已生成")


if __name__ == "__main__":
    main()
