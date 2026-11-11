'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  PIAN, YIN, CRITERIA, CONTINUE, NAMED_ONLY,
  siYin, tiaoShape, yinSummary, fangOfYin, warmRule, herbFreq, totals, unjudgedGroups,
} = require('./main.js');

test('第 12 篇规模：41 条 · 18 方（有方文）· 方条比 0.44', () => {
  const t = totals();
  assert.strictEqual(t.tiao, 41);
  assert.strictEqual(t.fang, 18);
  assert.strictEqual(t.per, 0.44, '18/41 ≈ 0.44，与第 1 章的篇级表一致');
  assert.strictEqual(t.fangTiao, 16, '16 条带方文（12.23、12.24 各出两方）');
  assert.strictEqual(t.namedOnly, 6, '6 条只提名、无方文');
  assert.strictEqual(t.withFang, 22, '涉方 16 + 6 = 22（v2 起 12.23 两方都有方文，不再两属）');
  assert.strictEqual(t.tiao - t.withFang, 19, '19 条全无方');
  assert.strictEqual(t.chars, 2292, '本篇 2,292 字（底本 chars 字段）');
});

test('并列方已按 v2 拆出：12.23 大青龙汤／小青龙汤、12.24 木防己汤／去石膏加茯苓芒硝汤', () => {
  const rows = tiaoShape();
  const at = (t) => rows.find((r) => r.tiao === t);
  assert.deepStrictEqual(at('12.23').fang, ['大青龙汤', '小青龙汤'],
    'v1 只读 h-formula 块首方，小青龙汤被吞掉');
  assert.deepStrictEqual(at('12.24').fang, ['木防己汤', '木防己去石膏加茯苓芒硝汤'],
    'v1 只读 h-formula 块首方，木防己去石膏加茯苓芒硝汤被吞掉');
  for (const t of ['12.23', '12.24']) {
    assert.deepStrictEqual(at(t).named, [], `${t} 的两方都有方文，不该再算「只提名」`);
  }
});

test('四饮 + 总纲 + 未判，恰好摊满 41 条', () => {
  const s = yinSummary();
  assert.strictEqual(s['总纲'].tiao, 2);
  assert.strictEqual(s['痰饮'].tiao, 3);
  assert.strictEqual(s['悬饮'].tiao, 2);
  assert.strictEqual(s['溢饮'].tiao, 1);
  assert.strictEqual(s['支饮'].tiao, 14);
  assert.strictEqual(s['未判'].tiao, 19);
  const sum = Object.values(s).reduce((n, v) => n + v.tiao, 0);
  assert.strictEqual(sum, 41, '分类必须穷尽且不重，加总回 41');
  assert.deepStrictEqual(s['痰饮'].list, ['15', '16', '29']);
  assert.deepStrictEqual(s['悬饮'].list, ['21', '22']);
  assert.deepStrictEqual(s['溢饮'].list, ['23']);
});

test('18 方按饮归类：痰饮 2 · 悬饮 1 · 溢饮 2 · 支饮 10 · 未判 3', () => {
  const s = yinSummary();
  assert.strictEqual(s['痰饮'].fang, 2);
  assert.strictEqual(s['悬饮'].fang, 1);
  assert.strictEqual(s['溢饮'].fang, 2, '12.23 一条出两方');
  assert.strictEqual(s['支饮'].fang, 10, '12.24 一条出两方');
  assert.strictEqual(s['未判'].fang, 3);
  assert.strictEqual(Object.values(s).reduce((n, v) => n + v.fang, 0), 18);
  assert.strictEqual(fangOfYin().length, 18);
  const of = Object.fromEntries(fangOfYin().map((f) => [f.name, f.yin]));
  assert.strictEqual(of['小青龙汤'], '溢饮');
  assert.strictEqual(of['木防己去石膏加茯苓芒硝汤'], '支饮');
});

test('12.1 / 12.2 归「总纲」：四饮名全出现，归任何一个都是错', () => {
  const rows = siYin();
  const a = rows.filter((r) => r.by === '总纲').map((r) => r.tiao);
  assert.deepStrictEqual(a, ['12.1', '12.2']);
  for (const t of ['12.1', '12.2']) {
    const text = PIAN.articles.find((x) => x.tiao === t).zhHans;
    for (const y of YIN) assert.ok(text.includes(y), `${t} 应含「${y}」`);
  }
});

test('判据词只能从原文里来：12.2 定义句 + 12.29 的重述，逐字可查', () => {
  for (const y of YIN) {
    assert.ok(CRITERIA[y].length > 0, `${y} 缺判据词`);
    assert.ok(CRITERIA[y].some((c) => c.from === '12.2'), `${y} 必须以 12.2 定义词为主干`);
    for (const c of CRITERIA[y]) {
      const src = PIAN.articles.find((a) => a.tiao === c.from);
      assert.ok(src, `${y} 判据词「${c.w}」出处 ${c.from} 不存在`);
      assert.ok(src.zhHans.includes(c.w), `判据词「${c.w}」不在 ${c.from} 原文里 —— 不允许自造判据`);
    }
    // 非 12.2 的来源只许是「同篇重述」，本篇仅 12.29 一处
    const extra = CRITERIA[y].filter((c) => c.from !== '12.2').map((c) => `${c.from}:${c.w}`);
    assert.ok(extra.length <= 1, `${y} 的补充判据词过多：${extra.join('，')}`);
  }
});

test('显名优先于判据词：12.21「悬饮内痛」不会被「脉沉而弦」带走', () => {
  const rows = siYin();
  const r21 = rows.find((r) => r.tiao === '12.21');
  assert.strictEqual(r21.yin, '悬饮');
  assert.strictEqual(r21.by, '显名');
  const r15 = rows.find((r) => r.tiao === '12.15'); // 「病痰饮者，当以温药和之」
  assert.strictEqual(r15.yin, '痰饮', '治则条按显名胜出，但它是全篇唯一的治则条');
});

