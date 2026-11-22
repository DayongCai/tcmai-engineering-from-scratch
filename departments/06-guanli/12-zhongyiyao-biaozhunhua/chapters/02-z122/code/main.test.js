'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  h2Titles,
  sectionAt,
  tableBlocks,
  layers,
  steps,
  conflictFixes,
  reviewCost,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_STEPS,
  CONFLICT_TYPES,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('五十六'), 56);
});

test('小节结构：六节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
  assert.strictEqual(SECTION_PROBES.length, h2Titles(readDoc()).length);
});

test('五层规范按正文表序读出，三层以上是强制或推荐', () => {
  const rows = layers(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.name), EXPECTED_LAYERS);
  assert.ok(rows[0].force.includes('强制'), rows[0].force);
  assert.ok(rows[1].force.includes('推荐'), rows[1].force);
  assert.ok(rows[3].scope.includes('自愿'), rows[3].scope);
  assert.ok(rows[4].force.includes('必须执行'), rows[4].force);
});

test('七步程序按正文表序读出，每步都有产出物', () => {
  const rows = steps(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.action), EXPECTED_STEPS);
  assert.strictEqual(rows.length, 7);
  for (const r of rows) assert.ok(r.output.length >= 2, `${r.action} 没有产出物`);
  assert.ok(rows[2].output.includes('编制说明'), rows[2].output);
  assert.ok(rows[6].output.includes('复审结论'), rows[6].output);
});

test('三类冲突都在第三节，且修法各不相同', () => {
  const c = conflictFixes(readDoc());
  assert.deepStrictEqual(c.map((x) => x.type), CONFLICT_TYPES);
  for (const x of c) assert.ok(x.text.length > 20, `${x.type} 段过短`);
  assert.ok(c[0].text.includes('概念层统一'), c[0].text);
  assert.ok(c[1].text.includes('取严者'), c[1].text);
  assert.ok(c[2].text.includes('方法比对'), c[2].text);
});

test('两条硬规则与两类附录的区分都写进正文', () => {
  const text = readDoc();
  assert.ok(text.includes('上位优先'), '缺上位优先');
  assert.ok(text.includes('下位可严不可宽'), '缺下位可严不可宽');
  assert.ok(text.includes('不得低于强制性国家标准'), '缺企业标准下限');
  assert.ok(text.includes('规范性附录是标准的组成部分'), '缺规范性附录');
  assert.ok(text.includes('资料性附录只是参考资料'), '缺资料性附录');
});

test('演算与正文自述一致：1800 处、450 小时、56 个工作日', () => {
  const c = reviewCost(readDoc());
  assert.strictEqual(c.fields, 600);
  assert.strictEqual(c.layersPer, 3);
  assert.strictEqual(c.minutes, 15);
  assert.strictEqual(c.spots, 1800);
  assert.strictEqual(c.hours, 450);
  assert.strictEqual(c.days, 56);
  assert.strictEqual(c.stated, 56, '正文自述的工作日数与现算不符');
});

test('quiz 结构：6 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 的 check 题至少两道能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个下标，且不含脚手架概念', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成标准化合规/);
  assert.ok(out.includes('1,800 处规定'), '输出未给出比对处数');
  assert.strictEqual(tableBlocks(readDoc()).length, 2, '表格数变了');
  assert.ok(occurrences(readDoc(), '五层') > 0, '正文未写层级数');
});
