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
  fourNorms,
  fourConstrained,
  threeQuants,
  reactionTiers,
  fourScopes,
  beyondParams,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_NORMS,
  EXPECTED_QUANTS,
  SECTION_PROBES,
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

test('小节结构：七个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].endsWith('代价与边界'), titles[6]);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('四条规范按正文表序读出，是持久有力均匀柔和', () => {
  assert.deepStrictEqual(fourNorms(), EXPECTED_NORMS);
});

test('每条规范各自约束一个量，共四个，不是并列的美德', () => {
  const c = fourConstrained();
  assert.strictEqual(c.length, 4, c.join('/'));
  assert.ok(c[0].includes('时间'), c[0]);
  assert.ok(c[1].includes('压强'), c[1]);
  assert.ok(c[2].includes('离散度'), c[2]);
  assert.ok(c[3].includes('变化率'), c[3]);
});

test('力学三要素是大小、方向、作用点，比四条规范少一格', () => {
  assert.deepStrictEqual(threeQuants(), EXPECTED_QUANTS);
  assert.strictEqual(fourNorms().length - threeQuants().length, 1);
});

test('四对三多出来的那一格，正文写作第四格是时间', () => {
  const s = sectionAt(readDoc(), 1).body;
  assert.ok(s.includes('第四格是时间'), '第二节未写第四格');
  assert.ok(s.includes('可以独立调'), '未写时间可独立调');
});

test('患者反应分四档，档序与正文一致', () => {
  assert.deepStrictEqual(reactionTiers(), ['一', '二', '三', '四']);
});

test('适应证四类齐备', () => {
  const s = fourScopes();
  assert.strictEqual(s.length, 4, s.join('/'));
  assert.ok(s[0].includes('骨折'), s[0]);
  assert.ok(s[1].includes('筋伤'), s[1]);
  assert.ok(s[2].includes('关节僵硬'), s[2]);
  assert.ok(s[3].includes('慢性劳损'), s[3]);
});

test('参数之外剩下的东西是六样，不是三样五样', () => {
  const items = beyondParams();
  assert.strictEqual(items.length, 6, items.join('/'));
  assert.ok(items.some((x) => x.includes('反馈闭环')), items.join('/'));
  assert.ok(items.some((x) => x.includes('停机')), items.join('/'));
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of ['持久', '刺激量', '得气', '先排危险', '主动加荷']) {
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
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
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

test('本章的边界写进了正文：不给参数、量化只到四个用途', () => {
  const text = readDoc();
  for (const k of ['不给参数', '量化只到四个用途', '不替代专业判断']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
