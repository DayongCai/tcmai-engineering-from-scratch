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
  sixDiseases,
  acuteVsChronic,
  redFlags,
  legSources,
  closingMethods,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_DISEASES,
  EXPECTED_RED_FLAGS,
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

test('小节结构：八个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 8, `小节数 ${titles.length}`);
  assert.ok(titles[7].endsWith('代价与边界'), titles[7]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('六种常见腰痛按正文表序读出，压痛位置各不相同', () => {
  const d = sixDiseases();
  assert.deepStrictEqual(d.map((x) => x.name), EXPECTED_DISEASES);
  assert.strictEqual(new Set(d.map((x) => x.point)).size, 6, '有压痛位置重复');
});

test('只有小关节紊乱与腰突的手法位置涉及整复口径，横突综合征是只松不整', () => {
  const byName = Object.fromEntries(sixDiseases().map((x) => [x.name, x.role]));
  assert.ok(byName['第三腰椎横突综合征'].includes('不整复'), byName['第三腰椎横突综合征']);
  assert.ok(byName['腰肌劳损'].includes('不整复'), byName['腰肌劳损']);
});

test('急性与慢性的对比是五项，方向相反', () => {
  const c = acuteVsChronic();
  assert.strictEqual(c.length, 5, c.map((x) => x.item).join('/'));
  const timing = c.find((x) => x.item === '手法时机');
  assert.ok(timing.acute.includes('先制动'), timing.acute);
  assert.ok(timing.chronic.includes('随时'), timing.chronic);
});

test('腿痛的来源是四种，含血管源', () => {
  const l = legSources();
  assert.strictEqual(l.length, 4, l.join('/'));
  assert.ok(l.some((x) => x.includes('血管源')), l.join('/'));
});

test('四条红旗与正文表逐条一致', () => {
  assert.deepStrictEqual(redFlags().map((x) => x.flag), EXPECTED_RED_FLAGS);
});

test('收功不是可选项，内容是轻揉、掌摩、抚法与擦法', () => {
  const c = closingMethods();
  assert.strictEqual(c.length, 3, c.join('/'));
  assert.ok(c[0].includes('轻揉'), c[0]);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('省掉它的代价'), '未写省掉收功的代价');
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['即刻缓解', '只松不整', '间歇性跛行', '直腿抬高', '四字试验']) {
    assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
  }
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
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('边界写进正文：不写手法参数、即刻缓解是验证不是承诺、影像不回答该不该动手', () => {
  const text = readDoc();
  for (const k of ['本章不写手法参数', '是验证，不是承诺', '影像不回答', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 3, '表格数变了');
});
