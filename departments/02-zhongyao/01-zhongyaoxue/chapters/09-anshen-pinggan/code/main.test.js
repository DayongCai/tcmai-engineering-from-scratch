'use strict';
/**
 * 第 9 章章内单测（8 项）
 *   1. 规模：5 节 / 26 小节 / 78 段 / 4923 字（22 章 1601 + 23 章 2565 + 24 章 757）
 *   2. 结构：每小节 3 段；三章药名集合 = drugs.json 第 22+23+24 章
 *   3. 教材原文核对：docs 的教材引语逐字可查；朱砂首段在正文里
 *   4. 四气：微寒3 寒6 平9 温5 微温1 凉2
 *   5. 靶经：22→心 8/9，23→肝 13/13，24→心 4/4
 *   6. 缺口：龙骨是唯一缺味/缺归经的药，且不被补齐
 *   7. 毒性与妊娠：有毒3 小毒1；禁用4 慎用7 未标注15
 *   8. 教学边界 + docs 规模（4923、≥1500 非空白、无「底本·」）
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

test('1. 规模：三章合计 5 节 / 26 小节 / 78 段 / 4923 字', () => {
  const st = M.chapterStats();
  assert.deepStrictEqual(st.map((s) => s.no), ['22', '23', '24']);
  assert.deepStrictEqual(st.map((s) => s.chars), [1601, 2565, 757]);
  assert.deepStrictEqual(st.map((s) => s.subs), [9, 13, 4]);
  assert.deepStrictEqual(st.map((s) => s.secs), [2, 2, 1]);
  const sum = st.reduce((a, s) => a + s.chars, 0);
  assert.strictEqual(sum, 4923);
  assert.strictEqual(st.reduce((a, s) => a + s.paras, 0), 78);
  assert.strictEqual(st.reduce((a, s) => a + s.subs, 0), 26);
  assert.strictEqual(M.unitsAll().length, 26);
  assert.strictEqual(M.drugsAll().length, 26);
});

test('2. 结构：每小节 3 段，药名集合 = drugs.json 三章并集', () => {
  for (const u of M.unitsAll()) {
    assert.strictEqual(u.paras.length, 3, `${u.name} 段数`);
    for (const p of u.paras) assert.ok(p.trim().length > 0, `${u.name} 有空段`);
  }
  assert.deepStrictEqual(M.unitsAll().map((u) => u.name).sort(), M.drugsAll().map((d) => d.name).sort());
  assert.deepStrictEqual([...new Set(M.unitsAll().map((u) => u.chapter))], ['22', '23', '24']);
  assert.strictEqual(new Set(M.unitsAll().map((u) => u.sub)).size, 26);
});

test('3. 教材原文核对：docs 引语与朱砂首段', () => {
  const pool = M.unitsAll().map((u) => u.paras.map(fold)).flat();
  const quotes = [];
  for (const line of read(DOC).split('\n')) {
    if (!/教材·第\d+章|《中药学·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) quotes.push(m[1]);
  }
  assert.ok(quotes.length >= 3, `标了教材出处的引语只有 ${quotes.length} 条`);
  for (const q of quotes) assert.ok(pool.some((p) => p.includes(fold(q))), `引语不在本章段落里：${q}`);
  assert.ok(M.bodyOf('朱砂').startsWith('朱砂为硫化物类矿物辰砂族辰砂'));
  assert.ok(M.bodyOf('麝香').includes('开窍醒神第一要药'));
});

test('4. 四气：微寒3 寒6 平9 温5 微温1 凉2', () => {
  const d = Object.fromEntries(M.qiDist());
  assert.deepStrictEqual(d, { 寒: 6, 微寒: 3, 凉: 2, 平: 9, 微温: 1, 温: 5 });
  assert.strictEqual(Object.values(d).reduce((a, b) => a + b, 0), 26);
  assert.strictEqual(d['平'], 9); // 平性最多：安神与平肝多需久服
});

test('5. 靶经：22 心、23 肝、24 心', () => {
  const t = Object.fromEntries(M.CHAPTERS.map((no) => [no, M.targetChannel(no)]));
  assert.deepStrictEqual(t['22'], { jing: '心', n: 8, total: 9 });
  assert.deepStrictEqual(t['23'], { jing: '肝', n: 13, total: 13 });
  assert.deepStrictEqual(t['24'], { jing: '心', n: 4, total: 4 });
  const j = Object.fromEntries(M.jingDist());
  assert.strictEqual(j['肝'], 18);
  assert.strictEqual(j['心'], 16);
});

test('6. 数据缺口：龙骨缺味缺归经，且不被补齐', () => {
  const miss = M.missingNature();
  assert.strictEqual(miss.length, 1);
  assert.strictEqual(miss[0].name, '龙骨');
  assert.strictEqual(miss[0].chapter, '22');
  assert.strictEqual(miss[0].wei, 0);
  assert.strictEqual(miss[0].guijing, 0);
  const l = M.drug('龙骨');
  assert.deepStrictEqual(l.nature.wei, []);
  assert.deepStrictEqual(l.nature.guijing, []);
  assert.ok(M.bodyOf('龙骨').includes('性平'));
});

test('7. 毒性与妊娠：有毒3 小毒1；禁用4 慎用7 未标注15', () => {
  const tox = M.unitsAll().map((u) => M.toxicOf(u.name));
  assert.strictEqual(count(tox, '有毒'), 3);
  assert.strictEqual(count(tox, '小毒'), 1);
  assert.strictEqual(count(tox, '无毒'), 22);
  assert.deepStrictEqual(M.unitsAll().filter((u) => M.toxicOf(u.name) !== '无毒').map((u) => u.name).sort(),
    ['全蝎', '刺蒺藜', '朱砂', '蜈蚣'].sort());
  const p = M.unitsAll().map((u) => M.pregTolerant(u.name));
  assert.strictEqual(count(p, '禁用'), 4);
  assert.strictEqual(count(p, '慎用'), 7);
  assert.strictEqual(count(p, '未标注'), 15);
  assert.strictEqual(M.pregTolerant('朱砂'), '禁用');
  assert.strictEqual(M.pregTolerant('石菖蒲'), '未标注');
});

test('8. 教学边界与 docs 规模', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: DIR, encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last) && /不构成/.test(last), `最后一行：${last}`);
  const doc = read(DOC);
  assert.ok(doc.replace(/,/g, '').includes('4923'), 'docs 里没有本章字数 4923');
  assert.ok(nonWs(doc) >= 1500, `docs 只有 ${nonWs(doc)} 非空白字符`);
  assert.ok(!/底本·/.test(doc));
  assert.ok(/教材·第22章/.test(doc));
});
