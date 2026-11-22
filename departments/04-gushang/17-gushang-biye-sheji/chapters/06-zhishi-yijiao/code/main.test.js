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
  handoverPackage,
  sopQuestions,
  acceptance,
  acceptanceCriteria,
  retirement,
  failures,
  budget,
  paramExternal,
  responsibilityBoundary,
  driftCriterion,
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
  assert.match(titles[0], /交接包四件/);
  assert.match(titles[2], /验收动作/);
});

test('五张表：交接包、SOP、验收、退役、失败模式，行数一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [4, 5, 3, 5, 6]
  );
  assert.deepStrictEqual(blocks[0].head, ['件', '内容', '断掉的症状']);
  assert.deepStrictEqual(blocks[2].head, ['动作', '谁做', '通过标准', '失败说明什么']);
});

test('交接包四件齐全，环境与版本与口径都在其中', () => {
  assert.deepStrictEqual(handoverPackage(), ['数据与测量协议', '代码与参数', '环境与版本', '口径与术语']);
});

test('SOP 五问齐全，最后一问是做不到怎么办', () => {
  const qs = sopQuestions();
  assert.deepStrictEqual(qs, ['谁来做', '什么条件下做', '具体做什么', '做到什么算完', '做不到怎么办']);
  assert.match(qs[4], /做不到/, '安全阀应落在「做不到怎么办」');
});

test('三条验收动作是阶梯：复算、改一处、找一处错', () => {
  assert.deepStrictEqual(acceptance(), ['复算', '改一处', '找一处错']);
});

test('每条验收动作都配了通过标准与失败含义，互不相同', () => {
  const pairs = acceptanceCriteria();
  assert.strictEqual(pairs.length, 3);
  for (const p of pairs) {
    assert.ok(p.pass.length > 0, `${p.action} 没有通过标准`);
    assert.ok(p.failureMeans.length > 0, `${p.action} 没有失败说明`);
  }
  assert.strictEqual(new Set(pairs.map((p) => p.pass)).size, 3, '通过标准有重复');
  assert.match(pairs[1].pass, /按预期变化/, '「改一处」的通过标准应是按预期变化');
});

test('五条退役条件齐全，性能漂移的判据是可测形式', () => {
  assert.deepStrictEqual(retirement(), ['量表或评分体系更新', '设备更换', '人群外使用', '性能漂移', '人员变动']);
  const d = driftCriterion();
  assert.ok(d, '未找到性能漂移的判据');
  assert.match(d, /固定复评样本/);
  assert.match(d, /重算主终点/);
});

test('参数外置与责任边界两句判断都在正文里', () => {
  assert.ok(paramExternal(), '未写参数外置的落点');
  assert.match(paramExternal(), /配置文件/);
  assert.ok(responsibilityBoundary(), '未写责任边界');
  assert.match(responsibilityBoundary(), /不是判断本身/);
});

test('六种失败模式按正文顺序列出，文档代替交接排第一', () => {
  assert.deepStrictEqual(failures(), ['文档代替交接', '环境不定版', '口径各说各话', '失效清单空缺', '单点依赖', '无退役条件']);
});

test('口径数字来自正文：211,000 元、18.6 个月', () => {
  const b = budget();
  assert.strictEqual(b.cost, 211000);
  assert.strictEqual(b.payback, 18.6);
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

test('代价与边界四件事都在：交接成本接近开发、移交不等于责任转移、不给维护周期、数字是教学口径', () => {
  const text = readDoc();
  for (const k of [
    '完整交接的成本可能接近开发本身',
    '移交不等于责任转移',
    '本章不给维护周期、复评频率或漂移阈值',
    '不指向任何具体项目或机构',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
