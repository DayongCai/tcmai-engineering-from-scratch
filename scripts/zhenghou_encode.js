#!/usr/bin/env node
/**
 * scripts/zhenghou_encode.js —— 把四诊映射到全码：/encode 的参考实现
 *
 *   node scripts/zhenghou_encode.js --ctx "恶寒重 无汗 脉浮紧"
 *   node scripts/zhenghou_encode.js --json '{"恶寒重":true,"无汗":true}'
 *   node scripts/zhenghou_encode.js --all            跑全部黄金样例并逐条断言
 *   node scripts/zhenghou_encode.js --check          只断言，不打印样例明细（给 CI 用）
 *
 * ## 它在整条链里的位置
 *
 *   四诊文本 → 归一（词项 → 词表） → 定维（位 · 性） → 候选（≤5） → 主候（开关组） → 危候标记
 *
 * 附录 E 写了这套流水线，但文档里的 JSON 是**画的**。这个文件把它**跑通**：
 * 同一份 `standards/zhenghou-cidian/`，同样的词表，产出可以直接对照的黄金样例。
 * 没有它，附录 E 的接口示例就只是设计稿；有了它，下游写 APP 的人拿这个文件的输出当 fixture。
 *
 * ## 三条判定规则（都不做同义推断，只做形态匹配）
 *
 *   1. 精确：ctx 词项 == 词表词项
 *   2. 包含：ctx 词项 **包含** 词表词项（长词里带短语，如「脉沉细」含「脉沉」）
 *   3. 前缀：词表词项 **以** ctx 词项 **开头**（用户说半截，如「脉沉」→ 词表「脉沉紧」）
 *   三级之外一律进 `未收录词`，**不猜**。猜出来的匹配比漏掉更坏：它会让 APP 看起来很聪明，
 *   却在用户看不见的地方把「脉沉」当成「脉沉细数」。
 *
 * ## 候级为什么可能返回 null
 *
 * 候选证定了「哪个证」，候要回答「哪一步先坏」（失宣？郁蒸？虚陷？）。这需要汗、舌、脉、
 * 寒热偏好的细节；ctx 里没有这些细节时，主候就是 null —— 这是**如实**，不是失败。
 * 只有当 ctx 直接出现候位名（「卫气」）或态名（「郁蒸」「厥脱」）时才给候，并同时给出族。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');

const DANGER_FAMS = new Set(['陷逆', '脱绝']);   // 这两族命中即「危候」，见附录 E.2
const MAX_CAND = 5;

// ─────────────────────────── 载入 ───────────────────────────

function jread(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function splitTerms(s) {
  return String(s || '')
    .split(/[、，,；;\/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function load() {
  const struct = jread(path.join(STD, '结构.json'));
  const wei = jread(path.join(STD, '语素-位.json'));
  const xing = jread(path.join(STD, '语素-性.json'));
  const tai = jread(path.join(STD, '语素-态.json'));
  // 百姓口语 → 词表说法（可缺省：文件不存在就退化为只认词表原词）
  let alias = {};
  let danger = {};
  try {
    const A = jread(path.join(STD, '口语别名.json'));
    alias = A['别名'] || {};
    // 危象词单独一张表：只触发分流，不参与位/性计分（安全优先，宁可误报）
    danger = A['危象'] || {};
  } catch (e) {
    alias = {};
    danger = {};
  }

  // 位/性 → 见症词项
  const weiTerms = new Map();
  for (const w of wei['证位']) weiTerms.set(w.zh, new Set(splitTerms(w['见症'])));
  const xingTerms = new Map();
  for (const y of xing['类']) xingTerms.set(y.zh, new Set(splitTerms(y['见症'])));

  // 词项 → 位/性（反查，与附录 D 同源）
  const termIdx = new Map();
  for (const [w, set] of weiTerms) {
    for (const t of set) {
      if (!termIdx.has(t)) termIdx.set(t, { wei: new Set(), xing: new Set() });
      termIdx.get(t).wei.add(w);
    }
  }
  for (const [x, set] of xingTerms) {
    for (const t of set) {
      if (!termIdx.has(t)) termIdx.set(t, { wei: new Set(), xing: new Set() });
      termIdx.get(t).xing.add(x);
    }
  }

  // 态 → 族、候位名
  const taiFam = new Map();
  for (const t of tai['态']) taiFam.set(t.zh, t['族'] || '其他');
  const houWei = new Set(wei['候位'].map((w) => w.zh));

  // 附录一「75 证象」的机器索引（可缺省：文件不存在就整体退化为「不判名」）
  // 为什么要有它：位/性语素能算「像哪一证」，但算不出「这个证象名在原书里到底有没有」。
  // 原表是「部位 × 病机」的合法格，用它做的校验是**硬边界**，不是相似度。
  let xiang = null;
  try {
    const X = jread(path.join(STD, '证象-合法组合.json'));
    const phraseSet = new Set(X['phrases'] || []);
    const cellOf = new Map();      // 表内写法 → {col,row}
    for (const [col, m] of Object.entries(X['byWei'] || {})) {
      for (const [row, text] of Object.entries(m)) cellOf.set(text, { col, row });
    }
    xiang = {
      phraseSet, cellOf,
      rows: new Set(X['rows'] || []),
      byWei: X['byWei'] || {},
      // 位前缀在格内文字里常带修饰字（阳 → 阳气、阴 → 阴液、津 → 津气/津液、营 → 营气、血 → 血液）
      prefixVariants: { 阳: ['阳气'], 阴: ['阴液'], 津: ['津气', '津液'], 营: ['营气'], 血: ['血液'] },
      count: X['count'] || 0,
    };
  } catch (e) {
    xiang = null;
  }

  // 证扁平表
  const zheng = [];
  for (const m of struct.men) {
    for (const l of m.lei) {
      for (const z of l.zhengList) {
        zheng.push({ m, l, z });
      }
    }
  }
  return { struct, wei, xing, tai, weiTerms, xingTerms, termIdx, taiFam, houWei, zheng, alias, danger, xiang };
}

// ─────────────────────────── 归一 ───────────────────────────

/** 把用户词项对到词表：精确 → 包含 → 前缀，**三路都跑、全部收集**。
 *
 * 为什么不是「命中一条就返回」：同一个说法可能同时挂在位语素与类语素上，而两边措辞不同 ——
 * 「无汗」精确命中的是类语素「风寒」，但位语素「肺卫」写的是「无汗或少汗」，
 * 只走精确就永远拿不到位的那一分，最典型的风寒证会被判空（第一版就这么翻车的）。
 * 现在一个词项可以同时落到多个词表项，位与性各自记「有多少个不同的 ctx 词项碰到我」。
 */
