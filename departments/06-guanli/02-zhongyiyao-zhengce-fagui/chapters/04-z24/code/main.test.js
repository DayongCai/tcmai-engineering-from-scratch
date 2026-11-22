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
  orderedBold,
  threeLayers,
  layerDuties,
  layerRoles,
  threeCuts,
  recordParts,
  informedScenes,
  threeHandles,
  responsibilityChain,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_ROLES,
  EXPECTED_CUTS,
  EXPECTED_RECORD,
  EXPECTED_HANDLES,
  EXPECTED_CHAIN,
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

test('三层规范按表序读出，三层在责任认定中的作用各不相同', () => {
  assert.deepStrictEqual(threeLayers(), EXPECTED_LAYERS);
  const d = layerDuties();
  assert.strictEqual(d.length, 3, d.length);
  assert.ok(d[0].duty.includes('过错'), d[0].duty);
  assert.ok(d[1].duty.includes('注意'), d[1].duty);
  assert.ok(d[2].duty.includes('参照'), d[2].duty);
});

test('三层分工是法律定底线、规范定水准、院内制度定落实', () => {
  assert.deepStrictEqual(layerRoles(), EXPECTED_ROLES);
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('不来自法律'), '未写院内制度的效力来源');
  assert.ok(body.includes('管理问题'), '未写违反院内制度的性质');
});

test('个体化与标准化不是二选一：一个是策略，一个是过程管理', () => {
  const body = sectionAt(readDoc(), 1).body;
  assert.ok(body.includes('个体化是诊疗策略，标准化是过程管理'), '未写策略与过程的区分');
  assert.ok(body.includes('留出判断的痕迹') || body.includes('留下判断的痕迹'), '未写痕迹');
  assert.deepStrictEqual(threeCuts(), EXPECTED_CUTS);
});

test('病历四段按第三节有序列表读出，顺序即正文', () => {
  assert.deepStrictEqual(recordParts(), EXPECTED_RECORD);
  assert.deepStrictEqual(orderedBold(sectionAt(readDoc(), 2).body), EXPECTED_RECORD);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('修改留痕'), '未写修改留痕');
  assert.ok(body.includes('辨证的链条') || body.includes('辨证的链条'), '未写辨证链条');
});

test('知情同意表列到中药注射剂，患者预期与风险成对', () => {
  const s = informedScenes();
  assert.strictEqual(s.length, 5, `场景数 ${s.length}`);
  assert.ok(s[0].scene.includes('针刺'), s[0].scene);
  assert.ok(s[3].expect.includes('中药没有副作用'), s[3].expect);
  assert.ok(s[4].scene.includes('中药注射剂'), s[4].scene);
  assert.ok(sectionAt(readDoc(), 3).body.includes('预期偏差'), '未写预期偏差');
});

test('三个抓手按第五节粗体读出，去掉「抓手一」前缀', () => {
  assert.deepStrictEqual(threeHandles(), EXPECTED_HANDLES);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('处方点评') || body.includes('不良事件'), '抓手内容缺失');
});

test('责任链是过错看过程、因果看专业、赔偿看损害，不许互相替代', () => {
  assert.deepStrictEqual(responsibilityChain(), EXPECTED_CHAIN);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('不能互相替代'), '未写三者不可替代');
  assert.ok(body.includes('有病历瑕疵不等于有过错'), '未写反向排除');
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

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗意见/);
});

test('本章的边界写进了正文：不引条号、表为风险提示、不构诊疗意见', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与规范全称', '不是穷举', '不构成医学意见']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
  assert.ok(occurrences(text, '与水平相应') > 0, '缺「与水平相应」的注意标准');
  assert.ok(boldItems(sectionAt(text, 4).body).filter((x) => x.startsWith('抓手')).length === 3, '抓手数变了');
});
