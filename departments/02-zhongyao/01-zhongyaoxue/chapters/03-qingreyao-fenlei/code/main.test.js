'use strict';
/**
 * 第 3 章 单测（教材·第10章 清热药）
 * 断言里钉死期望值；程序里的数字全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  book, ch, drugs, CH_NO, sec, sub, para, drug, fold,
  shape, qi, wei, gui, dose, eff, citation, resolve,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');
const ROSTER = ['石膏', '知母', '芦根', '天花粉', '栀子', '夏枯草', '决明子', '黄芩', '黄连', '黄柏',
  '龙胆', '秦皮', '苦参', '金银花', '连翘', '蒲公英', '大青叶', '板蓝根', '青黛', '贯众', '鱼腥草',
  '射干', '白头翁', '马齿苋', '白花蛇舌草', '生地黄', '玄参', '牡丹皮', '赤芍', '紫草', '水牛角',
  '青蒿', '白薇', '地骨皮', '银柴胡', '胡黄连'];

test('规模：5 节 36 小节 108 段 6,193 字 = 全书 9.70%', () => {
  const s = shape();
  assert.strictEqual(CH_NO, '10');
  assert.strictEqual(book.counts.chars, 63865);
  assert.strictEqual(s.total, 6193);
  assert.strictEqual(s.secs, 5);
  assert.strictEqual(s.subs, 36);
  assert.strictEqual(s.paras, 108);
  assert.strictEqual(s.items, 108);
  assert.strictEqual(s.total, s.rows.reduce((n, r) => n + r.chars, 0));
  assert.ok(Math.abs(s.share - 6193 / 63865) < 1e-12);
  assert.strictEqual(s.drugChars, s.total);
});

test('结构：五节 7/6/12/6/5 味，1,264/1,140/1,946/1,040/803 字，每味均字 172', () => {
  const s = shape();
  assert.deepStrictEqual(s.rows.map((r) => [r.no, r.drugs, r.paras, r.chars]), [
    ['10.1', 7, 21, 1264],
    ['10.2', 6, 18, 1140],
    ['10.3', 12, 36, 1946],
    ['10.4', 6, 18, 1040],
    ['10.5', 5, 15, 803],
  ]);
  assert.deepStrictEqual(s.rows.map((r) => r.perDrug), [180.6, 190, 162.2, 173.3, 160.6]);
  assert.strictEqual(s.perDrug, 172);
  assert.deepStrictEqual(drugs.map((d) => d.name), ROSTER);
  assert.deepStrictEqual(ch.secs.flatMap((x) => x.subs.map((u) => u.title)), ROSTER);
});

test('教材原文核对：石膏「性大寒」、黄连归六经、青蒿「清透虚热」逐字一致', () => {
  const gy = para('10.1.1', 0);
  assert.ok(gy.startsWith('石膏为硫酸盐类矿物硬石膏族石膏，主含含水硫酸钙。'), gy.slice(0, 30));
  assert.ok(gy.includes('性大寒，味甘、辛，归肺、胃经'));
  assert.ok(para('10.1.1', 1).includes('石膏功效清热泻火、除烦止渴、敛疮生肌（煅）'));
  const hl = para('10.2.2', 0);
  assert.ok(hl.includes('性寒，味苦，归心、脾、胃、肝、胆、大肠经'));
  assert.ok(para('10.2.2', 1).includes('黄连功效清热燥湿、泻火解毒'));
  assert.ok(para('10.5.1', 1).includes('青蒿功效清透虚热、凉血除蒸、解暑、截疟'));
  // 逐药三段字段固定
  assert.deepStrictEqual(Object.keys(drug('青蒿').fields), ['来源与性味归经', '功效与主治', '用法用量与使用注意']);
});

test('本仓库口径说明：引用只写「教材·第10章·M.M」，可落到 10.5.1 级，docs 不用旧称', () => {
  assert.strictEqual(citation('10.5.1'), '教材·第10章·10.5.1');
  assert.strictEqual(resolve('10.1'), true);
  assert.strictEqual(resolve('10.3'), true);
  assert.strictEqual(resolve('10.3.12'), true);
  assert.strictEqual(resolve('10.3.13'), false);
  assert.strictEqual(resolve('10.6'), false);

  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const w of ['\u5e95\u672c', '\u539f\u6587']) assert.ok(!doc.includes(w), 'docs 不得把旧称当引用标签');
  const cites = [
    ...[...doc.matchAll(/《中药学·第(\d+)章·([\d.]+)》/g)].map((m) => [m[1], m[2]]),
    ...[...doc.matchAll(/教材·第(\d+)章·([\d.]+)/g)].map((m) => [m[1], m[2]]),
  ];
  assert.ok(cites.length >= 6, `docs 的教材级引用只有 ${cites.length} 条`);
  for (const [no, node] of cites) {
    assert.strictEqual(no, '10');
    assert.strictEqual(resolve(node), true, `引用 ${node} 落不到教材节点`);
  }
  assert.ok(doc.replace(/,/g, '').includes('6193'));
  const han = (doc.match(/[\u4e00-\u9fa5]/g) || []).length;
  assert.ok(han >= 1500, `docs 汉字数 ${han} < 1500`);
});

test('四气零区分力：36/36 全在寒侧，只有 3 档，唯一大寒是石膏', () => {
  const q = qi();
  assert.deepStrictEqual(q.dist, { 大寒: 1, 寒: 26, 微寒: 9 });
  assert.deepStrictEqual(q.bySec.map((r) => r.dist), [
    { 大寒: 1, 寒: 4, 微寒: 2 },
    { 寒: 6 },
    { 寒: 9, 微寒: 3 },
    { 寒: 3, 微寒: 3 },
    { 寒: 4, 微寒: 1 },
  ]);
  assert.deepStrictEqual(q.offSide, []);
  assert.strictEqual(q.allCold, true);
  assert.deepStrictEqual(q.coldest, ['石膏']);
  assert.strictEqual(q.gradations, 3);
  // 每节至少有一档「寒」，所以四气在任意两节之间都不构成判据
  assert.ok(q.bySec.every((r) => r.dist['寒'] > 0));
});

test('五味：苦（含微苦）27/36 = 75%，只有清热燥湿一节 6/6 全苦', () => {
  const w = wei();
  assert.deepStrictEqual(w.dist, { 苦: 25, 微苦: 2, 甘: 13, 辛: 5, 咸: 5, 酸: 1, 涩: 1 });
  assert.strictEqual(w.bitter, 27);
  assert.strictEqual(w.bitterRate, 75);
  assert.deepStrictEqual(w.bySec.map((r) => [r.bitter, r.n, r.rate]), [
    [5, 7, 71.4], [6, 6, 100], [8, 12, 66.7], [5, 6, 83.3], [3, 5, 60],
  ]);
  assert.deepStrictEqual(w.fullBitter, ['10.2']);
  // 甘在清热泻火一节与苦几乎持平 → 苦不是泻火药的标记
  assert.strictEqual(w.bySec[0].dist['甘'], 5);
  assert.strictEqual(w.bySec[0].dist['苦'], 4);
});

test('归经：肝 20/36 居首，但清热燥湿一节的大肠 5/6 才是部位指纹', () => {
  const g = gui();
  assert.deepStrictEqual(g.rows.slice(0, 5).map((r) => [r.jing, r.n]), [['肝', 20], ['胃', 17], ['肺', 13], ['心', 12], ['大肠', 10]]);
  assert.strictEqual(g.rows[0].rate, 55.6);
  assert.strictEqual(g.total, 93);
  assert.strictEqual(g.rows.reduce((n, r) => n + r.n, 0), g.total);
  assert.strictEqual(g.bySec[1].dist['大肠'], 5);
  assert.strictEqual(g.bySec[1].dist['胆'], 4);
  assert.deepStrictEqual(g.bySec[3].top[0], ['肝', 5]);
});

test('节名 = 功效首词：34/36 命中，例外只有决明子与白薇', () => {
  const e = eff();
  assert.deepStrictEqual(e.rows.map((r) => [r.no, r.key, r.hit, r.n]), [
    ['10.1', '泻火', 6, 7],
    ['10.2', '燥湿', 6, 6],
    ['10.3', '解毒', 12, 12],
    ['10.4', '凉血', 6, 6],
    ['10.5', '虚热', 4, 5],
  ]);
  assert.strictEqual(e.totalHit, 34);
  assert.strictEqual(e.totalMiss, 2);
  assert.strictEqual(e.rate, 94.4);
  assert.deepStrictEqual(e.rows.flatMap((r) => r.miss), ['决明子', '白薇']);
  assert.strictEqual(e.top[0][0], '清热解毒');
  assert.strictEqual(e.top[0][1], 12);
});

test('用法用量：36/36 抽出区间；青黛 1.5-3g 最窄，石膏 15-60g 最宽', () => {
  const d = dose();
  assert.strictEqual(d.withDose, 36);
  assert.deepStrictEqual([d.narrowest.name, d.narrowest.lo, d.narrowest.hi], ['青黛', 1.5, 3]);
  assert.deepStrictEqual([d.widest.name, d.widest.lo, d.widest.hi], ['石膏', 15, 60]);
  assert.deepStrictEqual([d.lowest.name, d.lowest.lo], ['青黛', 1.5]);
  assert.deepStrictEqual(d.highest, ['石膏', '白花蛇舌草']);
  assert.strictEqual(d.maxHi, 60);
  assert.strictEqual(d.tags['先煎'], 2);
  assert.strictEqual(d.tags['冲服'], 1);
  assert.deepStrictEqual(d.tagged, ['石膏:先煎', '水牛角:先煎/冲服']);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const last = lines[lines.length - 1];
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成用药依据。'), last);
  assert.ok(/教材·第10章/.test(out));
});

test('quiz 契约：6 题 pre/check×3/post×2', () => {
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = q.questions || q;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  for (const x of qs) {
    assert.strictEqual(x.options.length, 4);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3);
    assert.ok((x.explanation || '').length >= 10);
  }
  assert.ok(fold(para('10.2.2', 1)).includes(fold('黄连功效清热燥湿、泻火解毒')));
});
