'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, docText, problemArithmetic } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读，规模与章题相称', () => {
  const a = analyze();
  assert.ok(a.hanzi > 2800, `汉字过少：${a.hanzi}`);
});

test('六节齐，起于三级改写、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('三级改写'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，障碍四类', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.deepStrictEqual(a.obstacles, ['认知类', '技能类', '流程类', '资源类']);
});

test('题面算术可复算：3 + 2 + 2 = 7，12 − 7 = 5', () => {
  const p = analyze().problem;
  assert.strictEqual(p.total, 12);
  assert.deepStrictEqual(p.blocked, { noResource: 3, conflict: 2, needSystem: 2 });
  assert.strictEqual(p.blockedSum, 7);
  assert.strictEqual(p.ready, 5);
  assert.ok(p.readyOk, `${p.total} − ${p.blockedSum} 不等于 ${p.ready}`);
});

test('机会数 9 × 14 × 3 = 378，执行率 151/378 约四成', () => {
  const p = analyze().problem;
  assert.strictEqual(p.actions, 23);
  assert.strictEqual(p.points, 9);
  assert.strictEqual(p.days, 14);
  assert.strictEqual(p.shifts, 3);
  assert.strictEqual(p.opportunities, 378);
  assert.ok(p.oppOk, '机会数与 动作点×天数×班次 对不上');
  assert.strictEqual(p.done, 151);
  assert.strictEqual(Math.round(p.rate * 100) / 100, 0.4);
});

test('算术解析不靠写死：换一组数也算得对', () => {
  const fake = '**PROBLEM:** 一份材料里的 8 条推荐，落到某病区逐条过可行性：2 条缺本地设备或人力，1 条与现行流程冲突，3 条要改信息系统才能留下执行记录，剩下 2 条当场可执行。再把 2 条拆成 10 个可核对的动作点，试运行两周：其中 5 个动作点按「10 天 × 每班一次」计，机会数为 5 × 10 × 2 = 100，实际完成 60 次。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.total, 8);
  assert.strictEqual(p.blockedSum, 6);
  assert.strictEqual(p.ready, 2);
  assert.ok(p.readyOk);
  assert.strictEqual(p.opportunities, 100);
  assert.ok(p.oppOk);
  assert.strictEqual(Math.round(p.rate * 1000) / 1000, 0.6);
});

test('三级改写与失效模式都在正文里', () => {
  const a = analyze();
  for (const l of a.levels) assert.ok(l.hits >= 1, `${l.name} 在正文里没出现`);
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('把培训当实施')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['医学源流论·用药如用兵论']);
  assert.ok(docText().includes('《医学源流论·用药如用兵论》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /12 − 7 = 5/);
  assert.doesNotMatch(out, /standards|units\.json|三辨|四位面|单元规模/);
});

test('quiz 结构：段齐、四选项、答案下标合法、解释够长', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(q.questions.length >= 5);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s}`);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4);
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
  }
});

test('quiz 的判断题能在正文里找到原词', () => {
  const body = shingles(docText());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const checks = q.questions.filter((x) => x.stage === 'check');
  assert.ok(checks.length >= 2);
  let grounded = 0;
  for (const item of checks) {
    const grams = [...shingles(item.options[item.correct])];
    if (grams.some((g) => body.has(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道题接地`);
});

test('答案不挤在同一个下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `正确项只用了 ${spread.size} 个下标`);
});

test('quiz 与正文同源：不含旧脚手架名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含 ${bad}`);
  }
  const code = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(!/三辨|四位面|单元规模|本章实测/.test(code));
  assert.ok(code.includes('07-zhuanhua-shijian/docs/zh.md'));
});
