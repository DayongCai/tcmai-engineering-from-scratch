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
  sixItems,
  eightNames,
  threeGroups,
  segmentGradient,
  lostItems,
  beyondEight,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_SIX,
  EXPECTED_EIGHT,
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
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('原书只列六目，按正文原句读出', () => {
  assert.deepStrictEqual(sixItems(), EXPECTED_SIX);
});

test('八个名是六目拆开两条合并目得来的，不是另外八条', () => {
  assert.deepStrictEqual(eightNames(), EXPECTED_EIGHT);
  assert.strictEqual(eightNames().length, 8);
});

test('三组分工：摸管信息、接端提管位置、推拿按摩管气血', () => {
  const g = threeGroups();
  assert.strictEqual(g.length, 3, g.join('/'));
  assert.ok(g[0].includes('信息'), g[0]);
  assert.ok(g[1].includes('位置'), g[1]);
  assert.ok(g[2].includes('气血'), g[2]);
});

test('三段梯度表三段齐，力度方向相反：摸最轻、接端提最重、推拿按摩最轻', () => {
  const rows = segmentGradient();
  assert.strictEqual(rows.length, 3, `表行 ${rows.length}`);
  assert.ok(rows[0].force.includes('最轻'), rows[0].force);
  assert.ok(rows[1].force.includes('最重'), rows[1].force);
  assert.ok(rows[1].time.includes('最短'), rows[1].time);
  assert.ok(rows[2].force.includes('最轻'), rows[2].force);
  assert.ok(rows[2].time.includes('最长'), rows[2].time);
});

test('八法之外不是穷举：拔伸、折顶、分骨、回旋、扳法都在正文里', () => {
  const b = beyondEight();
  assert.strictEqual(b.length, 5, b.join('/'));
  for (const k of ['拔伸', '折顶', '分骨', '回旋', '扳法']) assert.ok(b.includes(k), k);
});

test('译成三类时丢掉的六样，正文粗体条目现算', () => {
  const lost = lostItems();
  assert.strictEqual(lost.length, 6, lost.join('/'));
  assert.ok(lost.some((x) => x.includes('摸法')), lost.join('/'));
  assert.ok(lost.some((x) => x.includes('提')), lost.join('/'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['欲合先离', '稳而准', '轻了无效', '先摸后接']) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
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

test('本章的立场与边界写进了正文', () => {
  const text = readDoc();
  for (const k of ['八法不是穷举', '本章不写操作参数', '神而明之', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 1, '表格数变了');
  assert.ok(sectionAt(text, 2).body.includes('提法'), '第三节未提提法');
});
