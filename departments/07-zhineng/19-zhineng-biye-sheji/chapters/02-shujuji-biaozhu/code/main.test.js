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
  grams,
  pieces,
  kappaBands,
  kappaFloors,
  splits,
  cardFields,
  failures,
  recordCount,
  dualRatio,
  dataMonths,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，章节号与目录一致', () => {
  assert.ok(hanzi(readDoc()) > 2500, `正文过短：${hanzi(readDoc())}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.strictEqual(fs.existsSync(DOC), true);
});

test('小节结构：五节编号加代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('五个列表格：五件套、区间、切法、数据卡、失败模式', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), [5, 4, 4, 8, 6]);
});

test('规范五件套一件不少，判定顺序在第三位', () => {
  assert.deepStrictEqual(pieces(), ['标签集', '边界例', '判定顺序', '弃权规则', '版本号']);
});

test('一致性区间四档，下界依次抬升', () => {
  assert.deepStrictEqual(kappaBands(), ['低于 0.4', '0.4–0.6', '0.6–0.8', '高于 0.8']);
  const floors = kappaFloors();
  assert.deepStrictEqual(floors, [0.4, 0.4, 0.6, 0.8]);
  for (let i = 1; i < floors.length; i += 1) assert.ok(floors[i] >= floors[i - 1], '下界未单调');
});

test('切法四种，各自的单位不重复', () => {
  assert.deepStrictEqual(splits(), ['按记录随机切', '按患者切', '按机构切', '按时间切']);
  const units = tableBlocks(readDoc())[2].rows.map((r) => r[1]);
  assert.strictEqual(new Set(units).size, units.length, '切法的单位有重复');
});

test('数据卡八个字段，已知缺陷与版本都在其中', () => {
  assert.deepStrictEqual(cardFields(), ['来源', '规模', '纳排', '授权', '标注', '切分', '已知缺陷', '版本']);
});

test('六种失败模式按正文顺序，切分泄漏在内', () => {
  const f = failures();
  assert.strictEqual(f.length, 6, f.join('/'));
  assert.ok(f.includes('切分泄漏'), f.join('/'));
  assert.ok(f.includes('弃权被禁'), f.join('/'));
});

test('口径数字来自正文：3,000 条、双标 10%–20%、数据阶段 2 人月', () => {
  assert.strictEqual(recordCount(), 3000);
  assert.deepStrictEqual(dualRatio(), { min: 10, max: 20 });
  assert.strictEqual(dataMonths(), 2);
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
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
  }
  assert.strictEqual(q.slug, SLUG);
  assert.strictEqual(q.chapter, Number(CHAPTER));
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项覆盖四个位置（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('check 题带两个以上原文词组，且不考名目', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
  for (const x of check) assert.ok(!/三辨|四位面|本课第|本章实测|单元规模/.test(x.question), `题干残留套话：${x.question}`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.ok(out.includes(TITLE), '输出未含章题');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代价与边界写清了三件事：双标成本要省、一致性不等于正确、不给阈值', () => {
  const text = readDoc();
  for (const k of ['一致性系数不能替代临床判断', '本章不给一致性阈值', '双人标注的成本是单人的两倍以上']) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
