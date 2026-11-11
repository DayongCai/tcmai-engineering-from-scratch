'use strict';
/**
 * 第 1 章的每个数字都要能从底本.json 重算出来 —— 测试就是「docs 里的数与代码里的数同源」这条契约的执行器。
 * 断言写死具体值，是有意的：数据一改（重新抓取、重新分条），测试必须失败，
 * 迫使写的人回头改 docs，而不是让文档悄悄过期。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  books,
  totals,
  shangjiaoProfile,
  jiuZhong,
  boundary,
  sourceTrace,
  shouTiao,
  critics,
  noCollision,
  yuanbing,
  shangjiaoHead,
  article,
} = require('./main.js');

test('三书规模：3 书 · 108 节 · 630 条（段）· 243 方', () => {
  const t = totals();
  assert.strictEqual(t.books, 3);
  assert.strictEqual(t.sections, 108);
  assert.strictEqual(t.articles, 630);
  assert.strictEqual(t.formulas, 243);
  // 分书：條辨 20 节/290 条/243 方 · 溫熱論 1/37/0 · 溫疫論 87/303/0
  const byTitle = Object.fromEntries(books().map((b) => [b.title, b]));
  assert.deepStrictEqual(
    [byTitle['温病条辨'].sections, byTitle['温病条辨'].articles, byTitle['温病条辨'].formulas],
    [20, 290, 243]
  );
  assert.deepStrictEqual([byTitle['温热论'].sections, byTitle['温热论'].articles], [1, 37]);
  assert.deepStrictEqual([byTitle['温疫论'].sections, byTitle['温疫论'].articles], [87, 303]);
  // 243 方全在條辨，另两书是纯论述
  assert.strictEqual(byTitle['温热论'].formulas + byTitle['温疫论'].formulas, 0);
});

test('原病篇 19 条 · 上焦篇 80 条 / 65 方', () => {
  const t = totals();
  assert.strictEqual(t.yuanbingTiao, 19);
  assert.strictEqual(t.shangjiaoTiao, 80);
  assert.strictEqual(t.shangjiaoFang, 65);
});

test('上焦篇 7 节，条号在卷一内连续（一–二一 / 二二–三四 …）', () => {
  const rows = shangjiaoProfile();
  assert.strictEqual(rows.length, 7);
  assert.deepStrictEqual(
    rows.map((r) => r.articles),
    [21, 13, 8, 7, 4, 5, 22]
  );
  assert.deepStrictEqual(
    rows.map((r) => r.formulas),
    [24, 12, 5, 8, 5, 5, 6]
  );
  assert.deepStrictEqual([rows[0].first, rows[0].last], ['一', '二一']);
  assert.deepStrictEqual([rows[1].first, rows[1].last], ['二二', '三四']);
  assert.strictEqual(rows[5].pian, '秋燥', '标题须转成简体再显示');
});

test('九种温病：名单从「上焦篇·一」原文切出，恰 9 种', () => {
  const j = jiuZhong();
  assert.strictEqual(j.count, 9);
  assert.deepStrictEqual(j.names, ['风温', '温热', '温疫', '温毒', '暑温', '湿温', '秋燥', '冬温', '温疟']);
  // 名单必须真的来自原文，而不是另一处抄来的常量
  const src = article(shangjiaoHead(), '一').zhHans;
  for (const n of j.names) assert.ok(src.includes(n), `「${n}」不在第一条原文里`);
});

test('九种在上焦篇的分布：7 节标题覆盖 9 种，多出「伏暑 / 寒湿 / 补秋燥胜气论」', () => {
  const j = jiuZhong();
  assert.strictEqual(j.sectionCount, 7);
  assert.strictEqual(j.covered, 9);
  // 首节一节担五种；濕温、寒濕 一节里只认「湿温」；補秋燥勝氣論 不得被子串误配成「秋燥」
  const first = j.headings.filter((h) => h.in.length && h.in[0] === '风温、温热、温疫、温毒、冬温');
  assert.strictEqual(first.length, 5);
  const qiuzao = j.headings.find((h) => h.name === '秋燥');
  assert.deepStrictEqual(qiuzao.in, ['秋燥']);
  assert.deepStrictEqual(j.extra, ['伏暑', '寒湿', '补秋燥胜气论']);
});

test('寒温边界：四条维度，两侧原文均定位到「上焦篇·二」自注', () => {
  const b = boundary();
  assert.strictEqual(b.rows.length, 4);
  const note = article(shangjiaoHead(), '二').notes.join('\n');
  assert.ok(note.includes(b.citations.coldIn), '寒侧引文不在条二自注里');
  assert.ok(note.includes(b.citations.warmIn), '温侧引文不在条二自注里');
  assert.ok(b.citations.coldIn.startsWith('伤寒由毛窍而入'));
  assert.ok(b.citations.warmIn.startsWith('温病由口鼻而入'));
  const dims = Object.fromEntries(b.rows.map((r) => [r.dim, r]));
  assert.strictEqual(dims['入口'].cold, '毛窍');
  assert.strictEqual(dims['入口'].warm, '口鼻');
  assert.strictEqual(dims['方向'].cold, '自下而上');
  assert.strictEqual(dims['方向'].warm, '自上而下');
  assert.ok(dims['首犯'].cold.includes('足太阳'));
  assert.ok(dims['首犯'].warm.includes('手太阴'));
});

test('原病篇引《内经》：19 条中 14 条明标篇名，5 条承上，13 个不同篇名', () => {
  const s = sourceTrace();
  assert.strictEqual(s.total, 19);
  assert.strictEqual(s.explicit, 14);
  assert.strictEqual(s.continuation, 5);
  assert.strictEqual(s.distinct, 13);
  assert.deepStrictEqual(s.repeated, ['热论篇×2']);
  assert.ok(s.named.includes('六元正纪大论'));
  assert.ok(s.named.includes('金匮真言论'));
  // 第十至十五条同属刺热篇：十一条至十五条本身没有篇名
  const gov = Object.fromEntries(s.rows.map((r) => [r.no, r.governed]));
  for (const no of ['十一', '十二', '十三', '十四', '十五']) assert.strictEqual(gov[no], '刺热篇');
  assert.strictEqual(gov['十六'], '热论篇', '第十六条另起《热论篇》');
});

test('上焦篇首四条：条一给名单、条二定位、条三脉证、条四两方', () => {
  const rows = shouTiao();
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows.map((r) => r.no), ['一', '二', '三', '四']);
  assert.ok(rows[0].text.startsWith('温病者：有风温'));
  assert.strictEqual(rows[1].text, '凡病温者，始于上焦，在手太隂。');
  assert.ok(rows[2].text.includes('脉不缓不紧而动数'));
  assert.ok(rows[3].text.includes('恶风寒者，桂枝汤主之'));
  assert.ok(rows[3].text.includes('但热不恶寒而渴者，辛凉平剂银翘散主之'));
  // 方按 formulas[].tiao 归属：条四名下恰两方，前三条无方
  assert.deepStrictEqual(rows[3].formulas, ['桂枝汤方', '辛凉平剂银翘散方']);
  assert.deepStrictEqual(rows[0].formulas, []);
  assert.deepStrictEqual([rows[0].notes, rows[1].notes, rows[2].notes], [3, 2, 1]);
});

test('条号在篇内不唯一：凡例 14 条 1 个号 · 补秋燥胜气论 22 条 8 个号', () => {
  const dup = noCollision();
  assert.strictEqual(dup.length, 2);
  const names = dup.map((d) => `${d.juan}·${d.pian}`);
  assert.ok(names.includes('凡例·'), names.join(' | '));
  const bq = dup.find((d) => d.pian === '补秋燥胜气论');
  assert.deepStrictEqual([bq.n, bq.distinct], [22, 8]);
});

test('「以伤寒法治温病」的批评对象出现频次（條辨自注）', () => {
  assert.deepStrictEqual(critics(), { 叔和: 8, 又可: 19, 嘉言: 5, 喻氏: 14, 景岳: 5 });
});

test('原病篇每条都有繁/简两栏，简体非空', () => {
  for (const a of yuanbing().articles) {
    assert.ok(a.zhHant && a.zhHant.length > 0, `第${a.no}条缺繁文`);
    assert.ok(a.zhHans && a.zhHans.length > 0, `第${a.no}条缺简文`);
  }
});
