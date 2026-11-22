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
  threeForms,
  formStages,
  threeChannels,
  channelReturns,
  channelBuys,
  fourLimits,
  threeUses,
  decoctionMath,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_FORMS,
  EXPECTED_STAGES,
  EXPECTED_CHANNELS,
  EXPECTED_BUYS,
  EXPECTED_LIMITS,
  EXPECTED_USES,
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

test('一株药三次变形，要求逐级加码：物品 → 加工 → 批次一致', () => {
  assert.deepStrictEqual(threeForms(), EXPECTED_FORMS);
  assert.deepStrictEqual(formStages(), EXPECTED_STAGES);
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('可重复性'), '未写可重复性');
  assert.ok(body.includes('原料是农业产品，成品是工业产品'), '未写原料与成品的张力');
});

test('注册三条通道按表序读出，各自要什么、换来什么成对', () => {
  assert.deepStrictEqual(threeChannels(), EXPECTED_CHANNELS);
  const r = channelReturns();
  assert.strictEqual(r.length, 3, r.length);
  assert.ok(r[1].got.includes('豁免临床'), r[1].got);
  assert.ok(r[2].got.includes('不得上市销售'), r[2].got);
});

test('三条通道各自「买」的是新、古、小而专', () => {
  assert.deepStrictEqual(channelBuys(), EXPECTED_BUYS);
});

test('四条限制按第三节粗体读出，第一条先否掉「产品」', () => {
  assert.deepStrictEqual(fourLimits(), EXPECTED_LIMITS);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('药学研究'), '未写药学研究不能少');
  assert.ok(body.includes('异病同治'), '未写异病同治在注册上不被承认');
});

test('使用端三个环节是抓方与调剂、代煎、配方颗粒', () => {
  assert.deepStrictEqual(threeUses(), EXPECTED_USES);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('第二双眼睛'), '未写复核的意义');
  assert.ok(body.includes('等量性'), '未写等量性');
});

test('代煎毛利能从表内设定现算，加一次复核就由赚转亏', () => {
  const m = decoctionMath();
  assert.strictEqual(m.doses, 7, `剂数 ${m.doses}`);
  assert.strictEqual(m.feePerDose, 3);
  assert.strictEqual(m.laborPerDose, 2.5);
  assert.ok(m.marginOk, `现算 ${m.margin} ≠ 正文 ${m.docMargin}`);
  assert.strictEqual(m.reviewCost, 1);
  assert.strictEqual(m.marginWithReview, -3.5);
  assert.ok(m.marginWithReview < 0 && m.margin > 0, '未体现由赚转亏');
});

test('饮片标准在地方，责任在企业：内控与追溯都被写进了正文', () => {
  const body = sectionAt(readDoc(), 3).body;
  assert.ok(body.includes('企业要在底线之上建立自己的内控标准'), '未写内控标准');
  assert.ok(body.includes('追溯'), '未写追溯');
  assert.ok(body.includes('只能前移到产地'), '未写治理前移');
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

test('命令行可运行，代煎两行都算出数、无残片', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成用药建议/);
  assert.ok(!/NaN/.test(out), '输出里有未求值的数');
});

test('本章的边界写进了正文：不引条号、不给工艺参数、不构用药建议', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与规范全称', '也不给具体品种的工艺参数', '不构成用药建议']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 3, '表格数变了');
  assert.ok(occurrences(text, '经典名方') > 3, '经典名方讨论过少');
  assert.ok(boldItems(sectionAt(text, 2).body).length >= 4, '目录限制条目不足');
});
