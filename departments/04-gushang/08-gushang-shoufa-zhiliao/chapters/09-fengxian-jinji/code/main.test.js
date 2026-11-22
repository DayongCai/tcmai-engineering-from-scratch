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
  absoluteBans,
  relativeBans,
  redFlags,
  screenOrder,
  stopSignals,
  accidents,
  accidentFlow,
  notices,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_ORDER,
  EXPECTED_FLOW,
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

test('三层禁忌的条数是九、五、八，正文表逐张读出', () => {
  assert.strictEqual(absoluteBans().length, 9, `绝对禁忌 ${absoluteBans().length}`);
  assert.strictEqual(relativeBans().length, 5, `相对禁忌 ${relativeBans().length}`);
  assert.strictEqual(redFlags().length, 8, `红旗 ${redFlags().length}`);
});

test('绝对禁忌只需判断有没有，因此不含急性期肿胀这类可掂量的情形', () => {
  const kinds = absoluteBans().map((x) => x.kind);
  assert.ok(!kinds.some((x) => x.includes('急性期')), kinds.join('/'));
  assert.ok(kinds.includes('肿瘤'), kinds.join('/'));
  assert.ok(kinds.includes('妊娠'), kinds.join('/'));
});

test('筛查顺序是红旗在前', () => {
  assert.deepStrictEqual(screenOrder(), EXPECTED_ORDER);
});

test('停手信号五条，都写成了可观察的动作或体征', () => {
  const s = stopSignals();
  assert.strictEqual(s.length, 5, s.join('/'));
  assert.ok(s[0].includes('组织突然变硬'), s[0]);
  assert.ok(s.some((x) => x.includes('脉搏')), s.join('/'));
});

test('四类意外与七步流程齐备', () => {
  const a = accidents();
  assert.strictEqual(a.length, 4, a.join('/'));
  assert.ok(a.includes('晕厥') && a.includes('骨折'), a.join('/'));
  assert.deepStrictEqual(accidentFlow(), EXPECTED_FLOW);
});

test('告知的三项内容不含免责', () => {
  const n = notices();
  assert.strictEqual(n.length, 3, n.join('/'));
  assert.ok(!n.some((x) => x.includes('免责')), n.join('/'));
  assert.ok(sectionAt(readDoc(), 5).body.includes('不是责任归属'), '未写告知不改变责任归属');
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['绝对禁忌', '相对禁忌', '停手信号', '假阴性', '整体降级']) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('边界写进正文：不给发生率、不给分级阈值、流程不构成急救培训', () => {
  const text = readDoc();
  for (const k of ['不给发生率', '不给分级阈值', '不构成急救培训', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 3, '表格数变了');
});
