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
  sectionAt,
  classRows,
  redLines,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 1600, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：六个二级标题，末节为「代价与边界」，前五节按一至五编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  for (let i = 0; i < 5; i += 1) {
    assert.match(titles[i], /^[一二三四五]、/, `第 ${i + 1} 节未按汉字序号起头：${titles[i]}`);
  }
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('只有一个探针清单，且长度等于前五节数', () => {
  assert.strictEqual(SECTION_PROBES.length, 5);
});

test('表格：一张，五行六列，列数对齐', () => {
  const blocks = tableBlocks(readDoc());
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  for (const b of blocks) {
    const widths = b.rows.map((r) => r.length);
    assert.ok(new Set(widths).size === 1, `表格列数不齐：${widths.join(',')}`);
    assert.strictEqual(widths[0], b.head.length, '数据行列数与表头不符');
  }
  assert.deepStrictEqual(blocks[0].head, ['类别', '起病', '受累模式', '晨僵', '中医归属', '首要动作']);
});

test('五类关节病取自表格首列：退行性、炎性、感染性、代谢晶体性、缺血性', () => {
  const names = classRows(readDoc()).names;
  assert.strictEqual(names.length, 5);
  for (const k of ['退行性', '炎性', '感染性', '代谢晶体性', '缺血性']) {
    assert.ok(names.some((n) => n.includes(k)), `缺类别「${k}」：${names.join('／')}`);
  }
});

test('三条红线：第五节里恰好三条，且各自带具体动作', () => {
  const red = redLines(readDoc());
  assert.strictEqual(red.length, 3);
  assert.ok(red[0].includes('抽液'), '第一条红线未写到抽液');
  assert.ok(red[1].includes('结核'), '第二条红线未写到结核排查');
  assert.ok(red[2].includes('拍片'), '第三条红线未写到拍片');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字、正确项打散到四个下标', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项未打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文找到四字原词，且至少两道带两个以上原词', () => {
  const r = analyze().quiz;
  assert.ok(r.grounded >= 2, `接地 ${r.grounded} 道`);
  assert.ok(r.rich >= 2, `带两个以上原词的 ${r.rich} 道`);
});

test('quiz 不考正文没有的名目：题干与解释里不出现步骤化的空话', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});

test('正文四条判断可查：退变是修复、疼痛来源、方向相反、红线优先', () => {
  const t = readDoc();
  for (const k of [
    '退变不是磨薄',
    '关节痛的来源是滑膜、关节囊、软骨下骨和肌肉',
    '鼓励在疼痛允许范围内活动',
    '分类工作暂停',
  ]) {
    assert.ok(t.includes(k), '缺：' + k);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
});

test('正文与 quiz 同目录：文件都存在且非空', () => {
  for (const p of [DOC, QUIZ]) {
    assert.ok(fs.existsSync(p), '缺文件：' + p);
    assert.ok(fs.statSync(p).size > 2000, '文件过小：' + p);
  }
  assert.ok(sectionAt(readDoc(), 3).includes('五种命运'), '第四节标题被改动');
});
