'use strict';
/**
 * 第 7 章章内单测（8 项）
 *   1. 规模与底本 counts 逐级对齐（4 节 / 23 小节 / 69 段 / 4184 字 / 23 味）
 *   2. 结构：每小节 3 段；小节名与 drugs.json 第 20 章药名集合一致
 *   3. 教材原文核对：docs 里标了教材出处的「」引语逐字落在本章段落里
 *   4. 本仓库口径：四气分布 = drugs.json 现算 = 温10 寒2 平7 微寒2 微温1 热1
 *   5. 归经：23 味全部归肝（章内 100%）
 *   6. 禁忌抽取：朴素子串 12 味 忌用，容错正则 15 味，差 3 味
 *   7. 「破血」6 味跨 3 节；节字数相加 = 章字数
 *   8. 教学边界：运行时最后一行是边界声明；docs 有 4184 且无「底本·」式引用
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const M = require('./main.js');

const DIR = path.join(__dirname, '..');
const DOC = path.join(DIR, 'docs', 'zh.md');
const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
/** 与 tests/test_zhongyao_chapters.js 同一套折叠：去空白 + 去常用标点 */
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

test('1. 规模：4 节 / 23 小节 / 69 段 / 4184 字 / 23 味', () => {
  const c = M.chapter();
  assert.strictEqual(c.counts.secs, 4);
  assert.strictEqual(c.counts.subs, 23);
  assert.strictEqual(c.counts.paras, 69);
  assert.strictEqual(c.counts.chars, 4184);
  assert.strictEqual(M.units().length, 23);
  assert.strictEqual(M.drugsOf().length, 23);
  assert.strictEqual(M.units().reduce((n, u) => n + u.paras.length, 0), 69);
});

test('2. 结构：每小节 3 段、段段非空，小节名 = drugs.json 药名集合', () => {
  for (const u of M.units()) {
    assert.strictEqual(u.paras.length, 3, `${u.name} 段数`);
    for (const p of u.paras) assert.ok(p.trim().length > 0, `${u.name} 有空段`);
    assert.strictEqual(u.name.replace(/\s/g, ''), u.name);
  }
  const a = M.units().map((u) => u.name).sort();
  const b = M.drugsOf().map((d) => d.name).sort();
  assert.deepStrictEqual(a, b);
});

test('3. 教材原文核对：docs 的教材引语逐字落在本章段落里', () => {
  const pool = M.units().map((u) => u.paras.map(fold)).flat();
  const doc = read(DOC);
  const quotes = [];
  for (const line of doc.split('\n')) {
    if (!/教材·第\d+章|《中药学·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) quotes.push(m[1]);
  }
  assert.ok(quotes.length >= 2, `标了教材出处的引语只有 ${quotes.length} 条`);
  for (const q of quotes) assert.ok(pool.some((p) => p.includes(fold(q))), `引语不在本章段落里：${q}`);
  assert.ok(M.paraOf('川芎', 1).startsWith('川芎功效活血行气、祛风止痛'));
});

test('4. 本仓库口径：四气分布与 drugs.json 现算一致', () => {
  const d = Object.fromEntries(M.qiDist());
  assert.deepStrictEqual(d, { 温: 10, 寒: 2, 平: 7, 微寒: 2, 微温: 1, 热: 1 });
  assert.strictEqual(Object.values(d).reduce((a, b) => a + b, 0), 23);
  // 微寒/微温 不被压平成 寒/温 —— 这是本仓库「原样取值」的口径
  assert.strictEqual(d['微寒'], 2);
  assert.strictEqual(M.drug('丹参').nature.qi, '微寒');
});

test('5. 归经：23 味全部归肝', () => {
  const j = Object.fromEntries(M.jingDist());
  assert.strictEqual(j['肝'], 23);
  assert.strictEqual(M.drugsOf().filter((d) => d.nature.guijing.includes('肝')).length, 23);
});

test('6. 禁忌抽取：朴素子串漏 3 味，容错正则补齐', () => {
  const naive = M.units().filter((u) => M.pregNaive(u.name) === '忌用').map((u) => u.name);
  const tol = M.units().filter((u) => M.pregTolerant(u.name) === '忌用').map((u) => u.name);
  assert.strictEqual(naive.length, 12);
  assert.strictEqual(tol.length, 15);
  const gap = tol.filter((n) => !naive.includes(n)).sort();
  assert.deepStrictEqual(gap, ['三棱', '乳香', '莪术'].sort());
  assert.strictEqual(M.pregTolerant('骨碎补'), '未标注');
  assert.strictEqual(M.pregTolerant('斑蝥'), '忌用');
});

test('7. 「破血」跨节：6 味 / 3 节；节字数相加 = 章字数', () => {
  const bb = M.breakBlood();
  assert.strictEqual(bb.length, 6);
  assert.deepStrictEqual([...new Set(bb.map((x) => x.sec))].sort(), ['20.1', '20.3', '20.4']);
  assert.deepStrictEqual(bb.map((x) => x.name).sort(), ['三棱', '土鳖虫', '姜黄', '水蛭', '斑蝥', '莪术'].sort());
  const st = M.secStats();
  assert.strictEqual(st.reduce((n, s) => n + s.chars, 0), M.chapter().counts.chars);
  assert.strictEqual(st.reduce((n, s) => n + s.paras, 0), M.chapter().counts.paras);
});

test('8. 教学边界与 docs 规模', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: DIR, encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last) && /不构成/.test(last), `最后一行：${last}`);
  const doc = read(DOC);
  assert.ok(doc.replace(/,/g, '').includes('4184'), 'docs 里没有本章字数 4184');
  assert.ok(nonWs(doc) >= 1500, `docs 只有 ${nonWs(doc)} 非空白字符`);
  assert.ok(!/底本·/.test(doc), 'docs 出现「底本·」式引用');
  assert.ok(/教材·第20章/.test(doc));
});
