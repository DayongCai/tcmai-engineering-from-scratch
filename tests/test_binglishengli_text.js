/**
 * tests/test_binglishengli_text.js —— 病理生理学（代用底本《疾病学基础》）「底本层」门
 *
 * 核的是「工作簿 → 底本 / 单元层 / 三轴」这一段是否忠实：
 *   1. 母本指纹（字节数 + sha256）与表数
 *   2. 章 / 节 / 小节 / 汉字 四级计数，且逐章求和等于总数
 *   3. 单元层字段齐全、locator 格式、学习目标条数
 *   4. 数值口径：valueLike = 0（数字全是列表序号与编号），「正常值」类词绝大多数在否定语境
 *   5. 三视角 / 四层级：3×4 矩阵合计 = 单元数，主标签分布与 README 一致
 *   6. 每个单元的口径句都写着「不写数值与单位」
 *
 * 为什么要门：底本一旦被悄悄改动，下游 21 章全部失去依据，而「看着差不多」的底本
 * 最难自查。指纹 + 逐章求和 + 口径计数，三者交叉，改一个字就会掉一项。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SRC = 'E:/textbooks/qhzy-疾病学基础.xlsx';
const BASE = path.join(ROOT, 'standards', 'binglishengli', '底本.json');
const UNITS = path.join(ROOT, 'standards', 'binglishengli', 'units.json');
const TRIAXIS = path.join(ROOT, 'standards', 'binglishengli', 'triaxis.json');
const README = path.join(ROOT, 'standards', 'binglishengli', 'README.md');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const unitsDoc = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const tri = () => JSON.parse(fs.readFileSync(TRIAXIS, 'utf8'));
const nonWs = (s) => s.replace(/\s/g, '').length;

test('1. 母本指纹与表数', () => {
  const b = base();
  if (fs.existsSync(SRC)) {
    const buf = fs.readFileSync(SRC);
    assert.strictEqual(buf.length, b.source.bytes, '母本字节数与底本记录不一致');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.strictEqual(sha, b.source.sha256, '母本 sha256 与底本记录不一致');
  }
  assert.strictEqual(b.source.sheets, 34, '表数应为 34');
  assert.strictEqual(b.source.contentSheets, 18, '内容章应为 18');
  assert.strictEqual(b.source.platformSheets.length, 16, '前置+平台应为 16');
});

test('2. 四级计数与逐章求和', () => {
  const b = base();
  assert.strictEqual(b.counts.chapters, 18);
  assert.strictEqual(b.counts.secs, 72, '每章 4 节 × 18');
  assert.strictEqual(b.counts.subs, 216, '每章 12 小节 × 18');
  assert.strictEqual(b.counts.withBody, 216, '每个小节都必须有正文');
  const sum = (k) => b.chapters.reduce((n, c) => n + c.counts[k], 0);
  for (const k of ['secs', 'subs', 'withBody', 'hanzi']) {
    assert.strictEqual(sum(k), b.counts[k], `${k} 逐章求和 ≠ 总数`);
  }
  for (const c of b.chapters) {
    assert.strictEqual(c.counts.secs, 4, `第${c.no}章节数 ${c.counts.secs} ≠ 4`);
    assert.strictEqual(c.counts.subs, 12, `第${c.no}章小节数 ${c.counts.subs} ≠ 12`);
    assert.ok(c.counts.hanzi > 15000, `第${c.no}章汉字 ${c.counts.hanzi} 偏少`);
  }
});

test('3. 单元层字段与 locator', () => {
  const u = unitsDoc();
  assert.strictEqual(u.units.length, 216);
  assert.strictEqual(u.chapters.length, 18);
  let goals = 0;
  for (const x of u.units) {
    for (const k of ['chapter', 'chapterTitle', 'sec', 'sub', 'title', 'locator', 'brief', 'rawBody', 'body', 'prose', 'measure', 'tri']) {
      assert.ok(x[k] !== undefined, `${x.sub} 缺字段 ${k}`);
    }
    assert.strictEqual(x.locator, `教材·第${x.chapter}章·${x.sub}`, `${x.sub} locator 格式错`);
    assert.ok(x.rawBody && nonWs(x.rawBody) > 200, `${x.sub} 正文过短`);
    assert.strictEqual(x.body, x.rawBody, `${x.sub} 的 body 必须等于 rawBody（统计口径定死）`);
    goals += x.goals.length;
  }
  assert.strictEqual(u.counts.goalTotal, goals, '目标条数不一致');
  assert.strictEqual(goals, 126, '学习目标应为 126 条');
  assert.strictEqual(u.counts.withGoals, 18, '每章第 1 小节列学习目标');
});

test('4. 数值口径：valueLike = 0，正常值类词主要是否定语境', () => {
  const u = unitsDoc();
  assert.strictEqual(u.counts.valueLike, 0, '本书底本不应有「数字+计量单位」');
  assert.ok(u.counts.digits > 500, '数字字符应主要是列表序号');
  assert.ok(u.counts.listItems / u.counts.digits > 0.85,
    `列表序号占比 ${(u.counts.listItems / u.counts.digits).toFixed(2)}，与「数字都是序号」的判断不符`);
  assert.ok(u.counts.normalWords >= 30, '「正常值」类词应 ≥30 次（本底本比病理学少，36 次）');
  assert.ok(u.counts.normalNegated / u.counts.normalWords > 0.45,
    `否定语境占比 ${(u.counts.normalNegated / u.counts.normalWords).toFixed(2)} 偏低，说明有实体语境没核`);
});

test('5. 每单元口径句都声明不给值', () => {
  const u = unitsDoc();
  const bad = u.units.filter((x) => !/(只写类别与关系|不写数值与单位)/.test(x.brief));
  assert.deepStrictEqual(bad.map((x) => x.sub), [], '这些单元的口径句没有「只写类别与关系」或「不写数值与单位」');
});

test('6. 三视角 / 四层级：矩阵合计与主标签分布', () => {
  const t = tri();
  const crossSum = Object.values(t.cross).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  assert.strictEqual(crossSum + t.unlabelled.length, 216, `矩阵 ${crossSum} + 无标签 ${t.unlabelled.length} ≠ 216`);
  const vs = t.byPrimaryView;
  assert.strictEqual(vs['机能'].units, 58);
  assert.strictEqual(vs['机制'].units, 120);
  assert.strictEqual(vs['病因'].units, 9);
  const ls = t.byPrimaryLevel;
  assert.strictEqual(ls['系统'].units, 73);
  assert.strictEqual(ls['组织'].units, 51);
  assert.strictEqual(ls['细胞'].units, 34);
  assert.strictEqual(ls['器官'].units, 29);
  assert.strictEqual(t.unlabelled.length, 29, '四层级与三视角都无词的单元应有 29 个');
});
test('7. README 口径与底本一致', () => {
  const md = fs.readFileSync(README, 'utf8').replace(/\s/g, '');
  const b = base();
  for (const s of ['562,560B', b.source.sha256, '360,945', '18', '72', '216']) {
    assert.ok(md.replace(/,/g, '').includes(s.replace(/,/g, '')), `README 缺 ${s}`);
  }
  assert.ok(/valueLike=0/i.test(md), 'README 必须写明 valueLike = 0');
  assert.ok(/分支A/.test(md) && /分支B/.test(md), 'README 必须写清数值口径的两支');
});
