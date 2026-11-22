'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  threeSegments,
  negativeSigns,
  fiveExclusions,
  threePhases,
  hardLines,
  scapulaGoals,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_SEGMENTS,
  EXPECTED_NEGATIVES,
  EXPECTED_PHASES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且章节号与目录一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：八个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 8, `小节数 ${titles.length}`);
  assert.ok(titles[7].endsWith('代价与边界'), titles[7]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('颈肩三段：颈段、肩胛段、肩段，括号内的解剖注不算第三段', () => {
  assert.deepStrictEqual(threeSegments(), EXPECTED_SEGMENTS);
});

test('落枕的判据是三条阴性体征，都是「没有」', () => {
  assert.deepStrictEqual(negativeSigns(), EXPECTED_NEGATIVES);
});

test('要排除的五类齐备', () => {
  const e = fiveExclusions();
  assert.strictEqual(e.length, 5, e.join('/'));
  assert.ok(e.includes('神经根型颈椎病急性发作'), e.join('/'));
  assert.ok(e.includes('淋巴结炎'), e.join('/'));
});

test('肩周炎三期按痛与僵的比例判断，不是按时间', () => {
  assert.deepStrictEqual(threePhases(), EXPECTED_PHASES);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('痛与僵的比例'), '未写判断依据');
  assert.ok(body.includes('不靠时间'), '未写不靠时间');
});

test('颈部硬界是三条，不是四条', () => {
  const h = hardLines();
  assert.strictEqual(h.length, 3, h.join('/'));
  assert.ok(h[1].includes('不以'), h[1]);
  assert.ok(h[2].includes('转诊'), h[2]);
});

test('肩胛段的处理目标是两件事，一半被动一半主动', () => {
  const g = scapulaGoals();
  assert.strictEqual(g.length, 2, g.join('/'));
  const body = sectionAt(readDoc(), 6).body;
  assert.ok(body.includes('一半是被动手法，一半是主动训练'), '未写两者不可互相替代');
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['三条阴性体征', '疼痛弧', '落臂征', '腋神经', '肩胛提肌']) {
    assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
  }
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('边界写进正文：不写手法参数、肩部的手法不改变结构、经验与风险负相关', () => {
  const text = readDoc();
  for (const k of ['本章不写手法参数', '肩部的手法不改变结构', '呈负相关', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