function normalizeAll(db, raw) {
  const t = raw.trim();
  if (!t) return [];
  const out = [];
  const seen = new Set();
  const push = (term, how) => {
    if (seen.has(term)) return;
    seen.add(term);
    out.push({ raw, term, how });
  };
  // 先过「百姓口语」表：怕冷→畏寒、没汗→无汗。别名词本身也要能继续走三路匹配，
  // 所以要递归一次（别名可能只命中「包含」而不是「精确」）。
  const canon = (db.alias && db.alias[t]) || null;
  if (canon) {
    for (const a of normalizeAll({ ...db, alias: {} }, canon)) out.push({ ...a, raw, how: 'alias' });
    return out;
  }
  if (db.termIdx.has(t)) push(t, 'exact');
  for (const known of db.termIdx.keys()) {
    if (known.length >= 2 && t.includes(known)) push(known, 'contains');
  }
  for (const known of db.termIdx.keys()) {
    if (t.length >= 2 && known.startsWith(t)) push(known, 'prefix');
  }
  return out;
}

/** 只要一条（调试/展示用）：优先级 exact > contains(最长) > prefix(最短) */
function normalize(db, raw) {
  const all = normalizeAll(db, raw);
  if (!all.length) return null;
  const ex = all.find((a) => a.how === 'exact');
  if (ex) return ex;
  const ct = all.filter((a) => a.how === 'contains').sort((a, b) => b.term.length - a.term.length)[0];
  if (ct) return ct;
  return all.filter((a) => a.how === 'prefix').sort((a, b) => a.term.length - b.term.length)[0];
}

