#!/usr/bin/env node
/**
 * scripts/lib_zh_en.js —— 中文 → 英文的**术语级**翻译器（把 WHO 双语表当词典用）
 *
 * ── 它做什么 ──────────────────────────────────────────────────
 * 存在两个方向，本文件只做「中文面 → 英文面」这一个方向，另一方向在
 * `scripts/lib_equivalence.js`（等价类里有现成的成员，不需要再匹配）：
 *
 *   中文串 ──最长匹配切词──▶ [{zh, en, code}] ──拼接──▶ 英文串
 *
 * 词典 = `standards/semtensor/descriptions/who-istt-terms.json`（WHO ISTT 2007，3,148 条，
 * 每条都带代码与书页）。**没有机器翻译、没有语言模型、没有相似度取近邻** ——
 * 查不到的中文片段就落在 `unmatched` 里，如实报「未覆盖」。
 *
 * ── 为什么要做切词而不是整串查表 ──────────────────────────────
 * 实测：104 个证候名里，整串能在 WHO 表里查到的只有 32 个。
 * 剩下的是复合名（「阴虚肺燥证」「痰热壅肺证」「气阴两虚、痰瘀阻络证」），
 * 而**它们的每一段都在表里** —— 「阴虚」「肺」「燥」「痰热」「气阴两虚」。所以：
 *
 *   整串查表 → 32/104（31%）
 *   最长匹配切词 → 见 `--coverage`（本文件的自测输出，数字写进 README，不写在这里猜）
 *
 * ── 三类词分清楚，混起来就会骗自己 ────────────────────────────
 *   ① **术语**：出现在 WHO 表里，带代码与书页 → 可翻译，出处可回查；
 *   ② **范畴词**：`证 / 病 / 症 / 证候` —— 不是术语，是「这一类东西」的标记。
 *      单独一张小表（STRUCT），标注 `kind:'category'`，**不冒充术语**；
 *   ③ **未覆盖**：表里查不到的片段（「壅肺」「痹阻」等）→ 进 `unmatched`，不猜。
 *
 * ── 用法 ──────────────────────────────────────────────────
 *   const Z = require('./lib_zh_en.js');
 *   const t = Z.translate('阴虚肺燥证');
 *   // { en:'yin deficiency + lung + dryness + pattern/syndrome', segments:[…], coverage:0.85, unmatched:[…] }
 *
 *   node scripts/lib_zh_en.js 阴虚肺燥证 失眠 口苦      # 命令行看切词
 *   node scripts/lib_zh_en.js --coverage                # 104 证候的覆盖统计
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ISTT = path.join(ROOT, 'standards/semtensor/descriptions/who-istt-terms.json');

/**
 * 结构性范畴词表（**闭集**，不是术语）。
 * 它们的作用是把「某某证」里的「证」译成 pattern/syndrome，让拼出的英文串读得通；
 * 它们不参与「是否覆盖」的分子 —— 一个只有范畴词的中文串，等于什么都没译出来。
 */
const STRUCT = new Map([
  ['证', 'pattern/syndrome'],
  ['證', 'pattern/syndrome'],
  ['证候', 'pattern/syndrome'],
  ['證候', 'pattern/syndrome'],
  ['病', 'disease'],
  ['症', 'symptom'],
  ['症状', 'symptom'],
  ['症狀', 'symptom'],
]);

const MAX_TERM_LEN = 16;      // 实测 WHO 表最长中文术语 16 字

/**
 * 异体字组（**只做字形归一，不做语义改写**）。
 * 实测踩到的坑：WHO 表写「脇痛」（2.3.65 hypochondriac pain），查询写「胁痛」——
 * opencc 的 t2s 把「脅」转成「胁」，但「脇」是另一个异体，转不过来，
 * 于是同一个症状词在两边对不上。这类映射只解决**写法**，不解决**含义**：
 * 表里没有的词仍然是「未覆盖」，不会因为字形相近就被当成同义词。
 */
const VARIANT_GROUPS = [
  ['脇', '脅', '胁'],     // 胁肋
  ['乾', '干'],           // 干燥
  ['欬', '咳'],           // 咳嗽
  ['鞕', '硬'],
  ['衂', '衄'],
  ['濕', '湿', '溼'],
  ['證', '证', '証'],
];

