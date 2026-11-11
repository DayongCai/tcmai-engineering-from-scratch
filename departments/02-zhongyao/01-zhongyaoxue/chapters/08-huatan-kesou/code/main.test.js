'use strict';
/**
 * 第 8 章章内单测（8 项）
 *   1. 规模：3 节 / 25 小节 / 75 段 / 4306 字 / 25 味
 *   2. 结构：每小节 3 段；小节名 = drugs.json 第 21 章药名集合
 *   3. 教材原文核对：docs 的教材引语逐字落在本章段落里；葶苈子写「性大寒」
 *   4. 四气口径：大寒1 寒7 微寒4 平2 微温4 温7；词表漏「大寒」→ 1 味读空
 *   5. 归经：归肺 21/25，不归肺 4 味（白附子、天竺黄、海藻、昆布）
 *   6. 五味原样保留：微苦 2 味、涩 1 味；有毒/小毒 5 味
 *   7. 妊娠禁忌：未标注 22 / 忌用 2 / 慎用 1
 *   8. 教学边界 + docs 规模（4306、≥1500 非空白、无「底本·」）
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
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');
const count = (arr, v) => arr.filter((x) => x === v).length;

test('1. 规模：3 节 / 25 小节 / 75 段 / 4306 字 / 25 味', () => {
  const c = M.chapter();
  assert.strictEqual(c.counts.secs, 3);
  assert.strictEqual(c.counts.subs, 25);
  assert.strictEqual(c.counts.paras, 75);
  assert.strictEqual(c.counts.chars, 4306);
  assert.strictEqual(M.units().length, 25);
  assert.strictEqual(M.drugsOf().length, 25);
  assert.strictEqual(M.units().reduce((n, u) => n + u.paras.length, 0), 75);
});

test('2. 结构：每小节 3 段，小节名 = drugs.json 药名集合', () => {
  for (const u of M.units()) {
    assert.strictEqual(u.paras.length, 3, `${u.name} 段数`);
    for (const p of u.paras) assert.ok(p.trim().length > 0, `${u.name} 有空段`);
  }
  assert.deepStrictEqual(M.units().map((u) => u.name).sort(), M.drugsOf().map((d) => d.name).sort());
  assert.deepStrictEqual([...new Set(M.units().map((u) => u.sec))], ['21.1', '21.2', '21.3']);
});

test('3. 教材原文核对：docs 引语与「性大寒」都能逐字回查', () => {
  const pool = M.units().map((u) => u.paras.map(fold)).flat();
  const quotes = [];
  for (const line of read(DOC).split('\n')) {
    if (!/教材·第\d+章|《中药学·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) quotes.push(m[1]);
  }
  assert.ok(quotes.length >= 2, `标了教材出处的引语只有 ${quotes.length} 条`);
  for (const q of quotes) assert.ok(pool.some((p) => p.includes(fold(q))), `引语不在本章段落里：${q}`);
  assert.ok(M.bodyOf('葶苈子').includes('性大寒'));
  assert.ok(M.bodyOf('半夏').includes('燥湿化痰、降逆止呕'));
});

test('4. 四气口径：含「大寒」，且词表漏项会被抓出来', () => {
  const d = Object.fromEntries(M.qiDist());
  assert.deepStrictEqual(d, { 大寒: 1, 寒: 7, 微寒: 4, 平: 2, 微温: 4, 温: 7 });
  assert.strictEqual(Object.values(d).reduce((a, b) => a + b, 0), 25);
  assert.deepStrictEqual(M.drugsOf().filter((x) => x.nature.qi === '大寒').map((x) => x.name), ['葶苈子']);
  assert.strictEqual(M.qiByVocab(M.QI_VOCAB_FULL).filter((x) => x.qi === null).length, 0);
  const miss = M.qiByVocab(M.QI_VOCAB_SHORT).filter((x) => x.qi === null).map((x) => x.name);
  assert.deepStrictEqual(miss, ['葶苈子']);
});

test('5. 归经：归肺 21/25，4 味不归肺', () => {
  const j = Object.fromEntries(M.jingDist());
  assert.strictEqual(j['肺'], 21);
  const nl = M.withoutLung();
  assert.strictEqual(nl.length, 4);
  assert.deepStrictEqual(nl.map((d) => d.name).sort(), ['白附子', '天竺黄', '海藻', '昆布'].sort());
});

test('6. 五味原样：微苦 2 味、涩 1 味；有毒/小毒 5 味', () => {
  const w = Object.fromEntries(M.weiDist());
  assert.strictEqual(w['苦'], 14);
  assert.strictEqual(w['辛'], 12);
  assert.strictEqual(w['微苦'], 2);
  assert.strictEqual(w['涩'], 1);
  assert.deepStrictEqual(M.drugsOf().filter((d) => d.nature.wei.includes('微苦')).map((d) => d.name).sort(), ['款冬花', '瓜蒌'].sort());
  assert.deepStrictEqual(M.drugsOf().filter((d) => d.nature.wei.includes('涩')).map((d) => d.name), ['白果']);
  const tox = M.units().map((u) => M.toxicOf(u.name));
  assert.strictEqual(count(tox, '有毒'), 4);
  assert.strictEqual(count(tox, '小毒'), 1);
  assert.strictEqual(count(tox, '无毒'), 20);
});

test('7. 妊娠禁忌：未标注 22 / 忌用 2 / 慎用 1', () => {
  const p = M.units().map((u) => M.pregTolerant(u.name));
  assert.strictEqual(count(p, '未标注'), 22);
  assert.strictEqual(count(p, '忌用'), 2);
  assert.strictEqual(count(p, '慎用'), 1);
  assert.strictEqual(M.pregTolerant('半夏'), '慎用');
  assert.strictEqual(M.pregTolerant('天南星'), '忌用');
  assert.strictEqual(M.pregTolerant('白果'), '未标注');
  // 本章没有「禁用」档，也没有插入语写法 —— 与第 7 章的口径差异
  assert.strictEqual(M.units().filter((u) => M.pregNaive(u.name) !== M.pregTolerant(u.name)).length, 0);
});

test('8. 教学边界与 docs 规模', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: DIR, encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last) && /不构成/.test(last), `最后一行：${last}`);
  const doc = read(DOC);
  assert.ok(doc.replace(/,/g, '').includes('4306'), 'docs 里没有本章字数 4306');
  assert.ok(nonWs(doc) >= 1500, `docs 只有 ${nonWs(doc)} 非空白字符`);
  assert.ok(!/底本·/.test(doc));
  assert.ok(/教材·第21章/.test(doc));
});
