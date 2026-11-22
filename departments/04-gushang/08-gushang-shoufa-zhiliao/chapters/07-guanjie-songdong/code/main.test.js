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
  fiveGrades,
  threeCauses,
  threeCriteria,
  fourRisks,
  gradeFiveOwner,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_GRADES,
  EXPECTED_CAUSES,
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

test('小节结构：七个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].endsWith('代价与边界'), titles[6]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('五级按正文表序读出，级别是罗马数字', () => {
  assert.deepStrictEqual(fiveGrades().map((x) => x.level), EXPECTED_GRADES);
});

test('第五级按定义不属松动，归扳法与旋转复位', () => {
  const owner = gradeFiveOwner();
  assert.ok(owner.includes('属整复类'), owner);
  assert.ok(owner.includes('不属松动'), owner);
  const v = fiveGrades()[4];
  assert.ok(v.position.includes('高速低幅'), v.position);
});

test('受限的三种原因与各自的级别一一对应', () => {
  const c = threeCauses();
  assert.deepStrictEqual(c.map((x) => x.cause), EXPECTED_CAUSES);
  assert.ok(c[0].level.includes('Ⅰ'), c[0].level);
  assert.ok(c[1].level.includes('Ⅲ'), c[1].level);
  assert.ok(c[2].level.includes('不做'), c[2].level);
});

test('松动的风险是四套，集中在反复做多', () => {
  assert.strictEqual(fourRisks().length, 4, fourRisks().join('/'));
  assert.ok(sectionAt(readDoc(), 3).body.includes('反复做多'), '未写风险集中处');
});

test('算松开了的判据是三条，且不含响声', () => {
  const c = threeCriteria();
  assert.strictEqual(c.length, 3, c.join('/'));
  assert.ok(c[0].includes('终点后移'), c[0]);
  assert.ok(c[1].includes('同步'), c[1]);
  assert.ok(c[2].includes('敢用'), c[2]);
  assert.ok(!c.some((x) => x.includes('响声')), c.join('/'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['终末位', '高速低幅', '踩跷法', '捻法', '关节囊']) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('边界写进正文：不写参数、分级是转述的框架、对应不是等同', () => {
  const text = readDoc();
  for (const k of ['本章不写参数', '不是本课的原产', '「对应」不是「等同」', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
