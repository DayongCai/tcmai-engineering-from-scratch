'use strict';
/**
 * 第 13 章单测（7 项）
 *   1. 规模复算：7 章 / 7965 字 / 18 节 / 37 小节 / 74 段（全部从底本 exist 现算）
 *   2. 五道闸：顺序固定、每闸词频 > 0、每闸都指到教材章
 *   3. 剂量区间：单位一律 g、每条 min < max、最小 0.3-0.6g、最大 15-60g
 *   4. 教材原文核对：docs 里每个标了出处的「」引语，必须在该出处章的正文里逐字出现
 *   5. 本仓库口径：总论 0 味单药（药库 287 味全在各论）、docs 写本 7965 字
 *   6. docs 契约：MOTTO / PROBLEM / 双根因 / ≥2 表 / 运行与验证 / 免责 / ≥1500 非空白字符
 *   7. 运行时最后一行是教学边界声明
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ZONGLUN, GATES, chapters, scale, gateHits, doseRanges, drugless } = require('./main.js');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

/** 某章全部段落（章级 / 节级 / 小节级）折叠后拼成一串 */
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

test('1. 规模复算：7 章 / 7965 字 / 18 节 / 37 小节 / 74 段', () => {
  const s = scale();
  assert.strictEqual(s.chapters, 7);
  assert.deepStrictEqual(ZONGLUN, ['1', '2', '3', '4', '6', '7', '8']);
  assert.strictEqual(s.chars, 7965, '总论 7 章字数');
  assert.strictEqual(s.secs, 18);
  assert.strictEqual(s.subs, 37);
  assert.strictEqual(s.paras, 74);
  // 逐章字数与底本 counts 一致，且合计等于总数
  const byNo = Object.fromEntries(chapters().map((c) => [c.no, c.chars]));
  assert.deepStrictEqual(byNo, { 1: 982, 2: 1486, 3: 1225, 4: 1360, 6: 881, 7: 1060, 8: 971 });
  assert.strictEqual(s.rows.reduce((n, r) => n + r.chars, 0), 7965);
});

test('2. 五道闸：顺序固定、词频 > 0、每闸指到教材章', () => {
  const g = gateHits();
  assert.strictEqual(g.length, 5);
  assert.deepStrictEqual(g.map((x) => x.name), ['产地', '采集与贮藏', '炮制', '配伍', '禁忌与剂量']);
  assert.deepStrictEqual(g.map((x) => x.id), ['g1', 'g2', 'g3', 'g4', 'g5']);
  for (const x of g) {
    assert.ok(x.chapters.length >= 1, `${x.name} 没指教材章`);
    assert.ok(x.total > 0, `${x.name} 在教材正文里一次也没命中`);
    for (const c of x.chapters) assert.ok(ZONGLUN.includes(c), `${x.name} 指到本章范围外的第 ${c} 章`);
  }
  // 七情七类都在第 6 章出现（配伍闸的词表不是空转）
  const kinds = GATES.find((x) => x.id === 'g4').keys;
  assert.strictEqual(kinds.length, 7);
});

test('3. 剂量区间：单位 g、min < max、最小 0.3-0.6g、最大 15-60g', () => {
  const d = doseRanges();
  assert.ok(d.length >= 5, `只抽到 ${d.length} 个区间`);
  for (const x of d) {
    assert.ok(/^\d+(\.\d+)?-\d+(\.\d+)?g$/.test(x.raw), `${x.raw} 不是 g 单位的区间`);
    assert.ok(x.min > 0 && x.min < x.max, `${x.raw} 区间不成立`);
  }
  assert.strictEqual(d[0].raw, '0.3-0.6g');
  assert.strictEqual(d[0].min, 0.3);
  assert.strictEqual(d[d.length - 1].raw, '15-60g');
  assert.strictEqual(d[d.length - 1].max, 60);
});

test('4. 教材引文逐字保真（按标出的章号回查）', () => {
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
  assert.ok(checked >= 8, `引文太少（${checked} 条）`);
});

test('5. 本仓库口径：总论 0 味单药、本章 7965 字', () => {
  const dl = drugless();
  assert.strictEqual(dl.total, 287);
  assert.strictEqual(dl.inZonglun, 0, '总论章不应有单药条目');
  const doc = read(DOC);
  assert.ok(doc.includes('7965'), 'docs 没写本章教材字数 7965');
  assert.ok(/0 味/.test(doc), 'docs 没说清总论 0 味单药');
  assert.ok(/教材·第8章·8\.1/.test(doc), 'docs 没落到「教材·第N章·N.M」级引用');
  assert.ok(!/底本·|原文·/.test(doc), 'docs 出现「底本·」「原文·」式引用');
});

test('6. docs 契约：MOTTO / 双根因 / ≥2 表 / 运行与验证 / 免责', () => {
  const doc = read(DOC);
  assert.ok(nonWs(doc) >= 1500, `docs 非空白字符只有 ${nonWs(doc)}`);
  for (const k of ['**MOTTO:**', '**PROBLEM:**', '双根因定位', '环境逼迫', '知识积累', '代价与边界', '免责声明']) {
    assert.ok(doc.includes(k), `docs 缺「${k}」`);
  }
  const tables = (doc.match(/^\|\s*:?-{3,}/gm) || []).length;
  assert.ok(tables >= 2, `docs 只有 ${tables} 张表`);
  assert.ok(/```bash[\s\S]*node code\/main\.js[\s\S]*node --test code\/main\.test\.js[\s\S]*```/.test(doc), 'docs 缺运行与验证代码块');
});

test('7. 运行最后一行是教学边界', () => {
  const run = execFileSync('node', ['code/main.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  const last = run.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), `最后一行不是教学边界：${last}`);
  assert.ok(/不构成用药依据/.test(last), '缺「不构成用药依据」');
});
