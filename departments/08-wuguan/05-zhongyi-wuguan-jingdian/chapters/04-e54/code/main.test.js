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
  nameTable,
  patternGroups,
  fourSteps,
  forbidden,
  extraMeridians,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  NAME_ROWS,
  PATTERN_GROUPS,
  FOUR_STEPS,
  FORBIDDEN,
  EXTRA_MERIDIANS,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：六节，末节「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].endsWith('代价与边界'), titles[5]);
});

test('每节探针都落在本节', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('病名表：六组，四列，病位分别落在咽、喉核、喉核之外、喉、咽', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].rows.length, NAME_ROWS);
  assert.strictEqual(blocks[0].head[0], '病名');
  for (const r of blocks[0].rows) assert.strictEqual(r.length, 4, `列数不齐：${r.join('|')}`);
  assert.deepStrictEqual(nameTable(readDoc()).rows.map((r) => r.name), [
    '喉痹', '乳蛾', '喉痈', '喉风、急喉风', '喉喑', '梅核气',
  ]);
});

test('六组的判据都在形态与功能上：喉痹无脓点、乳蛾有脓点、喉风有三凹', () => {
  const rows = nameTable(readDoc()).rows;
  const by = Object.fromEntries(rows.map((r) => [r.name, r.criterion]));
  assert.ok(by['喉痹'].includes('无脓点'), by['喉痹']);
  assert.ok(by['乳蛾'].includes('黄白脓点'), by['乳蛾']);
  assert.ok(by['喉风、急喉风'].includes('三凹'), by['喉风、急喉风']);
  assert.ok(by['梅核气'].includes('进食无碍'), by['梅核气']);
});

test('五组方证：风寒、风热、肺胃热盛、阴虚、气与瘀', () => {
  assert.deepStrictEqual(patternGroups(readDoc()), PATTERN_GROUPS);
  assert.ok(sectionAt(readDoc(), 3).includes('某组判据用某方'));
});

test('斗底风四步：取痰→开风路针→吹冰硼散→紫地汤，一步不乱', () => {
  const steps = fourSteps(readDoc());
  assert.strictEqual(steps.length, FOUR_STEPS, `读到 ${steps.length} 步`);
  assert.match(steps[0], /取痰/);
  assert.match(steps[1], /开风路针/);
  assert.match(steps[2], /冰硼散/);
  assert.match(steps[3], /紫地汤/);
});

test('养阴清肺汤后切忌药味十三味，首麻黄、末荆芥', () => {
  const f = forbidden(readDoc());
  assert.strictEqual(f.length, FORBIDDEN.length, `读到 ${f.length} 味`);
  assert.deepStrictEqual(f, FORBIDDEN);
});

test('肺胃之外三条经络：肾、肝、心，各给一个入口', () => {
  const m = extraMeridians(readDoc());
  assert.deepStrictEqual(m.map((x) => x.name), EXTRA_MERIDIANS);
  for (const x of m) assert.ok(x.at >= 0, `第二节没有${x.name}`);
  const sec = sectionAt(readDoc(), 1);
  assert.ok(sec.includes('咽喉为肺胃之门户'));
  assert.ok(sec.includes('不是药力不够，是入口选错了'));
});

test('急症三条写在边界里：呼吸困难、单侧肿胀、张口困难', () => {
  const sec = sectionAt(readDoc(), 5);
  assert.ok(sec.includes('急症不辨证'));
  for (const k of ['呼吸困难', '单侧肿胀', '张口困难']) assert.ok(sec.includes(k), `边界缺「${k}」`);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章/.test(JSON.stringify(item)), `仍含旧口径：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文里对上四字原词', () => {
  assert.ok(analyze().quiz.grounded >= 2, `接地 ${analyze().quiz.grounded} 道`);
});

test('quiz 引文只到书名与篇名，不含页码；check 题至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.strictEqual(analyze().quiz.pageRefs, 0, 'quiz 里出现了页码');
  const rich = qs
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印边界声明与零剂量声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`));
  assert.match(out, /不构成医学意见/);
  assert.match(out, /不含剂量/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/04-e54/docs/zh.md'));
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
