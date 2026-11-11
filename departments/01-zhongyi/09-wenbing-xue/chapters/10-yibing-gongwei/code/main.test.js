'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { BOOK, SEGS, refOf, corpus, liqi, jiuChuan, membrane, dayuanYin, compare, JIU_CHUAN } = require('./main.js');

/** 「外源·笈成·溫疫論 上卷·原病·第1段」→ SEGS 里的一段；解析不出来即引用格式错 */
function resolve(ref) {
  const m = /^外源·笈成·溫疫論 ([^·]+)(?:·([^·]+))?·第(\d+)段$/.exec(ref);
  assert.ok(m, `引用格式不合：${ref}`);
  const [, juan, pian, no] = m;
  return SEGS.find((s) => s.juan === juan && (s.pian || null) === (pian || null) && s.no === Number(no));
}

test('语料规模：87 节（自敘 1 + 上卷 50 + 下卷 36）· 303 段 · 40,593 繁字 · 底本未解析方剂', () => {
  const c = corpus();
  assert.strictEqual(c.sections, 87);
  assert.strictEqual(c.pianTotal, 86);
  assert.deepStrictEqual(c.juan['自敘'], { pian: 1, segs: 2 });
  assert.deepStrictEqual(c.juan['上卷'], { pian: 50, segs: 158 });
  assert.deepStrictEqual(c.juan['下卷'], { pian: 36, segs: 143 });
  assert.strictEqual(c.segs, 303);
  assert.strictEqual(c.charsHant, 40593);
  assert.strictEqual(c.formulas, 0, '底本把方名/药味/煎法拆成独立段，formulas 为 0 是留档事实，不是缺漏');
  assert.strictEqual(SEGS.length, 303);
});

test('段号从 1 起连续、每段繁简两栏非空 —— 段号是本库编号，连续性必须自证', () => {
  for (const s of BOOK.sections) {
    const nos = s.articles.map((a) => a.no);
    assert.deepStrictEqual(nos, nos.map((_, i) => i + 1), `${s.juan}·${s.pian} 段号不连续`);
  }
  for (const x of SEGS) {
    assert.ok(x.hant && x.hant.length > 0, `${refOf(x)} 缺繁文`);
    assert.ok(x.hans && x.hans.length > 0, `${refOf(x)} 缺简文`);
  }
});

test('引用格式：自敘无篇名时省略篇，且每个引用都能解析回原文', () => {
  const zx = SEGS.find((s) => s.juan === '自敘' && s.no === 1);
  assert.strictEqual(refOf(zx), '外源·笈成·溫疫論 自敘·第1段');
  const yb = SEGS.find((s) => s.juan === '上卷' && s.pian === '原病' && s.no === 1);
  assert.strictEqual(refOf(yb), '外源·笈成·溫疫論 上卷·原病·第1段');
  for (const s of liqi().hits) assert.ok(resolve(s.ref), `解析不到：${s.ref}`);
  for (const r of membrane().refs) assert.ok(resolve(r), `解析不到：${r}`);
});

test('戾气不是原书术语：戾氣 4 段 / 癘氣 2 段 / 雜氣 3 段 / 異氣 2 段，去重 10 段', () => {
  const l = liqi();
  assert.deepStrictEqual(l.byTerm, { 戾氣: 4, 癘氣: 2, 雜氣: 3, 異氣: 2 });
  assert.strictEqual(l.hits.length, 11);
  assert.strictEqual(l.distinctSegs, 10, '雜氣論·第1段 同时命中 癘氣 与 雜氣');
  assert.ok(l.refs.includes('外源·笈成·溫疫論 上卷·原病·第1段'), '癘氣 的名段在原病');
  assert.ok(l.refs.includes('外源·笈成·溫疫論 自敘·第1段'), '「異氣」只在自敘与诸家正误里出现');
  assert.ok(!l.refs.includes('外源·笈成·溫疫論 上卷·原病·第2段'));
});

test('九传：原病列 9 项归并 9 类；下卷列 10 项、称「凡此九傳」，并掉表勝/里勝 才是 9', () => {
  const j = jiuChuan();
  assert.strictEqual(j.lists.length, 2);
  assert.strictEqual(j.lists[0].items.length, 9);
  assert.strictEqual(j.lists[0].distinct, 9);
  assert.strictEqual(j.lists[1].items.length, 10, '下卷枚举的是一十项');
  assert.strictEqual(j.lists[1].distinct, 9);
  assert.strictEqual(j.surplus, 1);
  assert.deepStrictEqual(j.collapsed, ['表勝於里', '里勝於表']);
  assert.deepStrictEqual(j.lists[1].items.map((i) => i.key).filter((k) => k === '表裡偏勝').length, 2);
  assert.strictEqual(j.types.length, 9);
  assert.strictEqual(new Set(j.types.map((t) => t.key)).size, 9);
  for (const d of j.declarations) assert.strictEqual(d.claimed, 9);
  // 每一传的治法出处在原文里必须真存在
  for (const t of j.types) assert.ok(resolve(`外源·笈成·溫疫論 ${t.ref}`), `治法出处解析不到：${t.ref}`);
  // 原病里的「有自汗而解者」不是传，必须被过滤掉
  assert.ok(!j.lists[0].items.some((i) => i.surface === '自汗而解'));
});

test('膜原：24 段占 7.9%、跨 18 篇；上卷 11 段 / 下卷 13 段；統論一篇占 6 段', () => {
  const m = membrane();
  assert.strictEqual(m.total, 24);
  assert.strictEqual(m.share, 0.079);
  assert.strictEqual(m.byPian.length, 18);
  assert.deepStrictEqual(m.byJuan, { 上卷: 11, 下卷: 13 });
  assert.deepStrictEqual(m.byPian[0], ['統論疫有九傳治法', 6]);
});

test('达原饮：7 味（拔邪 3 + 调和 4），煎法独立成段', () => {
  const d = dayuanYin();
  assert.strictEqual(d.name, '達原飲');
  assert.strictEqual(d.herbs.length, 7);
  assert.deepStrictEqual(d.primary, ['檳榔', '厚朴', '草果仁']);
  assert.deepStrictEqual(d.ancillary, ['知母', '芍藥', '黃芩', '甘草']);
  assert.deepStrictEqual(d.herbs[0], { herb: '檳榔', dose: '二錢' });
  assert.match(d.decoction, /^上用水二鍾/);
  assert.strictEqual(d.ref, '外源·笈成·溫疫論 上卷·溫疫初起·第2段');
});

test('分工对比：條辨 290 条里「疫」只 5 条、膜原与戾 0 条 —— 疫在條辨是名目，在溫疫論是对象', () => {
  const rows = compare();
  const get = (dim) => rows.find((r) => r.dim === dim);
  assert.strictEqual(get('「疫」字所在段/条').we, 95);
  assert.strictEqual(get('「疫」字所在段/条').tb, 5);
  assert.strictEqual(get('「膜原」所在段/条').we, 24);
  assert.strictEqual(get('「膜原」所在段/条').tb, 0);
  assert.strictEqual(get('「戾」字所在段/条').tb, 0);
  for (const r of rows) {
    assert.ok(r.basis === 'count' || r.basis === 'text');
    if (r.basis === 'count') assert.strictEqual(typeof r.we, 'number');
    if (r.basis === 'text') assert.strictEqual(typeof r.we, 'string', '定性行不得写成数字');
  }
  assert.strictEqual(rows.filter((r) => r.basis === 'count').length, 4);
});
