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
  fourGates,
  gateDetails,
  twoGaps,
  highRiskPoints,
  fourChecks,
  threeFailures,
  threeProcedures,
  threeLines,
  penaltyArithmetic,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_GATES,
  EXPECTED_GAPS,
  EXPECTED_CHECKS,
  EXPECTED_FAILURES,
  EXPECTED_LINES,
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

test('四道门按正文表序读出，每道门都带问题与卡点', () => {
  assert.deepStrictEqual(fourGates(), EXPECTED_GATES);
  const d = gateDetails();
  assert.strictEqual(d.length, 4, d.length);
  assert.ok(d[1].stuck.includes('抽检覆盖'), d[1].stuck);
  assert.ok(d[3].stuck.includes('处罚悬殊'), d[3].stuck);
});

test('发现门被写成本章最易低估的一道，且与证据门分开', () => {
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('最容易被低估'), '未写最易低估');
  assert.ok(body.includes('规范的密度与检查的密度是两件事'), '未写密度之别');
  assert.ok(sectionAt(readDoc(), 0).body.includes('专项整治'), '未写专项整治是撑开发现门的机制');
});

test('两处空档是接口处与能力处，不是一个泛泛的「人手不够」', () => {
  assert.deepStrictEqual(twoGaps(), EXPECTED_GAPS);
  const body = sectionAt(readDoc(), 1).body;
  assert.ok(body.includes('认不下来'), '未写能力处的后果');
  assert.ok(body.includes('四个部门都能管一点'), '未写接口处的交叉');
});

test('高风险点位四类，与「增加检查频次」相反', () => {
  const r = highRiskPoints();
  assert.strictEqual(r.length, 4, r.join('/'));
  assert.ok(r[0].includes('侵入性'), r[0]);
  assert.ok(r[3].includes('儿童'), r[3]);
  assert.ok(sectionAt(readDoc(), 1).body.includes('不是增加检查频次'), '未写不靠加频次');
});

test('现场四件套是证、人、药、记录，顺序即正文节序', () => {
  assert.deepStrictEqual(fourChecks(), EXPECTED_CHECKS);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('查排班表与签名'), '未写查人的方式');
  assert.ok(body.includes('辨证'), '未写病历里的辨证一环');
});

test('罚则三种失效与责任三条线都按正文粗体读出', () => {
  assert.deepStrictEqual(threeFailures(), EXPECTED_FAILURES);
  assert.deepStrictEqual(threeLines(), EXPECTED_LINES);
  assert.ok(sectionAt(readDoc(), 4).body.includes('移送'), '未写移送这一连接点');
});

test('三项程序制度是行政执法公示、全过程记录、重大执法决定法制审核', () => {
  const p = threeProcedures();
  assert.strictEqual(p.length, 3, p.join('/'));
  assert.ok(p[0].includes('公示'), p[0]);
  assert.ok(p[1].includes('全过程记录'), p[1]);
  assert.ok(p[2].includes('法制审核'), p[2]);
});

test('「罚不痛」的算术能从表内设定现算出来，与正文写的月收入一致', () => {
  const a = penaltyArithmetic();
  assert.strictEqual(a.perService, 300);
  assert.strictEqual(a.visits, 200);
  assert.strictEqual(a.illegalVisits, 60, `现算人次 ${a.illegalVisits}`);
  assert.ok(a.monthlyOk, `现算月收入 ${a.monthly} ≠ 正文 ${a.docMonthly}`);
  assert.strictEqual(a.fine, 10000);
  assert.strictEqual(a.months, 12);
  assert.strictEqual(a.total, 216000);
  assert.ok(a.multiple > 20, `倍数 ${a.multiple}`);
});

test('责任有轻重顺序：责令改正最轻、吊销最重，不是并列清单', () => {
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('责令改正最轻'), '未写最轻');
  assert.ok(body.includes('吊销最重'), '未写最重');
  assert.ok(body.includes('比例原则'), '未写比例原则');
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

test('命令行可运行，演算行不出现未求值的拼接残片', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成办案指引/);
  assert.ok(!out.includes("' +"), '输出里有未求值的字符串拼接');
});

test('本章的边界写进了正文：罚则是分子、量化只到演算、不构办案指引', () => {
  const text = readDoc();
  for (const k of ['监管能力是分母，罚则是分子', '本章不引具体条文序号与法规全称', '不构成法律意见']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
  assert.ok(occurrences(text, '罚不痛') > 0, '缺「罚不痛」');
  assert.ok(boldItems(sectionAt(text, 3).body).length >= 3, '失效条目不足');
});
