'use strict';
/**
 * 第 14 章单测（8 项）
 *   1. 12 味、名称一律取自 drugs.json（不手写），且 docs 里 12 味全出现
 *   2. 规模复算：2 章 / 2262 字 / 2 节 / 12 小节 / 36 段
 *   3. 毒性分级：大毒 2 · 有毒 6 · 小毒 1 · 未标 3，大毒就是升药与砒石
 *   4. 用法边界：只供外用 3 味；内服量 9 味，最小砒石、上限最大蛇床子
 *   5. 教材原文核对：docs 每个标了出处的「」引语，必须在该章正文里逐字出现
 *   6. 本仓库口径：性能向量没有毒性维度；未标毒性 ≠ 无毒；docs 写 2262 字
 *   7. docs 契约：MOTTO / 双根因 / ≥2 表 / 运行与验证 / 免责 / ≥1500 非空白字符
 *   8. 运行时最后一行是教学边界声明
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { CHAPTERS, drugs, scale, toxSummary, topicalOnly, doseRank, pregnancyBanned } = require('./main.js');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

function chapterPool(no) {
  const d = JSON.parse(read(BASE));
  const ch = d.chapters.find((x) => x.no === no);
  assert.ok(ch, `底本缺第 ${no} 章`);
  const paras = [...(ch.paras || [])];
  for (const s of ch.secs || []) {
    paras.push(...(s.paras || []));
    for (const u of s.subs || []) paras.push(...(u.paras || []));
  }
  return fold(paras.join('\n'));
}

test('1. 12 味药、名称取自 drugs.json、docs 全覆盖', () => {
  const { total, rows } = drugs();
  assert.strictEqual(total, 287);
  assert.strictEqual(rows.length, 12);
  assert.deepStrictEqual(rows.map((r) => r.name), [
    '雄黄', '硫黄', '白矾', '蛇床子', '蟾酥', '樟脑', '土荆皮',
    '升药', '轻粉', '砒石', '炉甘石', '硼砂',
  ]);
  assert.deepStrictEqual(CHAPTERS, ['28', '29']);
  for (const r of rows) assert.ok(['28', '29'].includes(r.chapter), `${r.name} 不在第 28/29 章`);
  const doc = read(DOC);
  for (const r of rows) assert.ok(doc.includes(r.name), `docs 没写 ${r.name}`);
});

test('2. 规模复算：2 章 / 2262 字 / 2 节 / 12 小节 / 36 段', () => {
  const s = scale();
  assert.strictEqual(s.chapters, 2);
  assert.strictEqual(s.chars, 2262);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.subs, 12);
  assert.strictEqual(s.paras, 36);
  assert.deepStrictEqual(s.rows.map((r) => [r.no, r.chars]), [['28', 1328], ['29', 934]]);
});

test('3. 毒性分级：大毒 2 · 有毒 6 · 小毒 1 · 未标 3', () => {
  assert.deepStrictEqual(toxSummary(), { 大毒: 2, 有毒: 6, 小毒: 1, 未标: 3 });
  const t = toxSummary();
  assert.strictEqual(Object.values(t).reduce((a, b) => a + b, 0), 12);
  const { rows } = drugs();
  assert.deepStrictEqual(rows.filter((r) => r.tox === '大毒').map((r) => r.name), ['升药', '砒石']);
  assert.deepStrictEqual(rows.filter((r) => r.tox === '小毒').map((r) => r.name), ['蛇床子']);
  assert.deepStrictEqual(rows.filter((r) => r.tox === '未标').map((r) => r.name), ['白矾', '炉甘石', '硼砂']);
});

test('4. 用法边界：只供外用 3 味；内服 9 味，最小砒石、上限最大蛇床子', () => {
  assert.deepStrictEqual(topicalOnly(), ['土荆皮', '升药', '炉甘石']);
  const rank = doseRank();
  assert.strictEqual(rank.length, 9);
  for (const x of rank) assert.ok(x.min > 0 && x.min < x.max, `${x.name} 区间不成立`);
  assert.strictEqual(rank[0].name, '砒石');
  assert.strictEqual(rank[0].raw, '0.002-0.004g');
  assert.strictEqual(rank[1].name, '蟾酥');
  assert.strictEqual(rank[rank.length - 1].max, 10);
  assert.deepStrictEqual(pregnancyBanned(), ['雄黄', '硫黄', '蟾酥', '樟脑', '轻粉', '砒石']);
  // 只供外用的三味不得同时拥有内服量
  const byName = Object.fromEntries(drugs().rows.map((r) => [r.name, r]));
  for (const n of topicalOnly()) assert.strictEqual(byName[n].dose, null, `${n} 既标只供外用又有内服量`);
});

test('5. 教材引文逐字保真（按标出的章号回查）', () => {
  const doc = read(DOC);
  const bad = [];
  let checked = 0;
  for (const line of doc.split('\n')) {
    const nos = [...line.matchAll(/教材·第(\d+)章|《中药学·第(\d+)章/g)].map((m) => m[1] || m[2]);
    if (!nos.length) continue;
    const pool = [...new Set(nos)].map((no) => chapterPool(no)).join('\u0000');
    for (const m of line.matchAll(/「([^」]{6,})」/g)) {
      checked += 1;
      if (!pool.includes(fold(m[1]))) bad.push(`${nos.join('/')}：${m[1].slice(0, 20)}…`);
    }
  }
  assert.deepStrictEqual(bad, [], `引文在所指章的正文里找不到：\n${bad.join('\n')}`);
  assert.ok(checked >= 6, `引文太少（${checked} 条）`);
});

test('6. 本仓库口径：向量无毒性维度、未标 ≠ 无毒、2262 字', () => {
  const { rows } = drugs();
  for (const r of rows) {
    assert.deepStrictEqual(r.natureKeys.filter((k) => k !== 'raw'), ['qi', 'wei', 'guijing'], `${r.name} 的 nature 结构变了`);
    assert.ok(!r.natureKeys.includes('toxicity'), 'nature 里出现了毒性字段（口径变了，需同步大纲）');
  }
  const doc = read(DOC);
  assert.ok(doc.includes('2262'), 'docs 没写本章教材字数 2262');
  assert.ok(/12 味/.test(doc), 'docs 没写 12 味药');
  assert.ok(/未标/.test(doc) && /不等于无毒/.test(doc), 'docs 没写清「未标不等于无毒」');
  assert.ok(/教材·第28章·28\.1/.test(doc), 'docs 没落到「教材·第N章·N.M」级引用');
  assert.ok(!/底本·|原文·/.test(doc), 'docs 出现「底本·」「原文·」式引用');
});

test('7. docs 契约：MOTTO / 双根因 / ≥2 表 / 运行与验证 / 免责', () => {
  const doc = read(DOC);
  assert.ok(nonWs(doc) >= 1500, `docs 非空白字符只有 ${nonWs(doc)}`);
  for (const k of ['**MOTTO:**', '**PROBLEM:**', '双根因定位', '环境逼迫', '知识积累', '代价与边界', '免责声明']) {
    assert.ok(doc.includes(k), `docs 缺「${k}」`);
  }
  const tables = (doc.match(/^\|\s*:?-{3,}/gm) || []).length;
  assert.ok(tables >= 2, `docs 只有 ${tables} 张表`);
  assert.ok(/```bash[\s\S]*node code\/main\.js[\s\S]*node --test code\/main\.test\.js[\s\S]*```/.test(doc), 'docs 缺运行与验证代码块');
});

test('8. 运行最后一行是教学边界', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行不是教学边界：${last}`);
  assert.ok(/不构成用药依据/.test(last), '缺「不构成用药依据」');
});
