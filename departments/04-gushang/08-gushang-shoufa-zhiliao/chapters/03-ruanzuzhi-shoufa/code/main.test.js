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
  occurrences,
  grams,
  threeVars,
  faceRows,
  objectRows,
  fourSigns,
  fakeSigns,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_VARS,
  EXPECTED_OBJECTS,
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

test('小节结构：六个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].endsWith('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三个变量就是着力面、层次、时间', () => {
  assert.deepStrictEqual(threeVars(), EXPECTED_VARS);
});

test('着力面四档，压强由指腹到肘尖递增', () => {
  const rows = faceRows();
  assert.strictEqual(rows.length, 4, `表行 ${rows.length}`);
  assert.deepStrictEqual(rows.map((x) => x.face), ['指腹', '掌根、大鱼际', '手背尺侧', '肘尖']);
  assert.ok(rows[3].pressure.includes('最大'), rows[3].pressure);
});

test('三种对象是痉挛、粘连、挛缩，各自目标不同', () => {
  assert.deepStrictEqual(objectRows().map((x) => x.object), EXPECTED_OBJECTS);
  const goals = objectRows().map((x) => x.goal);
  assert.ok(goals[0].includes('等它松'), goals[0]);
  assert.ok(goals[1].includes('分层滑移'), goals[1]);
  assert.ok(goals[2].includes('争长度'), goals[2]);
});

test('算松的判据是四条，正文「其一」至「其四」现算', () => {
  const s = fourSigns();
  assert.strictEqual(s.length, 4, JSON.stringify(s));
  assert.deepStrictEqual(s.map((x) => x.n), ['一', '二', '三', '四']);
  assert.ok(s[0].sign.includes('由硬变软'), s[0].sign);
  assert.ok(s[3].sign.includes('被动活动度'), s[3].sign);
});

test('假松信号是三个，不是两个四个', () => {
  assert.strictEqual(fakeSigns(), 3);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['以柔克刚', '分层滑移', '吸定', '介质', '肿痛未除']) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('边界写进正文：不给参数、三种对象是临床分类、不含整复', () => {
  const text = readDoc();
  for (const k of ['不给参数', '不是病理分期', '本章不含整复', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
