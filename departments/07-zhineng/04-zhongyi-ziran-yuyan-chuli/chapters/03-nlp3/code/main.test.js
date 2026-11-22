'use strict';

/**
 * 第 3 章 自检：bigram 与平滑都在正文引文上现算，quiz 结构与接地逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/03-nlp3/code/main.test.js
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

test('样本句取自正文引文，不是外部语料', () => {
  const s = main.sampleSentence(RAW());
  assert.ok(s.includes('太阳病'), `样本句不含太阳病：${s}`);
  assert.ok(RAW().includes(s), '样本句必须在正文里逐字出现');
});

test('bigram 计数：位置数 = 字符数 - 1，且分句不跨句拼接为空', () => {
  const st = main.sampleStats(main.sampleSentence(RAW()));
  assert.strictEqual(st.positions, st.chars - 1);
  assert.strictEqual(st.unique, main.bigrams(st.sentence).size);
  assert.strictEqual(st.singletons, [...main.bigrams(st.sentence).values()].filter((v) => v === 1).length);
});

test('样本句的稀疏形状：不同 bigram 数不超过位置数，绝大多数只出现一次', () => {
  const st = main.sampleStats(main.sampleSentence(RAW()));
  assert.ok(st.unique <= st.positions);
  assert.ok(st.singletons / st.unique >= 0.5, `单次 bigram 只占 ${(st.singletons / st.unique).toFixed(2)}`);
});

test('高频 bigram 里含标点——正文说的「标点成了边界信号」可复算', () => {
  const st = main.sampleStats(main.sampleSentence(RAW()));
  assert.ok(st.punctInTop >= 2, `前五里只有 ${st.punctInTop} 个含标点`);
});

test('加一平滑：概率质量合计为 1，且未登录质量严格为正', () => {
  const a = main.addOne(main.sampleSentence(RAW()));
  assert.ok(Math.abs(a.seenMass + a.unseenMass - 1) < 1e-9, `合计 ${a.seenMass + a.unseenMass}`);
  assert.ok(a.unseenMass > 0, '未登录质量必须为正，否则异体字会让整句概率为零');
  for (const p of a.probs.values()) assert.ok(p > 0, '加一平滑后不应有零概率');
  assert.strictEqual(a.V, a.probs.size + 1, 'V 应比已见字符多一个未登录槽');
});

test('代码块数与正文一致，且正文不给任何模型跑分', () => {
  const s = main.stats();
  assert.ok(s.codeBlocks >= 1, '正文应至少有一个代码块');
  assert.ok(!/困惑度[^。]{0,20}\d+(\.\d+)?/.test(RAW()), '正文不应出现具体困惑度数值');
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

test('脚本可运行，打印样本句与平滑质量', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('样本句'), '未打印样本句');
  assert.ok(out.includes('未登录字符质量'), '未打印平滑结果');
  assert.match(out, /不构成诊断/);
});
