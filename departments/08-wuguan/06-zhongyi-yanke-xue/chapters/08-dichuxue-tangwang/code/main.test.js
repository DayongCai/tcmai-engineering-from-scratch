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
  threeOrigins,
  stageRows,
  fourLines,
  twoRules,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  STAGES,
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

test('三条来路从正文现算为三条，外伤不在其中（它不必辨证）', () => {
  const o = threeOrigins(readDoc());
  assert.strictEqual(o.length, 3, o.join(' / '));
  assert.deepStrictEqual(o, ['热迫血妄行', '气不摄血', '瘀阻络破']);
  assert.ok(sectionAt(readDoc(), 0).includes('外伤'), '外伤一条未提');
});

test('四段血的状态从表格现算：新血、瘀血、陈血、反复，各有一忌', () => {
  const st = stageRows(readDoc());
  assert.strictEqual(st.length, 4, `段数 ${st.length}`);
  assert.deepStrictEqual(st.map((x) => x.stage), STAGES);
  for (const x of st) {
    assert.ok(x.look && x.rule && x.avoid, `${x.stage} 缺列`);
  }
  assert.ok(st[0].avoid.includes('破血'), st[0].avoid);
  assert.ok(st[1].avoid.includes('固涩'), st[1].avoid);
});

test('分期按「血的状态」而非天数，这一条写死在正文里', () => {
  const seg = sectionAt(readDoc(), 1);
  assert.ok(seg.includes('不是按天数划的'), '未否定按天分期');
  assert.ok(seg.includes('颜色、边界、变化趋势'), '未写三条判断依据');
});

test('消渴目病的四条临床线从正文现算为四条，本标判断在正文里', () => {
  const ls = fourLines(readDoc());
  assert.strictEqual(ls.length, 4, ls.map((x) => x.name).join(' / '));
  assert.deepStrictEqual(ls.map((x) => x.name), ['气阴两虚', '肝肾亏虚', '阴阳两虚', '痰瘀互结']);
  const seg = sectionAt(readDoc(), 2);
  assert.ok(seg.includes('本在气阴两虚'), '未写本');
  assert.ok(seg.includes('标在瘀血阻络'), '未写标');
});

test('治血两句老话从正文现算：止血不忘化瘀、化瘀不忘扶正', () => {
  const r = twoRules(readDoc());
  assert.strictEqual(r.length, 2, r.join(' / '));
  assert.deepStrictEqual(r, ['止血不忘化瘀', '化瘀不忘扶正']);
});

test('上游在血糖血压血脂：中医是配合不是替代，这条边界在正文', () => {
  const seg = sectionAt(readDoc(), 4);
  assert.ok(seg.includes('血糖、血压、血脂'), '未写上游');
  assert.ok(seg.includes('「配合」不等于「替代」'), '未写配合边界');
  assert.ok(seg.includes('血糖波动比血糖偏高更伤眼底'), '未写波动');
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
  assert.match(out, /不构成诊断或治疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('表格只有一张（血的状态），四列四行', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].head.length, 4);
  assert.strictEqual(blocks[0].rows.length, 4);
});
