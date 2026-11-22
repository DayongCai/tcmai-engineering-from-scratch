'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, tables, concepts, attributionTable, kelly, weiner, compression, replaceTest } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-p5', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '绩效评价评的从来不是绩效，是主管对绩效的记忆与解释');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('五种知觉偏差与四条对冲机制逐条命中正文', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.biases, ['首因效应', '近因效应', '晕轮效应', '刻板印象', '对比效应']);
  assert.deepStrictEqual(c.counters, ['结构化', '多源', '盲评与去身份化', '问责与留痕']);
  assert.strictEqual(c.hasFairness, true);
  assert.strictEqual(c.hasSelfServing, true);
});

test('归因表解析出三行，其中只有一行指向情境', () => {
  const rows = attributionTable(TEXT);
  assert.strictEqual(rows.length, 3);
  assert.match(rows[2].cause, /外部、不可控/);
  assert.match(rows[2].action, /减责、补资源/);
  assert.match(rows[2].consequence, /最常被忽略/);
  assert.strictEqual(rows.filter((r) => r.cause.includes('外部')).length, 1);
  assert.strictEqual(tables(TEXT).length, 1);
});

test('凯利三信息：仅他如此且在别处也如此 → 内部归因', () => {
  const k = kelly({ othersSame: false, elsewhereSame: true, onlyHere: false });
  assert.strictEqual(k.locus, '内部归因');
  assert.strictEqual(kelly({ othersSame: true, elsewhereSame: true, onlyHere: false }).locus, '外部归因');
  assert.strictEqual(kelly({ othersSame: false, elsewhereSame: false, onlyHere: false }).locus, '外部归因');
  assert.match(kelly({ othersSame: true, elsewhereSame: true, onlyHere: true }).hesitancy, /先查情境/);
});

test('韦纳三维对应三种情绪与动作', () => {
  assert.deepStrictEqual(weiner({ internal: true, stable: false, controllable: true }), {
    kind: '不努力', emotion: '愤怒', action: '批评、加压、扣绩效',
  });
  assert.strictEqual(weiner({ internal: true, stable: true, controllable: false }).action, '培训、调岗');
  assert.strictEqual(weiner({ internal: false, stable: true, controllable: false }).action, '减责、补资源');
  assert.strictEqual(weiner({ internal: false, stable: false, controllable: true }).kind, '未定');
});

test('压缩损失：250 个工作日 / 25 格 = 每格 10 天、占 4%', () => {
  const z = compression();
  assert.strictEqual(z.cells, 25);
  assert.strictEqual(z.daysPerCell, 10);
  assert.strictEqual(z.share, 4);
  assert.strictEqual(compression(4, 5, 250).cells, 20);
});

test('纠偏问句：结果一样 → 情景，不一样 → 人', () => {
  assert.strictEqual(replaceTest(true).locus, '情境');
  assert.strictEqual(replaceTest(false).locus, '人');
  assert.match(replaceTest(true).next, /岗位设计/);
});

test('脚本可运行，输出归因表与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /每格代表 10 天/);
  assert.match(out, /3 行里只有 1 行指向情境/);
  assert.match(out, /偏差只能被约束，不能被消除/);
});
