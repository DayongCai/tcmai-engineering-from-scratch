'use strict';

/**
 * 第 10 章 自检：三档来源、四类禁自动化动作、降级表从正文读出；抽取只返回可查 span。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/10-nlp10/code/main.test.js
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

test('三档来源齐备，且只有原文直述与规则推出可作结论/提示', () => {
  const t = main.sourceTiers(RAW());
  assert.deepStrictEqual(t.map((x) => x.tier), ['原文直述', '规则推出', '模型猜测']);
  assert.ok(t[0].usable.includes('记录'));
  assert.ok(t[1].usable.includes('提示'));
  assert.ok(t[2].usable.includes('不可作为结论'));
});

test('四类不该自动化的动作与正文一致', () => {
  assert.deepStrictEqual(main.forbiddenActions(RAW()), ['证型定论', '方药剂量', '配伍禁忌的放行', '预后判断']);
});

test('禁自动化动作的输出形态固定：只给候选、不换算、只能拦、退回人判', () => {
  assert.strictEqual(main.decide('证型定论'), '只给候选与依据');
  assert.ok(main.decide('方药剂量').includes('不换算'));
  assert.strictEqual(main.decide('配伍禁忌的放行'), '只能拦，不能放');
  assert.ok(main.decide('预后判断').includes('退回人判'));
  assert.ok(main.decide('自动开方').includes('拒绝'));
});

test('抽取只返回文本里逐字可查的 span，抽不到就返回空', () => {
  const lex = ['舌红苔黄', '脉浮', '恶寒'];
  const hits = main.extract('舌红苔黄，脉浮数。', lex);
  assert.deepStrictEqual(hits.map((h) => h.term), ['舌红苔黄', '脉浮']);
  for (const h of hits) {
    assert.strictEqual('舌红苔黄，脉浮数。'.slice(h.start, h.end), h.term, 'span 必须能切回原词');
  }
  assert.deepStrictEqual(main.extract('患者自觉尚可。', lex), []);
});

test('分档：无 span 无条文只能是模型猜测，不得升格为结论', () => {
  assert.strictEqual(main.classify({ span: true }), '原文直述');
  assert.strictEqual(main.classify({ rule: true }), '规则推出');
  assert.strictEqual(main.classify({}), '模型猜测');
  // 「此为热证」在文本里没有 span，不能升格
  assert.strictEqual(main.classify({ span: false, rule: false }), '模型猜测');
});

test('失败降级表 5 行，含「拒答」与「不填默认值」', () => {
  const f = main.failureTable(RAW());
  assert.strictEqual(f.length, 5);
  const all = f.map((x) => x.input + x.action + x.output).join('');
  assert.ok(all.includes('拒答'), '缺拒答');
  assert.ok(all.includes('不填默认值'), '缺不填默认值');
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

test('脚本可运行，打印分档与降级表，不输出任何诊疗结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('原文直述／规则推出／模型猜测'));
  assert.ok(out.includes('不填默认值'));
  assert.match(out, /不构成诊断/);
});
