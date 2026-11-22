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
  jingmingWords,
  systems,
  eyeFigures,
  threeQs,
  CHAPTER,
  SLUG,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：七个二级标题，末节为「代价与边界」，第 6 节讲急症', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.strictEqual(titles[6], '代价与边界');
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、|[一二三四五六]、/.test(t)), '前六节未按序号编号');
  assert.ok(titles[5].includes('急症'), '第 6 节应是急症那一节');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('表格：一张五列表（体系／切分依据／单元／边界／适合的算法）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks[0].head, ['体系', '切分依据', '单元', '边界', '适合的算法']);
  for (const row of blocks[0].rows) assert.strictEqual(row.length, 5);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('「视精明」四个词：平正、分明、精爽、清莹', () => {
  const j = jingmingWords(readDoc());
  assert.strictEqual(j.words.length, 4, j.words.join('/'));
  for (const w of ['平正', '分明', '精爽', '清莹']) assert.ok(j.words.some((x) => x.includes(w)), '缺 ' + w);
});

test('五轮 5 个互斥区域、四纲 4 个观察维度，都从表格里读出来', () => {
  const s = systems(readDoc());
  assert.strictEqual(s.fiveLun.count, 5, s.fiveLun.items.join('、'));
  assert.deepStrictEqual(s.fiveLun.items, ['胞睑', '两眦', '白睛', '黑睛', '瞳神']);
  assert.strictEqual(s.fourGang.count, 4, s.fourGang.items.join('、'));
  assert.deepStrictEqual(s.fourGang.items, ['形象', '开阖', '目睑', '眼珠']);
  assert.ok(s.fiveLun.boundary.includes('清楚'), '五轮边界应为「清楚」');
  assert.ok(s.fourGang.boundary.includes('抽象'), '四纲边界应为「抽象」');
});

test('气色三量：明暗、清浊、浅深', () => {
  const t = readDoc();
  const three = threeQs(t);
  assert.strictEqual(three.count, 3);
  assert.ok(three.quote.includes('明则神气充足'), '三量那句引文不在了');
});

test('汪宏的否词原文在：名虽附于羲黄，实则乖夫体用', () => {
  const t = readDoc();
  assert.ok(t.includes('名虽附于羲黄，实则乖夫体用'), '缺汪宏否五轮的原话');
  assert.ok(t.includes('汪宏反对的是「把五轮当成辨证的全部」'), '缺本章的辨析');
  assert.ok(sectionAt(t, 1).includes('乖夫体用'), '这句不在第 2 节');
});

test('标签泄漏那条写清了两条现代体征：胆红素与血红蛋白', () => {
  const t = readDoc();
  assert.ok(t.includes('巩膜的黄，是胆红素'), '缺巩膜黄＝胆红素');
  assert.ok(t.includes('是血红蛋白'), '缺睑结膜淡＝血红蛋白');
  assert.ok(t.includes('模型学到的是胆红素，标签写的是脾'), '缺「学到胆红素、标签写脾」那句');
});

test('采集量级：虹膜 30–40 像素（按 35 计），ΔE 2 需 2 灰阶，手机 3–5 灰阶，瞳孔 6→2', () => {
  const f = eyeFigures(readDoc());
  assert.deepStrictEqual(f.irisRange, [30, 40]);
  assert.strictEqual(f.irisUsed, 35);
  assert.ok(f.irisUsed >= f.irisRange[0] && f.irisUsed <= f.irisRange[1], '取值不在区间内');
  assert.strictEqual(f.deltaE, 2);
  assert.strictEqual(f.noiseBudget, 2);
  assert.strictEqual(f.lux, 300);
  assert.deepStrictEqual(f.phoneNoise, [3, 5]);
  assert.deepStrictEqual(f.pupil, [6, 2]);
  assert.ok(f.phoneNoise[0] > f.noiseBudget, '正文的自相矛盾：手机噪声居然没超预算');
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

test('答案位置打散：用到三个以上不同下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `只用到 ${new Set(idx).size} 个位置`);
});

test('quiz 的 check 题：道道能在正文里对上两个以上四字原词', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.check, 3);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length >= 2, `未接地：${h.question}`);
});

test('quiz 考的是正文的判断：名目二选一、四词分静态与时序、标签泄漏', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const right = q.questions.filter((x) => x.stage === 'check').map((x) => String(x.options[x.correct]));
  const all = q.questions.map((x) => String(x.options[x.correct]));
  assert.ok(all.some((s) => s.includes('共同的分母')), '缺「标注先定名目」那道');
  assert.ok(right.some((s) => s.includes('黑白对比') && s.includes('时序')), '缺「四词分静态与时序」那道');
  assert.ok(right.some((s) => s.includes('胆红素')), '缺「标签泄漏」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /五轮 5 个互斥区域/);
});
