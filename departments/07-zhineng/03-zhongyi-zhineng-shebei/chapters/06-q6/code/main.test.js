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
  layers,
  trends,
  challengeGroups,
  experiments,
  predictions,
  datasetCriteria,
  refusalKinds,
  clinicalQuestions,
  cnSmall,
  followupCost,
  CHAPTER,
  SLUG,
  QUIZ,
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

test('小节结构：六节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.match(titles[5], /^六、代价与边界$/);
});

test('本章无表格，与正文一致', () => {
  assert.strictEqual(tableBlocks(readDoc()).length, 0);
});

test('三层布局：战略、学术、产业', () => {
  assert.deepStrictEqual(layers(readDoc()), ['战略层', '学术层', '产业层']);
});

test('六条趋势由正文现读，顺序不混', () => {
  const t = trends(readDoc());
  assert.strictEqual(t.length, 6, t.join('/'));
  for (const k of ['从台式到可穿戴', '从单模态到多模态', '从云端到边缘', '从黑箱到可解释', '从产品到器械', '从孤岛到互操作']) {
    assert.ok(t.includes(k), `缺 ${k}`);
  }
});

test('三组挑战：数据、算法、临床', () => {
  assert.deepStrictEqual(challengeGroups(readDoc()), ['数据这一组', '算法这一组', '临床这一组']);
});

test('四个实验齐备', () => {
  const e = experiments(readDoc());
  assert.strictEqual(e.length, 4, e.join('/'));
  assert.deepStrictEqual(e.map((x) => x.slice(0, 3)), ['实验一', '实验二', '实验三', '实验四']);
});

test('三个预测都在，且每条都带「如果错了会看到什么」', () => {
  const p = predictions(readDoc());
  assert.strictEqual(p.length, 3, p.join('/'));
  const text = readDoc();
  assert.strictEqual((text.match(/如果错了/g) || []).length >= 3, true, '预测未写成可推翻的形式');
});

test('数据可用四项判据：完整率、一致性、人群分布、随访', () => {
  const c = datasetCriteria(readDoc());
  assert.strictEqual(c.length, 4, c.join('/'));
  assert.ok(c[0].includes('采集条件完整率'), c[0]);
  assert.ok(c[1].includes('标注者间一致性'), c[1]);
  assert.ok(c[2].includes('人群分布'), c[2]);
  assert.ok(c[3].includes('随访完整率'), c[3]);
});

test('拒答要区分三种原因，不是一句「无法判断」', () => {
  const r = refusalKinds(readDoc());
  assert.strictEqual(r.length, 3, r.join('/'));
  assert.ok(r[0].includes('信号质量不足'), r[0]);
  assert.ok(r[1].includes('训练分布'), r[1]);
  assert.ok(r[2].includes('模型内部不一致'), r[2]);
});

test('临床三问正是替代动作、节省时间、出错谁负责', () => {
  const q = clinicalQuestions(readDoc());
  assert.strictEqual(q.length, 3, q.join('/'));
  assert.ok(q[0].includes('替代了哪个动作'), q[0]);
  assert.ok(q[1].includes('节省了多少时间'), q[1]);
  assert.ok(q[2].includes('出了错谁负责'), q[2]);
});

test('中文小数字解析可用，随访账由人数与比例现算', () => {
  assert.strictEqual(cnSmall('十'), 10);
  assert.strictEqual(cnSmall('五'), 5);
  const c = followupCost(readDoc());
  assert.ok(c, '正文未写随访成本');
  assert.strictEqual(c.people, 200);
  assert.strictEqual(c.pct, 5);
  assert.strictEqual(c.perDay, 10);
  assert.strictEqual(c.perDay, c.statedPerDay);
  assert.strictEqual(c.yearly, 3650);
  assert.ok(c.ok);
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
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，随访账做了对账', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /每天 10 个电话/);
  assert.match(out, /对得上/);
});

test('本章的边界：趋势判断是分析框架，预测不涉投资建议', () => {
  const text = readDoc();
  assert.ok(text.includes('不是行业预测报告'), '未声明不是行业预测报告');
  assert.ok(text.includes('不构成任何投资或采购建议'), '未声明不构成投资建议');
  assert.ok(text.includes('是不含任何未公开的数据') || text.includes('不含任何未公开的数据'), '未声明不涉未公开数据');
});
