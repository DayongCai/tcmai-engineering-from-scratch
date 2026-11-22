'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  degrees,
  gradeOf,
  causeLines,
  steps,
  neverDo,
  disposition,
  care,
  afterExtubation,
  escalation,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('四度分度齐全，判据是吸气性而不是「喘」', () => {
  const d = degrees(doc);
  assert.strictEqual(d.length, 4);
  assert.deepStrictEqual(d.map((x) => x.degree.replace(/\s/g, '')), ['Ⅰ度', 'Ⅱ度', 'Ⅲ度', 'Ⅳ度']);
  assert.match(d[0].active, /吸气性呼吸困难/);
  assert.match(d[1].hypoxia, /无烦躁、无发绀/);
  for (const x of d) assert.ok(x.action.length >= 6, `${x.degree} 缺处理方向`);
});

test('床旁所见能报回分度：活动后才有→Ⅰ，安静即有→Ⅱ，烦躁发绀→Ⅲ，衰竭→Ⅳ', () => {
  assert.strictEqual(gradeOf({ onlyOnExertion: true }), 'Ⅰ 度');
  assert.strictEqual(gradeOf({ atRest: true }), 'Ⅱ 度');
  assert.strictEqual(gradeOf({ agitatedOrCyanotic: true }), 'Ⅲ 度');
  assert.strictEqual(gradeOf({ collapse: true }), 'Ⅳ 度');
  assert.strictEqual(gradeOf({}), null);
  // 趋势压过点数：从活动后加重变成安静时也重，已经在往Ⅲ度走
  assert.strictEqual(gradeOf({ atRest: true, agitatedOrCyanotic: true }), 'Ⅲ 度');
});

test('病因按处理方式归四条线，不按病名罗列', () => {
  const c = causeLines(doc);
  assert.strictEqual(c.length, 4);
  assert.deepStrictEqual(c.map((x) => x.line), ['炎症', '水肿', '异物', '外伤']);
  for (const x of c) assert.ok(x.how.length >= 6, `${x.line} 缺处理方式`);
  assert.match(c[1].how, /数分钟内进展|最快/);
});

test('六步顺序为判断→体位→氧→通路器械→病因→建立气道', () => {
  const s = steps(doc);
  assert.strictEqual(s.length, 6);
  assert.deepStrictEqual(s.map((x) => x.replace(/^第[一二三四五六]步，/, '')), ['判断', '体位', '氧', '通路与器械', '病因治疗', '建立气道']);
});

test('三不做恰好三条，且都针对会造成额外损害的动作', () => {
  const n = neverDo(doc);
  assert.strictEqual(n.length, 3);
  assert.ok(n[0].includes('压舌'));
  assert.ok(n[1].includes('掏取'));
  assert.ok(n[2].includes('转运'));
});

test('四档转与留按分度与设备条件排，不是按病名', () => {
  const d = disposition(doc);
  assert.strictEqual(d.length, 4);
  assert.match(d[0].case, /就地处理/);
  assert.match(d[1].case, /边治边转/);
  assert.match(d[2].case, /先建气道/);
  assert.match(d[3].case, /立即转/);
  assert.match(d[2].sign, /Ⅲ度、Ⅳ度/);
});

test('三条硬升级判据与反判据都在', () => {
  const e = escalation(doc);
  assert.strictEqual(e.hard.length, 3);
  assert.match(e.hard[0], /分度在升/);
  assert.match(e.hard[1], /烦躁|发绀/);
  assert.match(e.counter, /转得动才转/);
});

test('调护六件事与拔管后三件事都读得齐', () => {
  assert.strictEqual(care(doc).length, 6);
  const a = afterExtubation(doc);
  assert.strictEqual(a.length, 3);
  assert.deepStrictEqual(a, ['嗓音', '吞咽', '瘢痕与狭窄']);
});

test('正文明写会厌炎是分度表的结构性盲区', () => {
  assert.match(doc, /结构性盲区/);
  assert.match(doc, /凡疑及会厌炎，不在门诊反复检查/);
});

test('脚本可运行，输出含现算声明与急救边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, /教学样例/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