const VARIANT_OF = (() => {
  const m = new Map();
  for (const g of VARIANT_GROUPS) for (const ch of g) m.set(ch, g);
  return m;
})();

/** 一个中文串的所有异体写法（笛卡尔积，最多 8 种） */
function variantForms(s) {
  const str = String(s);
  let out = [''];
  for (const ch of str) {
    const g = VARIANT_OF.get(ch);
    const alts = g || [ch];
    const next = [];
    for (const pre of out) for (const a of alts) next.push(pre + a);
    out = next.length > 8 ? next.slice(0, 8) : next;
  }
  return [...new Set(out)];
}

let CACHE = null;

function loadDict(file = ISTT) {
  if (CACHE && CACHE.file === file) return CACHE;
  if (!fs.existsSync(file)) {
    throw new Error(
      `缺 WHO ISTT 术语表：${path.relative(ROOT, file)}\n`
      + '  补法：python scripts/who_istt_terms.py build <rows.json>（需 2007 版 PDF + pdftotext -layout）',
    );
  }
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byZh = new Map();          // 简体/繁體/异体 都当键，值相同
  let maxLen = 1;
  const put = (key, entry) => {
    if (!key) return;
    if (!byZh.has(key)) byZh.set(key, { ...entry, zh: key });
    maxLen = Math.max(maxLen, key.length);
  };
  for (const e of d.entries) {
    const entry = { en: e.en, code: e.code, page: e.bookPage, base: e.zh[0] };
    for (const z of [...e.zhS, ...e.zh]) for (const v of variantForms(z)) put(v, entry);
  }
  CACHE = { file, byZh, entries: d.entries.length, maxLen: Math.min(maxLen, MAX_TERM_LEN) };
  return CACHE;
}

/** 去代码前缀（"2.9.25 lung yin deficiency pattern/syndrome" → "lung yin deficiency pattern/syndrome"） */
function stripCode(en) {
  return String(en == null ? '' : en).replace(/^\s*\d{1,3}(\.\d{1,3}){0,2}\s+/, '').trim();
}

/**
 * 最长匹配切词：从当前位置往左找，能匹配多长就匹配多长（正向最大匹配）。
 * 返回的每一段都带 `kind`：`term`（WHO 术语）/ `category`（范畴词）/ `unmatched`（表里没有）。
 */
function segment(text, opts = {}) {
  const dict = loadDict(opts.dict);
  const s = String(text == null ? '' : text).replace(/\s+/g, '');
  const maxLen = dict.maxLen;
  const out = [];
  let i = 0;
  while (i < s.length) {
    const span = Math.min(maxLen, s.length - i);
    let hit = null;

    // 第一遍：找**术语**（最长优先）。必须试到 1 个汉字 —— WHO 表里有大量单字术语
    // （虚 / 实 / 痰 / 燥 / 肺），只试到 2 字的话「痰热壅肺」会整段落进 unmatched，
    // 而「痰」「肺」其实都在表里。
    for (let len = span; len >= 1; len--) {
      const seg = s.slice(i, i + len);
      const t = dict.byZh.get(seg);
      if (t) { hit = { zh: seg, ...t, kind: 'term' }; break; }
    }
    // 第二遍：只在没有术语命中时找**范畴词**。术语优先 —— 术语有代码与书页可回查，
    // 范畴词只是「这一类东西」的标记，不能顶替术语。
    if (!hit) {
      for (let len = span; len >= 1; len--) {
        const seg = s.slice(i, i + len);
        const c = STRUCT.get(seg);
        if (c) { hit = { zh: seg, en: c, code: null, page: null, kind: 'category' }; break; }
      }
    }
    if (!hit) hit = { zh: s[i], en: null, code: null, page: null, kind: 'unmatched' };

    // 合并相邻的 unmatched 字符，便于阅读
    const last = out[out.length - 1];
    if (hit.kind === 'unmatched' && last && last.kind === 'unmatched') last.zh += hit.zh;
    else out.push(hit);
    i += hit.zh.length;
  }
  return out;
}

