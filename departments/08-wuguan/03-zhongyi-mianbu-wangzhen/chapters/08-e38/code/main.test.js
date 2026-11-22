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
  nominalGrid,
  segments,
  layers,
  kappaExample,
  template,
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

test('小节结构：七个二级标题，前六节按一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.strictEqual(titles[6], '代价与边界');
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三张表：四段表（4 行）、三层表（3 行）、记录模板（9 行）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 3);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [3, 4, 3]);
  assert.deepStrictEqual(blocks[1].head, ['层', '内容', '变更成本', '谁定']);
  assert.deepStrictEqual(blocks[2].head, ['字段', '取值', '必填']);
  for (const b of blocks) for (const row of b.rows) assert.strictEqual(row.length, b.head.length);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('名义格子：24 × 5 × 32 = 3840，乘法与正文一致', () => {
  const g = nominalGrid(readDoc());
  assert.deepStrictEqual([g.parts, g.colours, g.combos], [24, 5, 32]);
  assert.strictEqual(g.computed, 3840);
  assert.strictEqual(g.claimed, 3840);
  assert.ok(readDoc().includes('名义组合数'), '缺「名义组合数」的限定');
});

test('记录四段：部位、征象、程度、条件，后两段在「面色萎黄」里是空的', () => {
  const s = segments(readDoc());
  assert.deepStrictEqual(s.rows.map((r) => r.seg), ['部位', '征象', '程度', '条件']);
  assert.deepStrictEqual(s.filled, ['部位', '征象']);
  assert.deepStrictEqual(s.empty, ['程度', '条件']);
  assert.ok(s.rows.find((r) => r.seg === '部位').present.includes('未细分'), '部位那格应标未细分');
});

test('三层分离：名目层成本高、特征层中、判据层低', () => {
  const l = layers(readDoc());
  assert.deepStrictEqual(l.names, ['名目层', '特征层', '判据层']);
  assert.deepStrictEqual(l.rows.map((r) => r.cost), ['高（涉及学术传统）', '中（涉及工程实现）', '低（换个任务就换）']);
  assert.ok(readDoc().includes('不是用仪器重新发明一套名目'), '缺客观化的那句定义');
});

test('Kappa 那个例子可以重算：15/180 式的算术必须自洽', () => {
  const k = kappaExample(readDoc());
  assert.strictEqual(k.total, 100);
  assert.deepStrictEqual(k.distribution, [90, 10]);
  assert.deepStrictEqual(k.readings, [[88, 12], [87, 13]]);
  assert.strictEqual(k.agree, 85);
  assert.ok(Math.abs(k.po - 0.85) < 1e-9);
  assert.ok(Math.abs(k.pe - 0.78) < 0.005, `期望一致率 ${k.pe}`);
  assert.ok(Math.abs(k.kappa - 0.31) < 0.01, `重算 Kappa ${k.kappa}`);
  assert.strictEqual(k.claim.kappa, 0.31);
  assert.ok(k.readings[0].reduce((a, b) => a + b, 0) === k.total, '判读者 A 的两档之和应等于样本数');
});

test('Kappa 的两个坑与报告四项都写在正文', () => {
  const t = readDoc();
  assert.ok(t.includes('Kappa 的绝对值依赖类别分布'), '缺坑一');
  assert.ok(t.includes('Kappa 高不等于临床可用'), '缺坑二');
  assert.ok(t.includes('类别分布、原始一致率、Kappa（或 PABAK 等对偏斜稳健的指标）、以及判读说明的版本'), '缺报告四项');
  assert.ok(t.includes('矛盾时输出「待复核」，是把信息交回给人'), '缺「待复核」的处置原则');
});

test('记录模板九字段，八项必填、复核者视用途', () => {
  const tp = template(readDoc());
  assert.strictEqual(tp.count, 9);
  assert.strictEqual(tp.required, 8);
  const reviewer = tp.rows.find((r) => r.field === '复核者');
  assert.strictEqual(reviewer.required, false, '复核者那一行应是「视用途」');
  assert.ok(readDoc().includes('宁可少记，不可混记'), '缺最后那条原则');
});

test('伦理五条里最要紧的两条在正文：可识别性、器械属性', () => {
  const sec = sectionAt(readDoc(), 4);
  assert.ok(sec.includes('降低可识别性'), '缺「降低可识别性」');
  assert.ok(sec.includes('医疗器械'), '缺器械属性');
  assert.ok(sec.includes('数据最小化'), '缺数据最小化');
  assert.ok(sec.includes('群体公平'), '缺群体公平');
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

test('quiz 考的是正文的判断：四段、3840、Kappa 悖论、关系规则', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const all = q.questions.map((x) => String(x.options[x.correct]));
  assert.ok(all.some((s) => s.includes('程度与条件')), '缺「四段缺两段」那道');
  assert.ok(all.some((s) => s.includes('3840')), '缺「名义格子」那道');
  assert.ok(all.some((s) => s.includes('类别分布')), '缺「Kappa 悖论」那道');
  assert.ok(all.some((s) => s.includes('相生')), '缺「关系规则」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学、法律或合规意见/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /Kappa 0\.31/);
});
