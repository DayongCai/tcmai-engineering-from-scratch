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
  assert.ok(a.hanzi > 3000, `汉字过少：${a.hanzi}`);
});

test('六节齐，起于提问动作、收于代价与边界', () => {
  const a = analyze();
  assert.strictEqual(a.sections.length, 6, `节数变了：${a.sections.join(' / ')}`);
  assert.ok(a.sections[0].includes('说法的边界'), a.sections[0]);
  assert.ok(a.sections[5].includes('代价与边界'), a.sections[5]);
});

test('三张表，四种抽样策略', () => {
  const a = analyze();
  assert.strictEqual(a.tables, 3);
  assert.deepStrictEqual(a.strategies, ['最大差异抽样', '典型个案抽样', '极端个案抽样', '滚雪球']);
});

test('题面算术可复算：9 小时 40 分 = 580 分钟', () => {
  const p = analyze().problem;
  assert.strictEqual(p.people, 12);
  assert.strictEqual(p.minutes, 580);
  assert.strictEqual(Math.round(p.minutesPerPerson * 10) / 10, 48.3);
  assert.strictEqual(p.transcriptChars, 142000);
});

test('主题支撑相加等于主题数，饱和可复算', () => {
  const p = analyze().problem;
  assert.strictEqual(p.themes, 5);
  assert.strictEqual(p.singleSupported, 3);
  assert.strictEqual(p.wellSupported, 2);
  assert.ok(p.supportSumOk, `${p.singleSupported}+${p.wellSupported} 不等于 ${p.themes}`);
  assert.deepStrictEqual(p.saturation, { startAt: 10, consecutive: 3, count: 3, ok: true });
  assert.strictEqual(Math.round(p.codesPerTheme * 10) / 10, 77.2);
});

test('算术解析不靠写死：饱和不够时判 false', () => {
  const fake = '**PROBLEM:** 拿一份 9 人访谈的资料复算：录音合计 5 小时 0 分，转写文本 8 万字，初始编码 100 个，归并为 4 个主题。其中 2 个主题只由 1 位受访者的一次发言支撑，另外 2 个主题有 5 人以上发言。实际从第 8 位受访者起不再出现新编码，连续 3 人无新编码即视为饱和。\n\n尾巴';
  const p = problemArithmetic(fake);
  assert.strictEqual(p.people, 9);
  assert.strictEqual(p.minutes, 300);
  assert.ok(p.supportSumOk);
  assert.strictEqual(p.saturation.count, 2);
  assert.strictEqual(p.saturation.ok, false);
});

test('质量四要素都在正文出现，失效模式六条', () => {
  const a = analyze();
  for (const t of a.trust) assert.ok(t.hits >= 1, `${t.name} 在正文里没出现`);
  assert.strictEqual(a.failModes.length, 6, a.failModes.join('、'));
  assert.ok(a.failModes.some((f) => f.includes('饱和宣告式使用')), a.failModes.join('、'));
});

test('引文取自正文，不是手填', () => {
  const a = analyze();
  assert.deepStrictEqual(a.citations, ['素问·汤液醪醴论']);
  assert.ok(docText().includes('《素问·汤液醪醴论》'));
});

test('脚本可运行，输出不含教材单元层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 [\d,]+ 汉字，6 节，3 张表/);
  assert.match(out, /12 − 10 \+ 1 = 3/);
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
  assert.ok(code.includes('03-zhixing-fangtan/docs/zh.md'));
});