/**
 * 中文 → 英文。
 * @returns {{
 *   zh:string, en:string|null, segments:object[], coverage:number,
 *   unmatched:string[], terms:object[], hasTerm:boolean, by:'dict'
 * }}
 *   coverage = 被**术语**覆盖的汉字数 / 总汉字数（范畴词不算覆盖 —— 只有「证」两个字的串等于没译）
 */
function translate(text, opts = {}) {
  const segs = segment(text, opts);
  const chars = segs.reduce((n, s) => n + (isCjk(s.zh) ? s.zh.length : 0), 0);
  const covered = segs.filter((s) => s.kind === 'term').reduce((n, s) => n + s.zh.length, 0);
  const terms = segs.filter((s) => s.kind === 'term');
  const unmatched = segs.filter((s) => s.kind === 'unmatched').map((s) => s.zh);
  const en = segs.filter((s) => s.en).map((s) => stripCode(s.en)).join(' + ') || null;
  return {
    zh: String(text == null ? '' : text),
    en,
    segments: segs,
    coverage: chars ? covered / chars : 0,
    unmatched,
    terms,
    hasTerm: terms.length > 0,
    by: 'dict',
  };
}

function isCjk(ch) {
  return /[\u3400-\u9fff]/.test(ch);
}

/** 只取英文串，给检索用；覆盖不足时返回 null（宁可空手，不给半截译文） */
function toEnglish(text, { minCoverage = 0.6, dict } = {}) {
  const r = translate(text, { dict });
  if (!r.hasTerm || r.coverage < minCoverage) return null;
  return r.en;
}

// ── CLI ────────────────────────────────────────────────────

function coverageReport() {
  const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = (Array.isArray(ref) ? ref : ref.units).filter((u) => u.kind === 'dsu');
  const dict = loadDict();
  const rows = units.map((u) => {
    const bare = String(u.label).replace(/[（(][^（）()]*[）)]/g, '');
    const exact = dict.byZh.has(bare);
    const t = translate(bare);
    return { uid: u.uid, label: u.label, exact, coverage: t.coverage, en: t.en, unmatched: t.unmatched };
  });
  const exactN = rows.filter((r) => r.exact).length;
  const full = rows.filter((r) => r.coverage >= 0.999).length;
  const pass = rows.filter((r) => r.coverage >= 0.6).length;
  console.log(`词典 ${dict.entries} 条 · 最长中文术语 ${dict.maxLen} 字`);
  console.log(`104 证候：整串命中 ${exactN} · 切词后全覆盖 ${full} · 覆盖率≥0.6 ${pass}`);
  const weak = rows.filter((r) => r.coverage < 0.6);
  console.log(`覆盖率 <0.6（不产出译文）${weak.length} 条：`);
  for (const w of weak.slice(0, 12)) {
    console.log(`  · ${w.uid} ${w.label}  cov=${w.coverage.toFixed(2)}  未覆盖：${w.unmatched.join('/') || '—'}`);
  }
  const mid = rows.filter((r) => r.coverage >= 0.6 && r.coverage < 0.999);
  console.log(`部分覆盖（0.6–1）${mid.length} 条，例：`);
  for (const m of mid.slice(0, 6)) {
    console.log(`  · ${m.label} cov=${m.coverage.toFixed(2)} → ${m.en}`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--coverage')) { coverageReport(); return; }
  if (!argv.length) { console.log('用法：node scripts/lib_zh_en.js <中文…>  |  --coverage'); return; }
  for (const q of argv) {
    const t = translate(q);
    console.log(`\n「${q}」 coverage=${t.coverage.toFixed(2)}`);
    for (const s of t.segments) {
      const tag = s.kind === 'term' ? `术语 ${s.code}` : s.kind === 'category' ? '范畴词' : '未覆盖';
      console.log(`   ${s.zh.padEnd(8)} ${tag.padEnd(10)} ${s.en || '—'}`);
    }
    console.log(`   → ${t.en || '（无译文）'}`);
  }
}

if (require.main === module) main();

module.exports = { loadDict, segment, translate, toEnglish, stripCode, variantForms, STRUCT, ISTT, VARIANT_GROUPS };
