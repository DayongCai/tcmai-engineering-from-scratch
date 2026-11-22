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
  tableBlocks,
  occurrences,
  grams,
  fourShifts,
  toleranceRows,
  conceded,
  withheld,
  tractionFour,
  upperRules,
  successSigns,
  failures,
  nonIndications,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_SHIFTS,
  EXPECTED_CONCEDE,
  EXPECTED_WITHHOLD,
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

test('小节结构：六个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].endsWith('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('四种移位按正文表序读出', () => {
  assert.deepStrictEqual(fourShifts().map((x) => x.shift), EXPECTED_SHIFTS);
});

test('四条纠正的力各不相同，不能互相替代', () => {
  const forces = fourShifts().map((x) => x.force);
  assert.strictEqual(new Set(forces).size, 4, forces.join('/'));
  assert.ok(forces[0].includes('牵引'), forces[0]);
  assert.ok(forces[1].includes('折顶'), forces[1]);
  assert.ok(forces[2].includes('横向'), forces[2]);
  assert.ok(forces[3].includes('回旋'), forces[3]);
});

test('容差表五项：让步的是短缩与侧方，不让步的是旋转与分离', () => {
  assert.strictEqual(toleranceRows().length, 5, `表行 ${toleranceRows().length}`);
  assert.deepStrictEqual(conceded(), EXPECTED_CONCEDE);
  assert.deepStrictEqual(withheld(), EXPECTED_WITHHOLD);
});

test('牵引四项齐备，持续一项写明中途不得松手', () => {
  const t = tractionFour();
  assert.deepStrictEqual(t, ['方向', '重量', '持续', '对抗']);
  assert.ok(readDoc().includes('中途不得松手'), '未写持续的要求');
});

test('上骱三规则：顺势、缓慢、不可强力', () => {
  assert.deepStrictEqual(upperRules(), ['顺势', '缓慢', '不可强力']);
});

test('复位成功的三个体征里没有响声', () => {
  const s = successSigns();
  assert.strictEqual(s.length, 3, s.join('/'));
  assert.ok(!s.some((x) => x.includes('响声')), s.join('/'));
  assert.ok(s[2].includes('骨性标志关系复原'), s[2]);
});

test('三种失败与不属适应证的六类分开计数', () => {
  assert.strictEqual(failures().length, 3, failures().join('/'));
  assert.strictEqual(nonIndications().length, 6, nonIndications().join('/'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['欲合先离', '骨间膜', '上骱', '手法复位的适应证']) {
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

test('边界写进正文：不给参数、不给影像判读标准、一次不成即改判', () => {
  const text = readDoc();
  for (const k of ['不给参数', '不给影像判读标准', '一次复位不成的处置比成功更重要', '不替代专业判断']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
