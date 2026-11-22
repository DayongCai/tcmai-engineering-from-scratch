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
  threeFeatures,
  threeQuestions,
  contractMath,
  twoBands,
  indicatorTiers,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_FEATURES,
  EXPECTED_QUESTIONS,
  EXPECTED_TIERS,
  EXPECTED_BANDS,
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

test('三个特征是按人头拨款、服务包清单化、考核看率，不是并列口号', () => {
  assert.deepStrictEqual(threeFeatures(), EXPECTED_FEATURES);
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('与提供什么服务无关'), '未写拨款与服务无关');
  assert.ok(body.includes('不进报表、不计工作量'), '未写清单之外的后果');
  assert.ok(body.includes('率是可比的，也是可造的'), '未写率的可造性');
});

test('传染病防治三问是时机、身份、药品来源，一个都不能跳过', () => {
  assert.deepStrictEqual(threeQuestions(), EXPECTED_QUESTIONS);
  const body = sectionAt(readDoc(), 1).body;
  assert.ok(body.includes('「参与」而不是「补充」'), '未写参与而非补充');
  assert.ok(body.includes('不取决于战时的动员'), '未写平时决定战时');
});

test('健康促进的落点不在卫生部门手里，落地靠程序', () => {
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('影响健康的决策，大多不在卫生部门手里'), '未写落点在别处');
  assert.ok(body.includes('健康影响评估'), '未写健康影响评估');
});

test('家医签约的算术：收入、余额、服务包三项都能现算，且与正文一致', () => {
  const m = contractMath();
  assert.strictEqual(m.fee, 120);
  assert.strictEqual(m.residents, 3000);
  assert.ok(m.incomeOk, `现算收入 ${m.income} ≠ 正文 ${m.docIncome}`);
  assert.ok(m.balanceOk, `现算余额 ${m.balance} ≠ 正文 ${m.docBalance}`);
  assert.ok(m.packageOk, `现算服务包 ${m.packageCost} ≠ 正文 ${m.docPackage}`);
  assert.strictEqual(m.buyers, 300);
  assert.strictEqual(m.share, 75);
});

test('可行区间很窄：两个价格带必须分开设计', () => {
  assert.deepStrictEqual(twoBands(), EXPECTED_BANDS);
  const body = sectionAt(readDoc(), 3).body;
  assert.ok(body.includes('可行区间很窄'), '未写可行区间');
  assert.ok(body.includes('基本包做不起、个性化包卖不动'), '未写两难');
});

test('指标三层并用，规律是越容易测量越容易失真', () => {
  assert.deepStrictEqual(indicatorTiers(), EXPECTED_TIERS);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('越容易测量的指标，越容易被满足，也越容易失真'), '未写失真规律');
  assert.ok(body.includes('三层缺一层'), '未写三层缺一层的后果');
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

test('命令行可运行，算术三行全部打 ✓', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成公卫决策建议/);
  assert.ok(!/✗/.test(out), '输出里有现算与正文不一致的行');
});

test('本章的边界写进了正文：不引条号、数字为演算设定、不构决策建议', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与规范全称', '只用于展示收支约束', '不构成公卫决策建议']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 1, '表格数变了');
  assert.ok(occurrences(text, '清单') > 3, '清单讨论过少');
  assert.ok(boldItems(sectionAt(text, 0).body).length >= 3, '特征条目不足');
});
