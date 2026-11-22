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
  fiveMethods,
  protocol,
  dimensionRatio,
  leaks,
  driftChapters,
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

test('两张表：五法表（5 行 × 4 列）与采集协议表（6 行 × 3 列）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [4, 3]);
  assert.deepStrictEqual(blocks[0].head, ['法', '原文要点', '可取的值（示例）', '测量性质'] .slice(0, 4), '五法表表头');
  assert.deepStrictEqual(blocks[1].head, ['项', '要求', '理由']);
  for (const b of blocks) for (const row of b.rows) assert.strictEqual(row.length, b.head.length);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('五法五个维度：形容、气色、苔垢、津液、部位', () => {
  const m = fiveMethods(readDoc());
  assert.strictEqual(m.count, 5);
  assert.deepStrictEqual(m.names, ['形容', '气色', '苔垢', '津液', '部位']);
  const gase = m.rows.find((r) => r.method === '气色');
  assert.ok(gase.gist.includes('赤为常'), '气色那行应点明赤为常色');
  const part = m.rows.find((r) => r.method === '部位');
  assert.ok(part.gist.includes('舌本在下'), '部位那行应给出舌本在下的坐标');
});

test('采集协议六项：进食、饮水、刷牙刮舌、光线、伸舌、姿态', () => {
  const p = protocol(readDoc());
  assert.deepStrictEqual(p.items, ['进食', '饮水', '刷牙刮舌', '光线', '伸舌', '姿态']);
  const t = readDoc();
  assert.ok(t.includes('诊而后食'), '缺原文「诊而后食」那条');
  assert.ok(t.includes('蜜拭苔垢'), '缺原文拭苔那条');
});

test('维度样本比：30 万像素 / 200 例 = 1500:1', () => {
  const d = dimensionRatio(readDoc());
  assert.deepStrictEqual(d.size, [640, 480]);
  assert.strictEqual(d.pixels, 300000);
  assert.strictEqual(d.rawPixels, 640 * 480);
  assert.ok(Math.abs(d.rawPixels - d.pixels) / d.rawPixels < 0.05, '正文的 30 万应是 307,200 的取整');
  assert.strictEqual(d.cases, 200);
  assert.strictEqual(d.computed, 1500);
  assert.strictEqual(d.claim, 1500);
});

test('泄漏四类，含最隐蔽的「标签由图像派生」', () => {
  const l = leaks(readDoc());
  assert.strictEqual(l.count, 4, l.named.join('；'));
  for (const x of ['同人同次连拍', '设备与批次成为捷径', '特征选择用了全数据', '标签由图像派生']) {
    assert.ok(l.named.includes(x), '缺 ' + x);
  }
  assert.ok(readDoc().includes('按人切分'), '缺按人切分的正确做法');
});

test('域偏移：古典五篇相参 + 现代清单，结论是跨中心下降是常态', () => {
  const d = driftChapters(readDoc());
  assert.strictEqual(d.length, 5, d.join('、'));
  assert.ok(readDoc().includes('跨中心性能下降是常态，不是意外'), '缺「常态不是意外」那句');
});

test('苔质分离的立场：分割是前置而不是后处理，苔质比作一级指标', () => {
  const t = readDoc();
  assert.ok(t.includes('分割是前置而不是后处理'), '缺「前置」的立场');
  assert.ok(t.includes('苔质比（苔覆盖面积／舌体面积）作为独立的一级指标'), '缺苔质比');
  assert.ok(sectionAt(t, 1).includes('循环'), '第 2 节应指出循环');
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

test('quiz 考的是正文的判断：切分、常色、循环、泄漏', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const all = q.questions.map((x) => String(x.options[x.correct]));
  assert.ok(all.some((s) => s.includes('切分')), '缺「数据切分」那道');
  assert.ok(all.some((s) => s.includes('心之正色')), '缺「常色是赤」那道');
  assert.ok(all.some((s) => s.includes('循环')), '缺「苔质循环」那道');
  assert.ok(all.some((s) => s.includes('标签由图像派生')), '缺「最隐蔽泄漏」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /1500:1/);
});
