'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const M = require('./main.js');
const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const round4 = (v) => Math.round(Number(v) * 10000) / 10000;

/** 正文里 4 字以上的连续汉字片段 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('身份钉住：章号与目录名', () => {
  const m = M.measure();
  assert.strictEqual(String(m.chapter), '14');
  assert.strictEqual(m.slug, "14-zhiliang-pingtai");
  assert.strictEqual(m.doc, "chapters/14-zhiliang-pingtai/docs/zh.md");
});

test('正文规模钉住：汉字/节/表/段', () => {
  const m = M.measure();
  assert.strictEqual(m.hanzi, 2818);
  assert.strictEqual(m.sections, 6);
  assert.strictEqual(m.tables, 1);
  assert.strictEqual(m.tableRows, 3);
  assert.strictEqual(m.paragraphs, 32);
});

test('汉字数与正文逐字复核', () => {
  const raw = fs.readFileSync(DOC, 'utf8');
  assert.strictEqual(M.measure().hanzi, hanzi(raw));
});

test('节 = 二级标题，且与正文逐条对应', () => {
  const m = M.measure();
  const n = fs.readFileSync(DOC, 'utf8').split(/\r?\n/).filter((l) => /^##\s+/.test(l)).length;
  assert.strictEqual(m.sections, n);
  assert.strictEqual(m.sectionTitles.length, n);
  for (const t of m.sectionTitles) assert.ok(t.length > 1, '节标题为空');
});

test('正文算术钉住：式子与结果', () => {
  const got = M.measure().arithmetic.map((a) => [a.expr, round4(a.value)]);
  const want = [
    ["3 × 2", 6],
    ["1 / 6", 0.1667],
  ];
  assert.deepStrictEqual(got, want);
});

test('算术不手打：改正文即改结果', () => {
  const { arithmetic } = M;
  const probe = '示例：4 × 5 与 10 ÷ 4 与 0.5² 与 1/5';
  const got = arithmetic(probe).map((a) => a.expr);
  assert.deepStrictEqual(got, ['4 × 5', '10 ÷ 4', '0.5^2', '1 / 5']);
  assert.strictEqual(round4(arithmetic(probe)[0].value), 20);
  assert.strictEqual(round4(arithmetic(probe)[1].value), 2.5);
  assert.strictEqual(round4(arithmetic(probe)[2].value), 0.25);
  assert.strictEqual(round4(arithmetic(probe)[3].value), 0.2);
});

test('只读本章正文：源码里没有外部数据源路径', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes("chapters/14-zhiliang-pingtai/docs/zh.md"), '头部未指向本章正文');
  assert.ok(!src.includes('standards'), '不应引用外部数据源');
  assert.ok(!/units\.json|chapter-map\.json/.test(src), '不应引用外部索引');
});

test('脚本可运行，输出含规模与口径说明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 80, '输出过短');
  assert.match(out, /汉字 \d+ · 节 \d+/);
  assert.match(out, /由本章正文现算/);
});

test('quiz 结构：≥5 题、三段齐、4 选项、下标合法、解释够长', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.chapter, 14);
  assert.ok(q.questions.length >= 5, '题数不足');
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4, '不是 4 选项：' + item.question);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, '下标非法');
    assert.ok(hanzi(item.explain) >= 30, '解释过短：' + item.question);
  }
});

test('quiz 接地：≥2 道 check 的正确选项含正文原词', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = shingles(fs.readFileSync(DOC, 'utf8'));
  let hit = 0;
  for (const item of q.questions) {
    if (item.stage !== 'check') continue;
    const grams = [...shingles(item.options[item.correct])];
    if (grams.some((g) => body.has(g))) hit += 1;
  }
  assert.ok(hit >= 2, '只有 ' + hit + ' 道 check 题接地');
});

test('quiz 答案下标至少三种', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = new Set(q.questions.map((x) => x.correct));
  assert.ok(idx.size >= 3, '答案下标只有 ' + idx.size + ' 种');
});

test('quiz 与代码不含脚手架字眼', () => {
  const bad = ['三' + '辨', '四' + '位面', '单元' + '规模', '本章' + '实测', '本课第'];
  const quiz = fs.readFileSync(QUIZ, 'utf8');
  const code = fs.readFileSync(MAIN, 'utf8');
  for (const w of bad) {
    assert.ok(!quiz.includes(w), 'quiz 含 ' + w);
    assert.ok(!code.includes(w), 'main.js 含 ' + w);
  }
});
