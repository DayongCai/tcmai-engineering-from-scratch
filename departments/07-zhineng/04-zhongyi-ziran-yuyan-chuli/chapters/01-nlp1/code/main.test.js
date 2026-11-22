'use strict';

/**
 * 第 1 章 自检：正文派生的数字从文件现算，quiz 的结构与接地逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/01-nlp1/code/main.test.js
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

test('正文存在，汉字数达到补实门槛（≥2,500）', () => {
  const s = main.stats();
  assert.ok(s.hanzi >= 2500, `本章汉字只有 ${s.hanzi}`);
});

test('汉字数与独立重算一致', () => {
  assert.strictEqual(main.stats().hanzi, (RAW().match(HANZI) || []).length);
});

test('文体表给出四种文体，且含病历与标准', () => {
  const g = main.genres(RAW());
  assert.strictEqual(g.length, 4, `文体只有 ${g.length} 种：${g.join('／')}`);
  for (const name of ['医古文', '教材与讲义', '电子病历', '标准与药典']) {
    assert.ok(g.includes(name), `缺文体：${name}`);
  }
});

test('噪声分级为字符级→句级→语义级，顺序不可颠倒', () => {
  const lv = main.noiseLevels(RAW());
  assert.deepStrictEqual(lv.map((x) => x.name), ['字符级', '句级', '语义级']);
  assert.deepStrictEqual(lv.map((x) => x.order), ['一', '二', '三']);
});

test('四条文体样本说的是同一件事：都含「恶寒」', () => {
  const v = main.fourVoices(RAW());
  assert.deepStrictEqual(Object.keys(v).sort(), ['教材', '标准', '病历', '经典'].sort());
  for (const [k, text] of Object.entries(v)) {
    assert.ok(text.includes('恶寒'), `${k} 样本里没有「恶寒」`);
  }
  // 病历用的是「无」否定，其余三种不用 —— 这就是同一事实的四种语法
  assert.ok(v['病历'].includes('无'), '病历样本应以「无」作否定');
});

test('异体字对从正文表格外的行内配对读出，含鞕—硬', () => {
  const pairs = main.variantPairs(RAW());
  assert.ok(pairs.length >= 6, `只读到 ${pairs.length} 对`);
  assert.ok(pairs.some(([a, b]) => a === '鞕' && b === '硬'), '缺鞕—硬');
  assert.ok(pairs.some(([a, b]) => a === '欬' && b === '咳'), '缺欬—咳');
});

test('表数与标题数与独立重算一致', () => {
  const text = RAW();
  const s = main.stats();
  const tables = text.split(/\r?\n/).filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l.trim())).length;
  const heads = text.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).length;
  assert.strictEqual(s.tables, tables);
  assert.strictEqual(s.sections, heads);
  assert.ok(main.headings(text).some((h) => h.includes('代价与边界')), '缺「代价与边界」节');
});

test('quiz：≥5 题，覆盖 pre／check／post，每题 4 选项且 correct 合法', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 下标非法：${q.question}`);
    const hz = (String(q.explain).match(HANZI) || []).length;
    assert.ok(hz >= 30, `explain 只有 ${hz} 汉字：${q.question}`);
  }
});

test('quiz：check 题至少 2 道的正确选项含正文原词（≥4 汉字）', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions.filter((q) => q.stage === 'check');
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of qs) {
    const right = String(q.options[q.correct]);
    const hit = right
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('脚本可运行，输出含现算标记与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('2,758') || out.length > 200, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊断/);
  assert.ok(out.includes('四种文体样本'), '未打印文体样本');
});
