'use strict';
/**
 * 第 2 章 单测（教材·第9章 解表药）
 * 断言里钉死期望值；程序里的数字全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  book, ch, drugs, CH_NO, sec, sub, para, drug, fold,
  shape, qi, wei, gui, dose, citation, resolve,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');
const ROSTER = ['麻黄', '桂枝', '紫苏叶', '生姜', '荆芥', '防风', '羌活', '白芷', '细辛', '藁本',
  '苍耳子', '辛夷', '薄荷', '牛蒡子', '蝉蜕', '桑叶', '菊花', '蔓荆子', '柴胡', '升麻', '葛根'];

test('规模：2 节 21 小节 63 段 3,965 字 = 全书 6.21%', () => {
  const s = shape();
  assert.strictEqual(CH_NO, '9');
  assert.strictEqual(book.counts.chars, 63865);
  assert.strictEqual(s.total, 3965);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.subs, 21);
  assert.strictEqual(s.paras, 63);
  assert.strictEqual(s.total, s.rows.reduce((n, r) => n + r.chars, 0));
  assert.ok(Math.abs(s.share - 3965 / 63865) < 1e-12);
  // drugs 层的逐药字数与教材章节字数对得齐（同一套数字，两条路径）
  assert.strictEqual(s.drugChars, s.total);
});

test('结构：9.1 十二味 2,234 字 / 9.2 九味 1,731 字，每味均字 188.8', () => {
  const s = shape();
  assert.deepStrictEqual(s.rows.map((r) => [r.no, r.drugs, r.paras, r.chars]), [
    ['9.1', 12, 36, 2234], ['9.2', 9, 27, 1731],
  ]);
  assert.deepStrictEqual(s.rows.map((r) => r.perDrug), [186.2, 192.3]);
  assert.strictEqual(s.perDrug, 188.8);
  assert.deepStrictEqual(drugs.map((d) => d.name), ROSTER);
  assert.deepStrictEqual(ch.secs.flatMap((x) => x.subs.map((u) => u.title)), ROSTER);
});

test('教材原文核对：麻黄三段各司其职，性味归经与用量逐字一致', () => {
  assert.ok(para('9.1.1', 0).includes('性温，味辛、微苦，归肺、膀胱经'));
  assert.ok(para('9.1.1', 1).startsWith('麻黄功效发汗解表、宣肺平喘、利水消肿'));
  assert.ok(para('9.1.1', 1).includes('风寒表实证（恶寒发热、无汗、脉浮紧，配桂枝）'));
  assert.ok(para('9.1.1', 2).includes('麻黄煎服2-10g'));
  assert.ok(para('9.1.1', 2).includes('表虚自汗、阴虚盗汗及肺肾虚喘者忌用'));
  // 三段结构：来源与性味归经 / 功效与主治 / 用法用量与使用注意
  const m = drug('麻黄');
  assert.deepStrictEqual(Object.keys(m.fields), ['来源与性味归经', '功效与主治', '用法用量与使用注意']);
  assert.deepStrictEqual(m.nature, { qi: '温', wei: ['辛', '微苦'], guijing: ['肺', '膀胱'], raw: m.fields['来源与性味归经'] });
});

test('本仓库口径说明：引用只写「教材·第9章·M.M」，可落到 9.1.1 级，docs 不用旧称', () => {
  assert.strictEqual(citation('9.1.1'), '教材·第9章·9.1.1');
  assert.strictEqual(resolve('9.1'), true);
  assert.strictEqual(resolve('9.2'), true);
  assert.strictEqual(resolve('9.1.10'), true);
  assert.strictEqual(resolve('9.1.13'), false);
  assert.strictEqual(resolve('9.3'), false);

  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const w of ['\u5e95\u672c', '\u539f\u6587']) assert.ok(!doc.includes(w), 'docs 不得把旧称当引用标签');
  const cites = [
    ...[...doc.matchAll(/《中药学·第(\d+)章·([\d.]+)》/g)].map((m) => [m[1], m[2]]),
    ...[...doc.matchAll(/教材·第(\d+)章·([\d.]+)/g)].map((m) => [m[1], m[2]]),
  ];
  assert.ok(cites.length >= 6, `docs 的教材级引用只有 ${cites.length} 条`);
  for (const [no, node] of cites) {
    assert.strictEqual(no, '9');
    assert.strictEqual(resolve(node), true, `引用 ${node} 落不到教材节点`);
  }
  assert.ok(doc.replace(/,/g, '').includes('3965'));
  const han = (doc.match(/[\u4e00-\u9fa5]/g) || []).length;
  assert.ok(han >= 1500, `docs 汉字数 ${han} < 1500`);
});

test('四气是分节判据：9.1 全温/微温、9.2 全凉/寒/微寒，错分 0', () => {
  const q = qi();
  assert.deepStrictEqual(q.dist, { 温: 9, 微温: 3, 凉: 2, 寒: 3, 微寒: 4 });
  assert.deepStrictEqual(q.bySec.map((r) => r.dist), [{ 温: 9, 微温: 3 }, { 凉: 2, 寒: 3, 微寒: 4 }]);
  assert.deepStrictEqual(q.wrong, []);
  assert.strictEqual(q.separated, true);
  // 两节的气集合不相交 → 21 味全部可判
  const a = Object.keys(q.bySec[0].dist);
  const b = Object.keys(q.bySec[1].dist);
  assert.deepStrictEqual(a.filter((x) => b.includes(x)), []);
  assert.strictEqual(q.dist['温'] + q.dist['微温'], 12);
  assert.strictEqual(q.dist['凉'] + q.dist['寒'] + q.dist['微寒'], 9);
});

test('五味不是分节判据：辛 19/21 横跨两节（12/12 与 7/9）', () => {
  const w = wei();
  assert.deepStrictEqual(w.dist, { 辛: 19, 微苦: 1, 甘: 6, 苦: 7 });
  assert.deepStrictEqual(w.bySec.map((r) => [r.xin, r.n, r.rate]), [[12, 12, 100], [7, 9, 77.8]]);
  assert.strictEqual(w.xin, 19);
  assert.strictEqual(w.xinRate, 90.5);
  assert.strictEqual(w.xinSpansBoth, true);
  assert.deepStrictEqual(w.noXin, ['蝉蜕(9.2)', '桑叶(9.2)']);
});

test('归经：肺 17/21 是共性，肝 8 味里 6 味落在 9.2', () => {
  const g = gui();
  assert.strictEqual(g.rows[0].jing, '肺');
  assert.strictEqual(g.rows[0].n, 17);
  assert.strictEqual(g.rows[0].rate, 81);
  assert.strictEqual(g.total, 50);
  const gan = g.rows.find((r) => r.jing === '肝');
  assert.strictEqual(gan.n, 8);
  assert.strictEqual(g.bySec[0].dist['肝'], 2);
  assert.strictEqual(g.bySec[1].dist['肝'], 6);
  assert.strictEqual(g.bySec[1].dist['肝'], gan.n - g.bySec[0].dist['肝']);
});

test('用法用量：21/21 抽出煎服区间；细辛 1-3g 最窄，葛根上限 15g 最高', () => {
  const d = dose();
  assert.strictEqual(d.withDose, 21);
  assert.deepStrictEqual([d.narrowest.name, d.narrowest.lo, d.narrowest.hi], ['细辛', 1, 3]);
  assert.deepStrictEqual([d.widest.name, d.widest.lo, d.widest.hi], ['麻黄', 2, 10]);
  assert.deepStrictEqual([d.highestHi.name, d.highestHi.hi], ['葛根', 15]);
  assert.strictEqual(d.tags['后下'], 1);
  assert.strictEqual(d.tags['包煎'], 1);
  assert.strictEqual(d.tags['冲服'], 1);
  assert.deepStrictEqual(d.tagged, ['辛夷:包煎', '薄荷:后下', '蝉蜕:冲服']);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const last = lines[lines.length - 1];
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成用药依据。'), last);
  assert.ok(/教材·第9章/.test(out));
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
  assert.ok(fold(para('9.1.1', 1)).includes(fold('麻黄功效发汗解表、宣肺平喘、利水消肿')));
});
