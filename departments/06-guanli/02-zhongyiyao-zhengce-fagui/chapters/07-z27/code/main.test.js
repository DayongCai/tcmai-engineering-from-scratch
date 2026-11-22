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
  boldItems,
  threeAnchors,
  anchorDetails,
  costModel,
  threePayments,
  threeTools,
  threeMeanings,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_ANCHORS,
  EXPECTED_PAYMENTS,
  EXPECTED_TOOLS,
  EXPECTED_MEANINGS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：六个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三个落点是机构、人员、支付，且每个都有对应的「名义并重」', () => {
  assert.deepStrictEqual(threeAnchors(), EXPECTED_ANCHORS);
  const d = anchorDetails();
  assert.strictEqual(d.length, 3, d.length);
  assert.ok(d[2].nominal.includes('价格表'), d[2].nominal);
  assert.ok(sectionAt(readDoc(), 0).body.includes('第三张才是充分条件'), '未写充分条件');
});

test('支付最硬：正文把理由写成钱的动作决定行为', () => {
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('支付最硬'), '未写支付最硬');
  assert.ok(body.includes('钱的动作一旦定了，行为就跟着走'), '未写钱的动作');
  assert.ok(body.includes('能不能自己养活自己'), '未写院长的判断输入');
});

test('诊查收入表的每一格都能从时长与收费现算出来', () => {
  const m = costModel();
  assert.strictEqual(m.sides.length, 2, m.sides.length);
  const [tcm, wm] = m.sides;
  assert.strictEqual(tcm.visits, 4);
  assert.strictEqual(wm.visits, 10);
  assert.ok(tcm.visitsOk && wm.visitsOk, '每小时接诊数与正文不一致');
  assert.ok(tcm.incomeOk && wm.incomeOk, '每小时收入与正文不一致');
  assert.ok(tcm.balanceOk && wm.balanceOk, '每小时结余与正文不一致');
  assert.strictEqual(tcm.day8, 160);
  assert.strictEqual(wm.day8, 1120);
  assert.strictEqual(m.gap, 960);
});

test('中医的成本结构是人力密集、耗材占比低、技术价值难进项目', () => {
  const body = sectionAt(readDoc(), 1).body;
  assert.ok(body.includes('人力密集，耗材占比低'), '未写人力密集');
  assert.ok(body.includes('得到的不是效率，是敷衍'), '未写压时间的后果');
  assert.ok(body.includes('治疗项目化'), '未写治疗项目化');
});

test('三种支付方式按第三节粗体读出，各奖励不同行为', () => {
  assert.deepStrictEqual(threePayments(), EXPECTED_PAYMENTS);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('奖励数量'), '未写按项目奖励数量');
  assert.ok(body.includes('奖励效率'), '未写按病种奖励效率');
  assert.ok(body.includes('让人少生病'), '未写按人头奖励方向');
  assert.ok(body.includes('组合'), '未写组合的做法');
});

test('传统知识三种工具按表序读出，专利一栏的困境是公开换保护', () => {
  assert.deepStrictEqual(threeTools(), EXPECTED_TOOLS);
  const body = sectionAt(readDoc(), 3).body;
  assert.ok(body.includes('以公开换保护'), '未写公开换保护');
  assert.ok(body.includes('无法直接申请专利'), '未写群体主体');
  assert.ok(body.includes('分层'), '未写分层策略');
});

test('并重三层含义都在第五节，检验标准在末节', () => {
  assert.deepStrictEqual(threeMeanings(), EXPECTED_MEANINGS);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('改变计价单元'), '未写改变计价单元');
  assert.ok(body.includes('还是只是说法'), '未写检验标准');
  assert.ok(body.includes('并重不等于平均') || sectionAt(readDoc(), 5).body.includes('并重不等于平均'), '未写并重不等于平均');
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
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    return [...grams(String(x.options[x.correct]))].filter((g) => body.has(g)).length >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，表格六格全部打 ✓', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成政策建议/);
  assert.ok(!/✗/.test(out), '输出里有现算与正文不一致的行');
});

test('本章的边界写进了正文：不引条号、不给价格与支付标准、不构政策建议', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与法规全称', '也不给具体价格与支付标准', '不构成政策建议']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 3, '表格数变了');
  assert.ok(occurrences(text, '并重') > 5, '并重讨论过少');
  assert.ok(boldItems(sectionAt(text, 2).body).filter((x) => x.includes('付费')).length === 3, '支付方式数变了');
});
