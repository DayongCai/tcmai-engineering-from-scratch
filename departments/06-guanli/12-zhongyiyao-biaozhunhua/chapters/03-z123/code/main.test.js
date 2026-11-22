'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  h2Titles,
  sectionAt,
  structures,
  segments,
  relationMappings,
  sampleSize,
  errorVolume,
  healthIndex,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_STRUCTURES,
  RELATIONS,
  SEGMENTS,
  METRICS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('二百一十六万'), 2160000);
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].includes('代价与边界'), titles[6]);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
  assert.strictEqual(SECTION_PROBES.length, h2Titles(readDoc()).length);
});

test('四种编码结构按正文表序读出，各有典型失效', () => {
  const rows = structures(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.name), EXPECTED_STRUCTURES);
  assert.ok(rows[0].failure.includes('乱序'), rows[0].failure);
  assert.ok(rows[1].failure.includes('扩位'), rows[1].failure);
  assert.ok(rows[2].failure.includes('轴序'), rows[2].failure);
});

test('饮片码四段齐：门类、品种、炮制、规格，炮制位独立', () => {
  const segs = segments(readDoc());
  assert.deepStrictEqual(segs.map((s) => s.s), SEGMENTS);
  for (const s of segs) assert.ok(s.line.length > 4, `${s.s} 没有对应行`);
  const text = readDoc();
  assert.ok(text.includes('炮制位独立成位'), '未写炮制位独立成位');
  assert.ok(text.includes('规格位放在最后'), '未写规格位在尾位');
});

test('五种映射关系都在第四节，处理方式互不相同', () => {
  const rel = relationMappings(readDoc());
  assert.deepStrictEqual(rel.map((r) => r.r), RELATIONS);
  for (const r of rel) assert.ok(r.ok, `缺关系：${r.r}`);
  const body = sectionAt(readDoc(), 3).body;
  assert.ok(body.includes('仅供检索，不可用于结算'), '缺部分重叠的处理');
  assert.ok(body.includes('必须显式留空'), '缺无对应的处理');
});

test('三个可核指标都在正文，且映射可审率写明了三个必备项', () => {
  const text = readDoc();
  for (const m of METRICS) assert.ok(occurrences(text, m) >= 1, `缺指标：${m}`);
  assert.ok(text.includes('关系类型、审核人、生效日期'), '缺映射可审率的三项');
  assert.ok(text.includes('剔除兜底类目'), '覆盖率未写剔除兜底类目');
});

test('演算一：216 万条明细、2% 差错、4.3 万条对不上', () => {
  const v = errorVolume(readDoc());
  assert.strictEqual(v.rx, 180000);
  assert.strictEqual(v.per, 12);
  assert.strictEqual(v.details, 2160000);
  assert.strictEqual(v.stated, 2160000, '正文自述的明细数与现算不符');
  assert.strictEqual(v.rate, 0.02);
  assert.strictEqual(v.bad, 43200);
});

test('演算二与三：抽样量 384 条，健康度 0.63（第一项取补数）', () => {
  assert.strictEqual(sampleSize(), 384);
  const h = healthIndex(readDoc());
  assert.ok(h, '正文里找不到三个指标的口径');
  assert.strictEqual(h.multi, 0.02);
  assert.strictEqual(h.cover, 0.92);
  assert.strictEqual(h.audit, 0.7);
  assert.strictEqual(h.rounded, '0.63');
});

test('quiz 结构：6 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 的 check 题至少两道能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个下标，且不含脚手架概念', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.includes('43,200'), '输出未给出对不上的条数');
  assert.ok(out.includes('≈ 384'), '输出未给出抽样量');
});
