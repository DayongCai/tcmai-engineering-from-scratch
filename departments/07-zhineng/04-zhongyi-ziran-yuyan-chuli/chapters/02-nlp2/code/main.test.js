'use strict';

/**
 * 第 2 章 自检：异体表、归一化与最大匹配都作用在正文数据上，quiz 结构与接地逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/02-nlp2/code/main.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const main = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const RAW = () => fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文汉字数达到补实门槛且与独立重算一致', () => {
  assert.ok(main.stats().hanzi >= 2500, `只有 ${main.stats().hanzi}`);
  assert.strictEqual(main.stats().hanzi, (RAW().match(HANZI) || []).length);
});

test('异体表从正文读出 6 对，含鞕—硬与藏—脏', () => {
  const rows = main.variantTable(RAW());
  assert.strictEqual(rows.length, 6, `读到 ${rows.length} 行`);
  const map = main.normTable(rows);
  assert.strictEqual(map['鞕'], '硬');
  assert.strictEqual(map['藏'], '脏');
  assert.strictEqual(map['府'], '腑');
});

test('归一化改字且逐处记录改写位置（可逆）', () => {
  const rows = main.variantTable(RAW());
  const { text, marks } = main.normalize('大便鞕，欬逆上气，十一藏', main.normTable(rows));
  assert.strictEqual(text, '大便硬，咳逆上气，十一脏');
  assert.strictEqual(marks.length, 3);
  assert.deepStrictEqual(marks.map((m) => m.from), ['鞕', '欬', '藏']);
  // 还原：按位置把原字写回，必须得到原文
  const chars = [...text];
  for (const m of marks) chars[m.index] = m.from;
  assert.strictEqual(chars.join(''), '大便鞕，欬逆上气，十一藏');
});

test('归一化只改映射内的字，其余字符原样保留', () => {
  const { text, marks } = main.normalize('脉浮，头项强痛', { 鞕: '硬' });
  assert.strictEqual(text, '脉浮，头项强痛');
  assert.strictEqual(marks.length, 0);
});

test('最大匹配：长的先匹配，头项强痛不被切成头项／强痛', () => {
  const dict = main.termDict(RAW());
  assert.deepStrictEqual(main.maxMatch('头项强痛而恶寒', dict), ['头项强痛', '而', '恶寒']);
});

test('最大匹配：词典含麻黄汤时，方名不被切成药名加剂型', () => {
  const dict = main.termDict(RAW());
  const spans = main.maxMatch('麻黄汤去麻黄', dict);
  assert.deepStrictEqual(spans, ['麻黄汤', '去', '麻黄']);
  // 反例：词典抽掉麻黄汤，同一个字符串必然切错
  const broken = main.maxMatch('麻黄汤去麻黄', dict.filter((w) => w !== '麻黄汤'));
  assert.notDeepStrictEqual(broken, spans);
  assert.ok(broken.includes('麻黄') && broken.includes('汤'), '缺麻黄汤时应当切出麻黄／汤');
});

test('三种切法表为字级／词级／术语级，代价栏各有内容', () => {
  const g = main.grammars(RAW());
  assert.strictEqual(g.length, 3);
  assert.ok(g.some((x) => x.name.startsWith('字级')));
  assert.ok(g.some((x) => x.name.startsWith('术语级')));
  for (const x of g) assert.ok(x.bad.length > 4, `${x.name} 缺代价说明`);
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 越界：${q.question}`);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, `explain 过短：${q.question}`);
  }
});

test('quiz：check 题至少 2 道的正确选项含正文原词', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions.filter((q) => q.stage === 'check');
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of qs) {
    const segs = String(q.options[q.correct]).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/);
    const hit = segs.some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
      return false;
    });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道接地`);
});

test('脚本可运行，打印归一与切分结果', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('大便硬，咳逆上气，十一脏'), '未打印归一结果');
  assert.ok(out.includes('头项强痛 / 而 / 恶寒'), '未打印切分结果');
  assert.match(out, /不构成诊断/);
});
