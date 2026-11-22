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
  sectionAt,
  fourForms,
  threePassages,
  threeHardLines,
  dialecticRules,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FORMS,
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

test('小节结构：六个二级标题，一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles.every((t, i) => t.startsWith('一二三四五六'[i] + '、')), titles.join(' | '));
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('四种形制从表格现读，各有一句禁忌', () => {
  const fs4 = fourForms(readDoc());
  assert.strictEqual(fs4.length, 4, `形制数 ${fs4.length}`);
  assert.deepStrictEqual(fs4.map((x) => x.form), FORMS);
  for (const f of fs4) {
    assert.ok(f.how.length >= 4, `${f.form} 缺做法`);
    assert.ok(f.avoid.length >= 4, `${f.form} 缺禁忌`);
  }
  assert.ok(fs4[1].avoid.includes('冲洗'), fs4[1].avoid);
});

test('出血初期禁热敷这一条写在表格与正文里，不只在代码注释里', () => {
  const row = fourForms(readDoc()).find((x) => x.form === '敷眼');
  assert.ok(row.avoid.includes('出血初期禁热敷'), row.avoid);
  assert.ok(sectionAt(readDoc(), 4).includes('出血初期必须冷敷'), '辨证节未重申');
});

test('三条风险通道从正文现算：黏膜吸收、污染、颗粒', () => {
  const ps = threePassages(readDoc());
  assert.strictEqual(ps.length, 3, ps.join(' / '));
  assert.deepStrictEqual(ps, ['黏膜吸收', '污染', '颗粒']);
});

test('三条用药硬线从正文现算，逐条落在「不」字判断上', () => {
  const hl = threeHardLines(readDoc());
  assert.strictEqual(hl.length, 3, hl.join(' / '));
  assert.ok(hl[0].includes('不让患者自配点眼药'), hl[0]);
  assert.ok(hl[1].includes('激素类眼药不长期自用'), hl[1]);
  assert.ok(hl[2].includes('有毒药材不入眼'), hl[2]);
});

test('外治也要辨证：三条分岔都在正文里，且都指向寒热虚实', () => {
  const d = dialecticRules(readDoc());
  assert.strictEqual(d.length, 3, d.join(' / '));
  const joined = d.join(' ');
  for (const k of ['热证不宜温敷', '翳之新老决定手法轻重']) assert.ok(joined.includes(k), `缺「${k}」`);
  assert.ok(sectionAt(readDoc(), 4).includes('所异者法耳'), '未引《理瀹骈文》');
});

test('眶内穴位的边界写在正文：不捻转、不提插、不深刺', () => {
  const seg = sectionAt(readDoc(), 2);
  for (const k of ['不捻转', '不提插', '不深刺', '按压']) assert.ok(seg.includes(k), `缺「${k}」`);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成处方或操作指导/);
  assert.match(out, /由本章正文现算/);
});

test('表格只有一张（四种形制），四列四行', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].head.length, 4);
  assert.strictEqual(blocks[0].rows.length, 4);
});