test('只有两条靠判据词归类：12.29（肠间有水气）与 12.35（咳逆倚息）', () => {
  const rows = siYin().filter((r) => r.by === '判据词');
  assert.deepStrictEqual(rows.map((r) => r.tiao), ['12.29', '12.35']);
  assert.strictEqual(rows[0].yin, '痰饮');
  assert.strictEqual(rows[1].yin, '支饮');
  assert.ok(rows[0].hit.includes('肠间有水气'));
  assert.ok(rows[1].hit.includes('咳逆倚息'));
});

test('承前 4 条：12.36–12.40 的方后加减链继承支饮，首句逐字可查', () => {
  const rows = siYin();
  const inh = rows.filter((r) => r.by === '承前');
  assert.deepStrictEqual(inh.map((r) => r.tiao), ['12.36', '12.37', '12.39', '12.40']);
  for (const r of inh) {
    assert.strictEqual(r.yin, '支饮');
    assert.ok(CONTINUE.includes(r.hit), `承接语「${r.hit}」须取自 CONTINUE 白名单`);
    const text = PIAN.articles.find((a) => a.tiao === r.tiao).zhHans;
    assert.ok(text.startsWith(r.hit), `${r.tiao} 首句应为「${r.hit}」`);
  }
});

test('支饮 14 条是全篇的重心：方 10 个，方条比 0.71', () => {
  const s = yinSummary();
  assert.strictEqual(s['支饮'].per, 0.71);
  assert.ok(s['支饮'].tiao > s['痰饮'].tiao + s['悬饮'].tiao + s['溢饮'].tiao,
    '支饮一条独大：14 > 3+2+1');
});

test('十枣汤跨三处：悬饮（12.22）/ 未判（12.32）/ 支饮（12.33）—— 方与饮类不是一一对应', () => {
  const rows = tiaoShape();
  const at = (t) => rows.find((r) => r.tiao === t);
  assert.strictEqual(at('12.22').yin, '悬饮');
  assert.deepStrictEqual(at('12.22').fang, ['十枣汤']);
  assert.deepStrictEqual(at('12.32').named, ['十枣汤']);
  assert.strictEqual(at('12.32').yin, '未判');
  assert.deepStrictEqual(at('12.33').named, ['十枣汤']);
  assert.strictEqual(at('12.33').yin, '支饮');
});

test('温药和之：17 方含温药，纯温方只有小半夏汤，唯一无温药者是十枣汤', () => {
  const w = warmRule();
  assert.strictEqual(w.formulas, 18);
  assert.strictEqual(w.withWarm, 17);
  assert.strictEqual(w.pureWarm, 1);
  assert.deepStrictEqual(w.rows.filter((r) => r.pure).map((r) => r.name), ['小半夏汤']);
  assert.strictEqual(w.noWarm.length, 1);
  assert.ok(w.noWarm[0].startsWith('十枣汤'));
  assert.strictEqual(w.warmTokens, 45);
  assert.strictEqual(w.herbTokens, 84);
});

test('药味频次：茯苓与甘草各 9 方，半夏与桂枝各 7，五味子 6', () => {
  const f = Object.fromEntries(herbFreq());
  assert.strictEqual(f['茯苓'], 9);
  assert.strictEqual(f['甘草'], 9, '12.18 的「甘草如指大⟨…⟩」必须清洗成药名，否则漏计');
  assert.strictEqual(f['半夏'], 7);
  assert.strictEqual(f['桂枝'], 7);
  assert.strictEqual(f['五味子'], 6, '底本 12.39/12.40 作「五味」，须归一为五味子');
  assert.strictEqual(f['干姜'], 5);
  assert.strictEqual(f['细辛'], 5);
  assert.strictEqual(warmRule().poria, 9);
});

test('药名清洗到位：无夹注残留、无数字、长度 2–5', () => {
  for (const r of warmRule().rows) {
    for (const h of r.herbs) {
      assert.ok(!/[⟨⟩（）\d]/.test(h), `药名「${h}」残留注释或剂量`);
      assert.ok(h.length >= 2 && h.length <= 5, `药名「${h}」长度异常`);
    }
  }
});

test('提名方表不许编：每个写下的方名都逐字出现在对应条文中', () => {
  for (const [tiao, names] of Object.entries(NAMED_ONLY)) {
    const art = PIAN.articles.find((a) => a.tiao === tiao);
    assert.ok(art, `${tiao} 不存在`);
    for (const n of names) assert.ok(art.zhHans.includes(n), `${tiao} 原文无「${n}」`);
  }
  assert.strictEqual(Object.values(NAMED_ONLY).flat().length, 7, '6 条共 7 个方名（12.17 一条两名）');
});

test('未判 19 条的分片与未判集合完全重合：5+5+4+1+1+3', () => {
  const g = unjudgedGroups();
  assert.deepStrictEqual(g.rows.map((r) => r.n), [5, 5, 4, 2, 3]);
  assert.strictEqual(g.total, 19);
  assert.deepStrictEqual(g.missing, [], '未判里有条文没被分片解释');
  assert.deepStrictEqual(g.extra, [], '分片里混进了不属于未判的条');
});

test('底本两栏齐备：41 条都有繁/简，且简体非空', () => {
  assert.strictEqual(PIAN.articles.length, 41);
  for (const a of PIAN.articles) {
    assert.ok(a.zhHant && a.zhHant.length > 0, `${a.tiao} 缺繁文`);
    assert.ok(a.zhHans && a.zhHans.length > 0, `${a.tiao} 缺简文`);
  }
});
