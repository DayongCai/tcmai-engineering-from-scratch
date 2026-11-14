/**
 * site/zhenghou-core.js —— 「疾病证候单元」浏览器端匹配内核（UMD，Node 与页面共用）
 *
 * 为什么要有第二份实现：APP/网页不能连 Node 进程。但两份实现必须同源同规则，
 * 否则「页面上查到的」和「接口返回的」会不一致 —— 那是数据产品最严重的 bug。
 * 所以这里只保留**最小可判规则集**，并用 tests/test_zhenghou_site.js 拿 12 条
 * 百姓问句做对齐测试：页面内核跑出的门，必须与 scripts/zhenghou_encode.js 一致。
 *
 * 规则（与 zhenghou_encode.js 同口径）：
 *   1. 别名优先（口语 → 词表说法），别名表来自 standards/zhenghou-cidian/口语别名.json；
 *   2. 词项匹配三路（精确 / 包含 / 前缀）全部收集，同一原词命中多个词表项只算一次；
 *   3. 位命中数 = 落到该证「位」上的不同原词数；性命中数 = 落到该证「类」上的不同原词数；
 *   4. 门槛：位+性 ≥ 3 且两侧各 ≥1；位≥2 且性≥2 记 strong；都不满足但两侧各≥1 记 weak；
 *   5. 危象词（昏倒/厥脱…）不参与计分，只把 danger 置真（安全优先）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZhenghouCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function splitTerms(text) {
    return String(text || '')
      .split(/[\s,，、;；/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function index(data) {
    const termIdx = new Map();          // 词表说法 → {wei:Set, xing:Set}
    const add = (kind, owner, term) => {
      const t = String(term || '').trim();
      if (!t) return;
      if (!termIdx.has(t)) termIdx.set(t, { wei: new Set(), xing: new Set() });
      termIdx.get(t)[kind].add(owner);
    };
    for (const w of data.wei) for (const t of splitTerms(w.见症)) add('wei', w.zh, t);
    for (const y of data.xing) for (const t of splitTerms(y.见症)) add('xing', y.zh, t);
    return { termIdx };
  }

  function matchTerm(idx, raw) {
    const out = new Map();               // term → how
    const t = String(raw || '').trim();
    if (!t) return out;
    if (idx.termIdx.has(t)) out.set(t, 'exact');
    for (const known of idx.termIdx.keys()) {
      if (known.length >= 2 && t.includes(known) && !out.has(known)) out.set(known, 'contains');
    }
    for (const known of idx.termIdx.keys()) {
      if (t.length >= 2 && known.startsWith(t) && !out.has(known)) out.set(known, 'prefix');
    }
    return out;
  }

  function encode(data, text) {
    const idx = index(data);
    const rawTerms = Array.isArray(text) ? text : splitTerms(text);
    const alias = data.alias || {};
    const danger = data.danger || {};

    const matched = [];   // {raw, term}
    const dangerRaw = [];
    const unmatched = [];

    for (const raw of rawTerms) {
      const t = String(raw).trim();
      const dk = Object.keys(danger).find((k) => t.includes(k));
      if (dk) { dangerRaw.push(t); continue; }

      // 别名：口语 → 词表说法；别名词本身再走三路匹配
      const canon = alias[t] || t;
      const hits = matchTerm(idx, canon);
      if (hits.size === 0) { unmatched.push(t); continue; }
      for (const [term, how] of hits) matched.push({ raw: t, term, how: raw === canon ? how : 'alias' });
    }

    const weiHit = new Map();   // 位 → Set(raw)
    const xingHit = new Map();  // 类 → Set(raw)
    for (const { raw, term } of matched) {
      const e = idx.termIdx.get(term);
      if (!e) continue;
      for (const w of e.wei) {
        if (!weiHit.has(w)) weiHit.set(w, new Set());
        weiHit.get(w).add(raw);
      }
      for (const x of e.xing) {
        if (!xingHit.has(x)) xingHit.set(x, new Set());
        xingHit.get(x).add(raw);
      }
    }

    const cands = [];
    for (const z of data.zheng) {
      const w = weiHit.get(z.wei) || new Set();
      const x = xingHit.get(z.leiZh) || new Set();
      if (w.size + x.size >= 3 && w.size >= 1 && x.size >= 1) {
        cands.push({ z, w: w.size, x: x.size, total: w.size + x.size,
          tier: (w.size >= 2 && x.size >= 2) ? 'strong' : 'normal' });
      }
    }
    if (!cands.length) {
      for (const z of data.zheng) {
        const w = weiHit.get(z.wei) || new Set();
        const x = xingHit.get(z.leiZh) || new Set();
        if (w.size >= 1 && x.size >= 1) {
          cands.push({ z, w: w.size, x: x.size, total: w.size + x.size, tier: 'weak' });
        }
      }
    }
    cands.sort((a, b) => b.total - a.total
      || (b.tier === 'strong') - (a.tier === 'strong')
      || a.z.full.localeCompare(b.z.full));

    const out = cands.slice(0, 5).map((c) => ({
      full: c.z.full, 门: c.z.men, 证: c.z.zh, 位: c.z.wei, 类: c.z.leiZh,
      位命中: c.w, 性命中: c.x, tier: c.tier, 危候: false,
    }));
    const dangerOn = dangerRaw.length > 0;
    return {
      candidates: out,
      danger: dangerOn,
      dangerTerms: dangerRaw,
      unmatched,
      ask: (out.length && out[0].tier === 'strong') ? [] : followUps(out[0], unmatched),
    };
  }

  function followUps(best, unmatched) {
    if (!best) {
      return [{ 维度: '位', 问: '最难受的是哪儿：头面、胸肺、胃脘、腰腹，还是四肢关节？' },
        { 维度: '性', 问: '更怕冷还是更怕热？口干要不要喝水？痰是白还是黄？' }];
    }
    const ask = [];
    if (best.位命中 < 2) ask.push({ 维度: '位', 问: '除了已经说的，还牵连到哪儿：头面、胸肺、胃脘、腰腹、四肢关节？' });
    if (best.性命中 < 2) ask.push({ 维度: '性', 问: '再确认两点：更怕冷还是更怕热？痰/涕是清稀还是黄稠？舌苔偏白还是偏黄？' });
    if (unmatched && unmatched.length) ask.push({ 维度: '词', 问: '这几个说法辞典没收录：' + unmatched.join('、') + '。换个说法再试。' });
    return ask;
  }

  return { splitTerms, index, encode, followUps };
}));
