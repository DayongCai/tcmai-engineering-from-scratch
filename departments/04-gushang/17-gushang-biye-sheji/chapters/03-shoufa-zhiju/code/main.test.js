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
  positions,
  channels,
  channelClaims,
  processIndicator,
  endpointRule,
  braceFields,
  ethics,
  failures,
  sourceScale,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^0${CHAPTER}-`));
  assert.strictEqual(fs.existsSync(DOC), true);
});

test('小节结构：五个编号节加代价与边界，末节固定', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
  assert.match(titles[0], /最小可执行单元/);
  assert.match(titles[3], /伦理审查/);
});

test('五张表：规范、三线、支具、伦理、失败模式，行数一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [5, 3, 6, 6, 6]
  );
  assert.deepStrictEqual(blocks[0].head, ['位置', '要写清什么', '写成空话的样子']);
  assert.deepStrictEqual(blocks[2].head, ['字段', '写什么', '为什么必须有']);
});

test('规范五要素齐全，剂量口径排在第四位', () => {
  assert.deepStrictEqual(positions(), ['适用与不适用', '准备与体位', '接触点与方向', '剂量口径', '终止与转出']);
});

test('量化三条线各答不同问题，三条结论互不重复', () => {
  assert.deepStrictEqual(channels(), ['力学', '影像', '症状与功能']);
  const claims = channelClaims().map((c) => c.claim);
  assert.strictEqual(new Set(claims).size, 3, `三条线结论重复：${claims.join(' / ')}`);
  for (const c of channelClaims()) assert.ok(c.claim.length > 0, `${c.line} 没有结论`);
});

test('过程指标从正文加粗句读出，落在力学这条线', () => {
  assert.strictEqual(processIndicator(), '力学');
  assert.deepStrictEqual(channels().filter((c) => c === processIndicator()), ['力学']);
});

test('终点口径：至少两条线，主终点唯一', () => {
  const e = endpointRule();
  assert.strictEqual(e.atLeastLines, 2);
  assert.strictEqual(e.mainOnly, true);
});

test('支具六字段齐全，几何参数与不良事件都在其中', () => {
  assert.deepStrictEqual(braceFields(), ['取型方式', '几何参数', '材料与工艺', '佩戴方案', '调整与随访', '不良事件']);
});

test('伦理六环节齐全，审查时点排第一', () => {
  assert.deepStrictEqual(ethics(), ['审查时点', '方案一致', '知情同意', '隐私', '弱势人群', '利益与署名']);
});

test('六种失败模式按正文顺序列出，规范像口诀排第一', () => {
  assert.deepStrictEqual(failures(), ['规范像口诀', '单一指标', '支具止于「定制」', '先做后审', '操作者自评', '不良事件空白']);
});

test('取材规模取自正文：4 个手法与量化单元、1.15 万字', () => {
  const s = sourceScale();
  assert.strictEqual(s.units, 4);
  assert.strictEqual(s.wanzi, 1.15);
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
  assert.strictEqual(q.title, TITLE);
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项打散：四个位置都用到，且没有一边倒', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('check 题考的是正文里的判断，不是名目', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  assert.ok(check.length >= 2, `check 题只有 ${check.length} 道`);
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
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

test('代价与边界四件事都在：写规范会损失临场调整、几何不等于处方权、不给剂量、单元数只说明取材', () => {
  const text = readDoc();
  for (const k of [
    '把手法写成规范，一定会损失一部分东西',
    '支具的几何参数不等于处方权',
    '本章不给任何手法剂量',
    '不构成对父课内容的完整覆盖',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
