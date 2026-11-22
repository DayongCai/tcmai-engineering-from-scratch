'use strict';

/**
 * 第 5 章 自检：六类实体、BIO 示例、kappa 与按字符成本都从正文现算，quiz 逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/05-nlp5/code/main.test.js
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

test('正文汉字数达到补实门槛', () => {
  assert.ok(main.stats().hanzi >= 2500, `只有 ${main.stats().hanzi}`);
});

test('六类实体齐备：药／方／证／症／脉／穴，且各带处理规则', () => {
  const types = main.entityTypes(RAW());
  assert.strictEqual(types.length, 6);
  assert.deepStrictEqual(types.map((t) => t.type), ['药', '方', '证', '症', '脉', '穴']);
  for (const t of types) assert.ok(t.handling.length > 2, `${t.type} 缺处理规则`);
  const zheng = types.find((t) => t.type === '症');
  assert.ok(zheng.handling.includes('degree') && zheng.handling.includes('negated'), '症应按程度与否定分属性');
});

test('BIO 标注与正文示例逐字一致', () => {
  const tags = main.bioTags('头项强痛而恶寒', [
    { start: 0, end: 4, type: 'SYM' },
    { start: 5, end: 7, type: 'SYM' },
  ]).join(' ');
  assert.strictEqual(tags, 'B-SYM I-SYM I-SYM I-SYM O B-SYM I-SYM');
  assert.strictEqual(tags, main.docBioExample(RAW()), '脚本结果应与正文示例一致');
});

test('BIO 只在实体首字用 B，其余用 I，实体外为 O', () => {
  const t = main.bioTags('恶寒无汗', [{ start: 0, end: 2, type: 'SYM' }, { start: 2, end: 4, type: 'SYM' }]);
  assert.deepStrictEqual(t, ['B-SYM', 'I-SYM', 'B-SYM', 'I-SYM']);
  assert.ok(main.bioTags('恶寒', []).every((x) => x === 'O'));
});

test('kappa 扣掉碰巧一致：原始一致率 95% 时 kappa 明显更低', () => {
  const a = [...Array(18).fill('O'), 'B', 'I'];
  const b = [...Array(18).fill('O'), 'B', 'O'];
  const k = main.kappa(a, b);
  const raw = 19 / 20;
  assert.ok(Math.abs(raw - 0.95) < 1e-9);
  assert.ok(k < raw - 0.2, `kappa ${k} 未明显低于一致率 ${raw}`);
  assert.ok(Math.abs(k - 0.649) < 0.01, `kappa 应为 0.649，实为 ${k}`);
  assert.strictEqual(main.kappa(a, a), 1);
  assert.strictEqual(main.kappa([], []), null);
});

test('按字符成本：300 字 × 1,000 条 = 30 万次决策，双标 60 万次', () => {
  const c = main.annotationCost({ chars: 300, records: 1000, dispute: 0.1 });
  assert.strictEqual(c.decisions, 300000);
  assert.strictEqual(c.double, 600000);
  assert.strictEqual(c.arbitration, 60000);
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5);
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
    const hit = String(q.options[q.correct])
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道接地`);
});

test('脚本可运行，打印 BIO 与 kappa', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('B-SYM I-SYM I-SYM I-SYM O B-SYM I-SYM'));
  assert.ok(out.includes('Cohen'));
  assert.match(out, /不构成诊断/);
});