// ─────────────────────────── 编码 ───────────────────────────

function famMix(z, taiFam) {
  const cnt = {};
  for (const h of z.houList) {
    const fam = taiFam.get(h.tai) || '其他';
    cnt[fam] = (cnt[fam] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/** 主候：ctx 里直接出现候位名或态名才给，否则如实 null。 */
function pickHou(z, ctxTerms, rawTerms, db) {
  let best = null;
  for (const h of z.houList) {
    let score = 0;
    const why = [];
    // 候选词分两路：规范词（位/性见症）与 ctx 原词（用户可能直接说了候位名/态名，
    // 如「阳脱」「厥脱」「卫气」—— 这些不是见症词，但确实是辞典里的词，必须能认）
    for (const t of [...ctxTerms, ...rawTerms]) {
      if (h.wei && (t === h.wei || t.includes(h.wei))) { score += 2; why.push('位:' + h.wei); }
      if (h.tai && (t === h.tai || t.includes(h.tai))) { score += 3; why.push('态:' + h.tai); }
    }
    if (score && (!best || score > best.score)) best = { h, score, why: [...new Set(why)] };
  }
  if (!best) return null;
  return {
    full: best.h.full,
    zh: best.h.zh,
    族: db.taiFam.get(best.h.tai) || '其他',
    依据: best.why,
  };
}
// ─────────────────────── 追问策略（弱证据怎么补一问） ───────────────────────
//
// ─────────────────────── 名形校验（附录一：75 证象） ───────────────────────
//
// 「部位 × 病机」在原书是一张 19×13 的合法矩阵（附录一）。这里用它当**硬边界**：
// 名字能拆成「表内位 + 表内病机」且该格有字 → 合法；格空 → 原书没有这个说法；
// 拆不开 → 不判（说清「不在附录一词表内」），绝不因为拆不开就判错。
function validateName(db, raw) {
  const s = String(raw == null ? '' : raw).replace(/\s/g, '').replace(/[候证]$/, '');
  if (!db.xiang) {
    return { 名: s, ok: null, 说明: '未载入附录一索引（缺 证象-合法组合.json），不判' };
  }
  if (!s) return { 名: s, ok: null, 说明: '空名' };

  if (db.xiang.phraseSet.has(s)) {
    const cell = db.xiang.cellOf.get(s) || {};
    return { 名: s, ok: true, 位: cell.col, 病机: cell.row, 表内写法: s,
      说明: `附录一「${cell.col}×${cell.row}」这一格就是它` };
  }

  // 拆：最长位前缀（含 阳气/阴液/津气/血液 这类变体）+ 最长病机后缀
  const cols = Object.keys(db.xiang.byWei).sort((a, b) => b.length - a.length);
  let col = null;
  let usedPrefix = '';
  for (const c of cols) {
    for (const p of [c, ...(db.xiang.prefixVariants[c] || [])]) {
      if (s.startsWith(p) && p.length > usedPrefix.length) { col = c; usedPrefix = p; }
    }
  }
  let row = null;
  for (const r of db.xiang.rows) {
    if (!s.endsWith(r)) continue;
    if (!row || r.length > row.length) row = r;
  }
  if (!col || !row) {
    return { 名: s, ok: null,
      说明: '拆不成「表内位 + 表内病机」，可能不是证象名（如证名/候名/症状串），不判' };
  }
  const cell = (db.xiang.byWei[col] || {})[row];
  if (cell) {
    return { 名: s, ok: true, 位: col, 病机: row, 表内写法: cell,
      说明: cell === s ? '原表此格写法一致' : `组合合法，但原表写作「${cell}」` };
  }
  const sameCol = Object.entries(db.xiang.byWei[col] || {}).map(([r, t]) => `${r}→${t}`);
  return { 名: s, ok: false, 位: col, 病机: row,
    说明: `附录一「${col}×${row}」是空格：原书没有「${s}」这个证象`,
    该位合法组合: sameCol };
}

// 为什么要有这一段：百姓只会说两句（「干咳、嗓子干」），位与性各命中 1 个，
// 算法只能给 weak。此时**不该硬答、也不该判空** —— 应该问一句能加一分的话。
// 规则极简：哪一维薄，就问那一维；两边都薄，先问位（位比性更容易问清）。
function followUps(best, unmatched) {
  if (!best) {
    return [{ 维度: '位', 问: '最难受的是哪儿：头面、胸肺、胃脘、腰腹，还是四肢关节？' },
      { 维度: '性', 问: '更怕冷还是更怕热？口干要不要喝水？痰是白还是黄？' }];
  }
  const ask = [];
  if (best['命中位'] < 2) {
    ask.push({ 维度: '位', 问: '除了已经说的，还牵连到哪儿：头面、胸肺、胃脘、腰腹、四肢关节？' });
  }
  if (best['命中性'] < 2) {
    ask.push({ 维度: '性', 问: '再确认两点：更怕冷还是更怕热？痰/涕是清稀还是黄稠？舌苔偏白还是偏黄？' });
  }
  if (unmatched && unmatched.length) {
    ask.push({ 维度: '词', 问: '这几个说法辞典没收录：' + unmatched.join('、') + '。换个说法再试（见附录 D 词表）。' });
  }
  return ask;
}

function encode(db, ctx) {
  const rawTerms = Array.isArray(ctx) ? ctx : (typeof ctx === 'string' ? splitTerms(ctx) : Object.keys(ctx || {}));
  const matched = [];          // [{raw, term, how}] 展开后的全部命中
  const vocabHits = [];        // 只是「辞典里认识这个词」，不参与位/性计分
  const unmatched = [];        // 一个词表项都没碰到的原词
  const dangerRaw = [];        // 危象词（口语）：命中即分流就医，不做位/性计分
  const nameChecks = [];       // 名形校验：附录一「部位×病机」的合法性判定（不参与计分）
  for (const r of rawTerms) {
    const hits = normalizeAll(db, r);
    if (hits.length) { matched.push(...hits); continue; }
    // 态名（阳脱/厥脱/郁蒸…）与候位名（卫气/清气…）不写在见症里，但它们确实是辞典的词。
    // 认得出来 ≠ 能定维：这类词只用于候选之后的「主候」判定，不进位/性计分。
    const t = r.trim();
    // 危象词：不进计分，只记账 —— 后面 危候 直接置真。
    // 用「包含」而不是「精确」：百姓说的是「突然昏倒」「刚才晕过去一次」，
    // 一个词条里常裹着状语，精确匹配等于放过。
    const dk = db.danger ? Object.keys(db.danger).find((k) => t.includes(k)) : null;
    if (dk) {
      vocabHits.push({ raw: t, term: db.danger[dk], how: 'vocab-危象' });
      dangerRaw.push(t);
      continue;
    }
    if (db.taiFam.has(t)) { vocabHits.push({ raw: t, term: t, how: 'vocab-态' }); continue; }
    if (db.houWei.has(t)) { vocabHits.push({ raw: t, term: t, how: 'vocab-候位' }); continue; }
    // 附录一证象：认得出（合法格）就记一笔、不参与位/性计分；
    // 判定为「原表空格」的，也要留下来 —— 这是回答「为什么没匹配上」的依据，不是错误。
    const vn = validateName(db, t);
    if (vn.ok === true) { vocabHits.push({ raw: t, term: vn.表内写法, how: 'vocab-证象' }); nameChecks.push(vn); continue; }
    if (vn.ok === false) { nameChecks.push(vn); unmatched.push(r); continue; }
    unmatched.push(r);
  }

  // 位/性 各自的命中数：按 **不同的 ctx 原词** 计（同一个原词命中多个同族词表项只算 1）
  const weiHit = new Map();
  const xingHit = new Map();
  for (const { raw, term, how } of matched) {
    const e = db.termIdx.get(term);
    for (const w of e.wei) {
      if (!weiHit.has(w)) weiHit.set(w, new Map());
      weiHit.get(w).set(raw, { term, how });
    }
    for (const x of e.xing) {
      if (!xingHit.has(x)) xingHit.set(x, new Map());
      xingHit.get(x).set(raw, { term, how });
    }
  }

  const cands = [];
  for (const { m, l, z } of db.zheng) {
    const w = weiHit.get(z.wei) || new Map();
    const x = xingHit.get(l.zh) || new Map();
    // 阈值为什么不是「位≥2 且 性≥2」：位语素与类语素的见症措辞不一致（位说「无汗或少汗」，
    // 类说「无汗」），一刀切 2/2 会把最典型的风寒证判空。实测后改成「合计 ≥3 且两侧各 ≥1」，
    // 并把「位≥2 且 性≥2」单列为 strong 档 —— 阈值写进代码，也要写进文档（附录 E.2 / 调用块）。
    if (w.size + x.size >= 3 && w.size >= 1 && x.size >= 1) {
      cands.push({ m, l, z, w: w.size, x: x.size, total: w.size + x.size,
        tier: (w.size >= 2 && x.size >= 2) ? 'strong' : 'normal' });
    }
  }
  // 弱证据档：百姓主诉常常只有两句（「怕冷、没汗」），位+性合计只有 2。
  // 这时不判空，但**降档并标注**，README/附录 E 里写清「弱证据需补一问一诊」。
  // 只有一条强/常规候选都没有时才用弱档 —— 宁可少答，不许拿弱证据冒充强证据。
  if (!cands.length) {
    for (const { m, l, z } of db.zheng) {
      const w = weiHit.get(z.wei) || new Map();
      const x = xingHit.get(l.zh) || new Map();
      if (w.size >= 1 && x.size >= 1) {
        cands.push({ m, l, z, w: w.size, x: x.size, total: w.size + x.size, tier: 'weak' });
      }
    }
  }
  cands.sort((a, b) => b.total - a.total || (a.tier === 'strong' ? -1 : 1) || b.z.houList.length - a.z.houList.length);

  const ctxTerms = [...new Set(matched.map((h) => h.term))];
  const out = cands.slice(0, MAX_CAND).map((c) => {
    const hou = pickHou(c.z, ctxTerms, rawTerms, db);
    return {
      full: c.z.full,
      zh: c.z.zh,
      门: `${c.m.code} ${c.m.zh}门`,
      类: `${c.l.code} ${c.l.zh}证类`,
      命中位: c.w,
      命中性: c.x,
      强度: c.tier,
      候数: c.z.houList.length,
      主候: hou ? hou.full : null,
      主候名: hou ? hou.zh : null,
      主候族: hou ? hou['族'] : null,
      主候名形校验: hou ? validateName(db, hou.zh).ok : null,
      开关组: famMix(c.z, db.taiFam),
      治法动作: (() => {
        const w = db.wei['证位'].find((q) => q.zh === c.z.wei) || {};
        return [w['治法'], c.l['治法']].filter(Boolean);
      })(),
      危候: !!(hou && DANGER_FAMS.has(hou['族'])),
      页: c.z.page,
    };
  });

  return {
    ctx: Object.fromEntries((Array.isArray(rawTerms) ? rawTerms : []).map((t) => [t, true])),
    归一: [...matched, ...vocabHits].map((h) => ({ 原词: h.raw, 词表: h.term, 方式: h.how })),
    候选: out,
    危候: out.some((c) => c['危候']) || dangerRaw.length > 0,
    危象词: dangerRaw,
    未收录词: unmatched,
    名形校验: nameChecks,
    // 追问：只在证据不足时给；strong 时为空数组 —— 不要没事也问，烦人也是错
    追问: (out.length && out[0]['强度'] === 'strong') ? [] : followUps(out[0], unmatched),
    提示: out.length
      ? '候选不是诊断；请由执业中医师结合四诊确认。危候为真时须立即就医。'
      : '未匹配到候选。请补四诊（汗、舌、脉、寒热偏好），或换用词表里的说法（见附录 D）。',
  };
}

// ─────────────────────────── CLI ───────────────────────────

function printResult(r) {
  const L = [];
  L.push('归一：' + (r['归一'].length ? r['归一'].map((n) => `${n.原词}→${n.词表}(${n.方式})`).join('  ') : '（无）'));
  if (r['未收录词'].length) L.push('未收录：' + r['未收录词'].join('  '));
  for (const n of (r['名形校验'] || [])) {
    L.push(`名形校验：${n.名} → ${n.ok === true ? '合法' : n.ok === false ? '原表无此格' : '不判'}（${n.说明}）`);
  }
  if (!r['候选'].length) {
    L.push('候选：0 条');
    L.push(r['提示']);
    return L.join('\n');
  }
  L.push(`候选 ${r['候选'].length} 条（按 位命中+性命中 排序）：`);
  for (const c of r['候选']) {
    L.push(`  ${c.full} ${c.zh}  位${c['命中位']}+性${c['命中性']}  ·${c['门']} · ${c['候数']} 候` +
      (c['主候'] ? ` · 主候 ${c['主候']} ${c['主候名']}（${c['危候'] ? '危' : '非危'}）` : ' · 主候 null'));
  }
  if (r['危候']) L.push('⚠ 危候：命中陷逆/脱绝族 —— 输出必须从调理切成立即就医。');
  L.push(r['提示']);
  return L.join('\n');
}

function runCases(db, quiet) {
  const casesPath = path.join(STD, 'encode-cases.json');
  const cases = jread(casesPath);
  const fails = [];
  for (const c of cases.cases) {
    const r = encode(db, c.ctx);
    const top = r['候选'][0];
    const okMen = c['期望门'] ? (!!top && top['门'].startsWith(c['期望门'])) : (r['候选'].length === 0);
    const okDanger = r['危候'] === !!c['期望危候'];
    const okUnmatched = (r['未收录词'].length === 0) === !c['允许未收录'];
    const okCount = r['候选'].length <= MAX_CAND;
    if (!(okMen && okDanger && okUnmatched && okCount)) {
      fails.push({
        id: c.id, 期望门: c['期望门'], 实际门: top ? top['门'] : '（无候选）',
        期望危候: !!c['期望危候'], 实际危候: r['危候'],
        未收录: r['未收录词'], 候选数: r['候选'].length,
      });
    }
    if (!quiet) {
      console.log(`\n── ${c.id} · ${c['说明']}`);
      console.log('   ctx: ' + JSON.stringify(c.ctx));
      console.log(printResult(r).split('\n').map((l) => '   ' + l).join('\n'));
    }
  }
  const pass = cases.cases.length - fails.length;
  console.log(`\n═══ 黄金样例 ${pass}/${cases.cases.length} 通过 ═══`);
  if (fails.length) {
    for (const f of fails) console.log('  ✗ ' + JSON.stringify(f));
    return 1;
  }
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const db = load();

  if (argv.includes('--all') || argv.includes('--check')) {
    return runCases(db, argv.includes('--check'));
  }
  const ni = argv.indexOf('--name');
  if (ni >= 0) {
    const v = validateName(db, argv[ni + 1]);
    console.log(JSON.stringify(v, null, 1));
    return v.ok === false ? 2 : 0;
  }
  const ci = argv.indexOf('--ctx');
  const ji = argv.indexOf('--json');
  let ctx;
  if (ci >= 0) ctx = argv[ci + 1];
  else if (ji >= 0) ctx = JSON.parse(argv[ji + 1]);
  else {
    console.log('用法：');
    console.log('  node scripts/zhenghou_encode.js --ctx "恶寒重 无汗 脉浮紧"');
    console.log('  node scripts/zhenghou_encode.js --json \'{"恶寒重":true,"无汗":true}\'');
    console.log('  node scripts/zhenghou_encode.js --name 腠理不宣   # 名形校验（附录一）');
    console.log('  node scripts/zhenghou_encode.js --all      # 12+2 条黄金样例');
    return 1;
  }
  const r = encode(db, ctx);
  console.log(printResult(r));
  console.log('\n--- JSON ---');
  console.log(JSON.stringify(r, null, 2));
  return r['候选'].length ? 0 : 2;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { load, encode, normalize, normalizeAll, splitTerms, validateName, MAX_CAND };
