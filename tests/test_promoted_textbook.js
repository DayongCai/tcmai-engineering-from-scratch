#!/usr/bin/env node
/**
 * tests/test_promoted_textbook.js —— 「存量转出版件」的门
 *
 * 适用对象：带有 standards/<slug>/promote.json 的课（教学章 docs 重排成教材章）。
 * 这类教材章最容易出的三种病，这门专治：
 *   1. **出处错**：章首写着《某书》，单元层 source 其实是另一本书 / 路径前缀重复；
 *   2. **章名与内容错位**：章名按叙事起，装进去的是另一批底本章；
 *   3. **判断层缺席**：N.2 / N.5 用占位符或一句话糊过去。
 *
 * 逐项核（任一不过退 1）：
 *   [1] promote.json 的 src 覆盖面 = units.json 实际来源集合（不重不漏）
 *   [2] 章数 = 教学章数 = meta.chaptersTarget，且教材章文件齐、章名与 promote.json 一致
 *   [3] 每章 N.1 表行数 = 该章单元数；出处列不含形如 `F:/textbooks/F:/` 的重复前缀
 *   [4] 免责句落在 N.5 之后、思考题之前
 *   [5] N.2 / N.5 各 ≥200 汉字（不许占位）
 *   [6] 与生成器重算一致（幂等，防手改漂移）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

let pass = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) { pass += 1; console.log('  ok - ' + msg); } else { bad.push(msg); console.log('  not ok - ' + msg); }
};

const STD = path.join(ROOT, 'standards');
const courses = fs.readdirSync(STD).filter((d) => fs.existsSync(path.join(STD, d, 'promote.json')));
console.log(`\n存量转出版件（${courses.length} 门）\n`);

for (const slug of courses) {
  const sd = path.join(STD, slug);
  const cfg = readJson(`standards/${slug}/promote.json`);
  const hand = readJson(`standards/${slug}/promote-hand.json`).chapters;
  const units = readJson(`standards/${slug}/units.json`).units;
  const subj = cfg.subject || cfg.slug; // standards 目录名 ≠ 院系学科名（如 tizhi vs 04-zhongyi-tizhi-xue）
  const cj = readJson(`departments/${cfg.dept}/${subj}/chapters.json`);
  const meta = readJson(`departments/${cfg.dept}/${subj}/meta.json`);

  // [1] src 覆盖面 = 单元实际来源（派生底本课没有「书名:第N章」，改核 locator 前缀）
  const derived = cfg.mode === 'derived' || cfg.mode === 'units';
  const prefixes = cfg.locatorPrefixes || ['派生', '教材'];
  const bookCh = (s) => {
    const m = String(s || '').match(/^(.*?):第(\d+)章/);
    return m ? `${m[1]}|${m[2]}` : '?';
  };
  const declared = new Set();
  for (const c of cfg.chapters) for (const s of c.src) for (const x of s.chapters) declared.add(`${s.book}|${x}`);
  const actual = new Set(units.map((u) => bookCh(u.source)));
  const miss = [...actual].filter((x) => !declared.has(x));
  const extra = [...declared].filter((x) => !actual.has(x));
  if (derived) {
    const badLoc = units.filter((u) => !prefixes.some((x) => String(u.locator || '').startsWith(x))).map((u) => u.locator);
    ok(!badLoc.length, `[${slug}] 单元 locator 全在 ${prefixes.join('/')} 前缀内（${units.length} 单元）${badLoc.length ? '；异常 ' + badLoc[0] : ''}`);
  } else {
    ok(!miss.length && !extra.length,
      `[${slug}] 底本覆盖不重不漏（${actual.size} 个底本章${miss.length ? '，缺 ' + miss.join('、') : ''}${extra.length ? '，多 ' + extra.join('、') : ''}）`);
  }

  // [2] 章数 1:1 + 文件齐 + 章名一致
  {
    const errs = [];
    if (cfg.chapters.length !== cj.chapters.length) errs.push(`教材 ${cfg.chapters.length} ≠ 教学 ${cj.chapters.length}`);
    if (cfg.chapters.length !== meta.chaptersTarget) errs.push(`≠ chaptersTarget ${meta.chaptersTarget}`);
    for (const c of cfg.chapters) {
      const f = path.join(ROOT, `textbooks/${cfg.dept}/${subj}/${String(c.n).padStart(2, '0')}-第${c.n}章-${c.title}.md`);
      if (!fs.existsSync(f)) { errs.push(`缺 ${path.basename(f)}`); continue; }
      const head = fs.readFileSync(f, 'utf8').split('\n')[0];
      if (head !== `# 第 ${c.n} 章 · ${c.title}`) errs.push(`第 ${c.n} 章首行与章名不一致：${head}`);
    }
    ok(!errs.length, `[${slug}] ${cfg.chapters.length} 章 1:1、文件齐、章名与 promote.json 一致${errs.length ? '；' + errs[0] : ''}`);
  }

  // [3] N.1 表行数 = 单元数；出处无重复前缀
  {
    const errs = [];
    let rowsTotal = 0;
    for (const c of cfg.chapters) {
      const f = path.join(ROOT, `textbooks/${cfg.dept}/${subj}/${String(c.n).padStart(2, '0')}-第${c.n}章-${c.title}.md`);
      if (!fs.existsSync(f)) continue;
      const t = fs.readFileSync(f, 'utf8');
      const rows = (t.match(/^\| \d+ \| `/gm) || []).length;
      const want = c.selfBuilt ? 0 : units.filter((u) =>
        (c.srcChapters || [c.teaching]).map(String).includes(String(u.chapter))).length;
      rowsTotal += rows;
      if (rows !== want) errs.push(`第 ${c.n} 章表 ${rows} 行 ≠ ${want} 单元`);
      if (/F:\/textbooks\/F:\/textbooks/.test(t)) errs.push(`第 ${c.n} 章含重复路径前缀`);
    }
    if (rowsTotal !== units.length) errs.push(`全书表行 ${rowsTotal} ≠ 单元 ${units.length}`);
    ok(!errs.length, `[${slug}] N.1 表 ${rowsTotal} 行 = ${units.length} 单元，出处无重复前缀${errs.length ? '；' + errs[0] : ''}`);
  }

  // [4][5] 免责位置 + 判断层字数
  {
    const errs = [];
    for (const c of cfg.chapters) {
      const h = hand[String(c.n)] || {};
      for (const k of ['n2', 'n5']) {
        if (hanzi(h[k]) < 200) errs.push(`第 ${c.n} 章 ${k} 只有 ${hanzi(h[k])} 汉字`);
      }
      const f = path.join(ROOT, `textbooks/${cfg.dept}/${subj}/${String(c.n).padStart(2, '0')}-第${c.n}章-${c.title}.md`);
      if (!fs.existsSync(f)) continue;
      const t = fs.readFileSync(f, 'utf8');
      const hz = (t.match(/[一-鿿]/g) || []).length;
      if (hz < 1800) errs.push(`第 ${c.n} 章只有 ${hz} 汉字（下限 1,800）`);
      const i5 = t.indexOf('## N.5');
      const iq = t.indexOf('## 思考题');
      if (i5 < 0 || iq < 0 || !t.slice(i5, iq).includes('不构成诊断或治疗建议')) {
        errs.push(`第 ${c.n} 章免责句不在 N.5 与思考题之间`);
      }
    }
    ok(!errs.length, `[${slug}] 免责句位置正确、N.2/N.5 均 ≥200 汉字、每章 ≥1,800 汉字${errs.length ? '；' + errs[0] : ''}`);
  }

  // [6] 幂等
  {
    const r = spawnSync('python', ['scripts/promote_course_to_textbook.py', '--slug', slug, '--check'],
      { cwd: ROOT, encoding: 'utf8' });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
    ok(r.status === 0, `[${slug}] 与生成器重算一致（${out.split('\n').slice(-1)[0] || 'exit ' + r.status}）`);
  }
}

console.log(`\n# pass ${pass}\n# fail ${bad.length}`);
process.exit(bad.length ? 1 : 0);
