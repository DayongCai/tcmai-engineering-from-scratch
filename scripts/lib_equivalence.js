#!/usr/bin/env node
/**
 * scripts/lib_equivalence.js —— 语义张量等价类的查询接口（跨语种等价翻译）
 *
 * `scripts/build_equivalence.js` 负责**建**（把 WHO ISTT 双语表、who-tcm 已核条目、
 * 本仓库登记的 ICD-11 编码、TM1 规范化同串收敛成一张等价类表）；本文件负责**查**。
 *
 * ── 语义 ────────────────────────────────────────────────────
 * 一个等价类绑定**一个张量点**（θ, φ, r）。类内成员是同一术语在不同语种/写法下的形式。
 * 所以「翻译」不是语言转换，是**读同一个点的另一个名字**：
 *
 *     translate('liver-gallbladder dampness-heat pattern/syndrome', 'zh-Hans')
 *       → [{ form:'肝胆湿热证', strength:'A', source:'WHO ISTT 2.9.91 书页 143' }]
 *
 * ── 三条硬规矩 ────────────────────────────────────────────────
 *  1. **同名多义返回全部候选**，不取第一个。实测「气滞血瘀证」与「气滞血瘀证(颈部)」
 *     是两个单元、两个张量点（θ −13.8° vs 14.6°），名字却相同 —— 静默取第一个就是造假。
 *  2. **A/B/C 是翻译，D 不是。** D 级是切词拼出来的检索探针，只在 `probes()` 里返回，
 *     且带 `derived:true`；`translate()` 默认不返回它。
 *  3. **查不到就说查不到**：返回 `[]` 与 `why`，不拿相似度凑一个最近的类。
 *
 * 用法：
 *   const E = require('./lib_equivalence.js');
 *   E.resolve('口苦')                      // 任一语种 → 候选类（含张量点）
 *   E.translate('肝胆湿热证', 'en')         // → 英文等价形式（带出处）
 *   E.probes('阴虚肺燥证')                  // → 检索探针（含 D 级，标 derived）
 *   E.sameSemanticPoint('a','b')            // 是否同一个点
 *
 *   node scripts/lib_equivalence.js 肝胆湿热证            # CLI：类 + 成员 + 张量
 *   node scripts/lib_equivalence.js --stats
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CLASSES = path.join(ROOT, 'standards/semtensor/equivalence/classes.json');

// 规范化与 build_equivalence 必须**同一套**：同一个术语两边必须归一成同一个键，
// 否则"建的索引查不到"这种 bug 会静默存在。这里直接复用那边的实现（单一实现原则）。
const { normalizeZh, normalizeEn } = require('./build_equivalence.js');

let CACHE = null;

function load(file = CLASSES) {
  if (CACHE && CACHE.file === file) return CACHE;
  if (!fs.existsSync(file)) {
    throw new Error(
      `缺等价映射产物：${path.relative(ROOT, file)}\n  补法：node scripts/build_equivalence.js`,
    );
  }
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byId = new Map();
  const byForm = new Map();          // "zh:肝胆湿热证" -> Set(classId)
  const put = (key, id) => {
    if (!key) return;
    if (!byForm.has(key)) byForm.set(key, new Set());
    byForm.get(key).add(id);
  };
  for (const c of d.classes) {
    byId.set(c.id, c);
    for (const m of c.members) {
      const k = m.lang.startsWith('zh') ? `zh:${normalizeZh(m.form)}` : `en:${normalizeEn(m.form)}`;
      put(k, c.id);
    }
  }
  CACHE = { file, data: d, byId, byForm };
  return CACHE;
}

/** 一个表面形式可能的键：中文走 zh 键（繁简已在产物里各有一条），英文走 en 键 */
function keysOf(form) {
  const s = String(form == null ? '' : form).trim();
  if (!s) return [];
  const out = [];
  const zh = normalizeZh(s);
  if (zh) out.push(`zh:${zh}`);
  const en = normalizeEn(s);
  if (en) out.push(`en:${en}`);
  return out;
}

/**
 * 解析任意语种的表面形式 → 候选等价类。
 * @returns {{ candidates: object[], ambiguous: boolean, why?: string }}
 */
function resolve(form, opts = {}) {
  const ix = load(opts.file);
  const ids = new Set();
  for (const k of keysOf(form)) for (const id of ix.byForm.get(k) || []) ids.add(id);
  const candidates = [...ids].sort().map((id) => ix.byId.get(id));
  return {
    candidates,
    ambiguous: candidates.length > 1,
    why: candidates.length ? undefined
      : '该形式不在任何等价类里（WHO 表未覆盖，且本仓库未登记）。注意：自由文本（「失眠」「心悸」）'
        + '不经等价类，走 icd11_terms 的 E 级词表直译 —— 那不是等价，只是能查到东西。',
  };
}

const LANG_ALIAS = {
  zh: 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-hans': 'zh-Hans', hans: 'zh-Hans', 简体: 'zh-Hans', 中文: 'zh-Hans',
  'zh-hant': 'zh-Hant', hant: 'zh-Hant', 繁體: 'zh-Hant', 繁体: 'zh-Hant',
  en: 'en', english: 'en', 英文: 'en',
};

/**
 * 等价翻译：给定任一语种形式，返回目标语种的**全部**等价形式（跨候选类合并，带出处）。
 * @param {string} form
 * @param {'zh-Hans'|'zh-Hant'|'en'|'zh'|'en'} toLang
 * @returns {{ hits: object[], candidates: number, ambiguous: boolean, why?: string }}
 */
function translate(form, toLang = 'en', opts = {}) {
  const target = LANG_ALIAS[String(toLang).toLowerCase()] || toLang;
  const r = resolve(form, opts);
  const hits = [];
  const byForm = new Map();
  const isZhInput = /[\u3400-\u9fff]/.test(String(form));
  for (const c of r.candidates) {
    for (const m of c.members) {
      if (m.lang !== target) continue;
      const key = m.lang.startsWith('zh') ? normalizeZh(m.form) : normalizeEn(m.form);
      const prev = byForm.get(key);
      if (prev) {
        // 同一个形式在不同等价类里（同名多义）：合并到一条，把类记全 ——
        // 同一个英文形式出现两遍，读者会以为是两个不同的翻译。
        if (!prev.classes.includes(c.id)) prev.classes.push(c.id);
        continue;
      }
      const hit = {
        form: m.form, lang: m.lang, strength: m.strength, source: m.source,
        classId: c.id, classes: [c.id], uid: c.uid, label: c.label, tensor: c.tensor,
        // 同语种回译时，原形式本身会出现在结果里 —— 显式标出来，别让人误以为是新信息
        isSelf: key === (isZhInput ? normalizeZh(form) : normalizeEn(form)),
      };
      byForm.set(key, hit);
      hits.push(hit);
    }
  }
  return { hits, candidates: r.candidates.length, ambiguous: r.ambiguous, why: r.why };
}

/**
 * 检索探针：members 里的英文形式 **+ D 级组合探针**（带 derived:true）。
 * 供检索层使用（术语层是英文语料，中文查询要一个英文探针）。
 * @returns {{ probes: {en:string, derived:boolean, strength:string, source?:string}[], why?:string }}
 */
function probes(form, opts = {}) {
  // 发布门：D 级探针分两种质量，**下游只吃 axisClean 的那一批**。
  //   gate='axes'（默认）—— 只放行四轴组合探针（每片都落在官方命名法的轴上，
  //                        且在 472 条官方题名里有同构先例）；
  //   gate='all'        —— 旧行为：词表切词探针也放行（标 derived，供对照实验）。
  // 不放行的不是丢弃：它们进 `referenceOnly`，带上原因，让下游能显示「仅供参考」，
  // 而不是假装不存在 —— 消失的数据比低质量的数据更难查。
  const gate = opts.gate || 'axes';
  const r = resolve(form, opts);
  const out = [];
  const referenceOnly = [];
  const seen = new Set();
  for (const c of r.candidates) {
    for (const m of c.members) {
      if (m.lang !== 'en') continue;
      const k = normalizeEn(m.form);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ en: m.form, derived: false, strength: m.strength, source: m.source, classId: c.id });
    }
    if (c.probe) {
      const k = normalizeEn(c.probe.en);
      if (seen.has(k)) continue;
      seen.add(k);
      const publishable = gate === 'all' || c.probe.axisClean === true;
      const item = {
        en: c.probe.en,
        derived: true,
        strength: 'D',
        classId: c.id,
        source: c.probe.note,
        coverage: c.probe.coverage,
        method: c.probe.method || 'glossary',
        axisClean: c.probe.axisClean === true,
        attested: c.probe.attested || [],
        publishable,
      };
      if (publishable) out.push(item);
      else {
        referenceOnly.push({
          ...item,
          reason: `不在官方命名法的轴上：${(c.probe.uncoveredTokens || []).join('/') || '片段未全部归轴'}`,
        });
      }
    }
  }
  const why = out.length ? undefined
    : (referenceOnly.length
      ? `只有「仅供参考」的探针（${referenceOnly.map((x) => x.en).join(' | ')}），已按发布门挡住`
      : (r.why || '该类没有英文成员，也没有达到覆盖率门槛的组合探针'));
  return { probes: out, referenceOnly, gate, why };
}

/** 两个形式是否落在同一个语义点（同一等价类） */
function sameSemanticPoint(a, b, opts = {}) {
  const A = new Set(resolve(a, opts).candidates.map((c) => c.id));
  return resolve(b, opts).candidates.some((c) => A.has(c.id));
}

/** 张量相似（§10）：同一类必然 S_T=1；跨类给出方向/尺度/色差三个分量 */
function tensorSimilarity(t1, t2) {
  const rad = (d) => (d * Math.PI) / 180;
  const cosD = Math.sin(rad(t1.theta)) * Math.sin(rad(t2.theta))
    + Math.cos(rad(t1.theta)) * Math.cos(rad(t2.theta)) * Math.cos(rad(t1.phi - t2.phi));
  const scale = Math.min(t1.r, t2.r) / Math.max(t1.r, t2.r);
  const hex2rgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(h || ''));
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = hex2rgb(t1.hex);
  const [r2, g2, b2] = hex2rgb(t2.hex);
  const dRgb = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / (Math.sqrt(3) * 255);
  const s = 0.65 * ((cosD + 1) / 2) + 0.15 * scale + 0.2 * (1 - dRgb);
  return { cosDirection: cosD, scale, deltaRgb: dRgb, S_T: s };
}

function stats(file = CLASSES) {
  const ix = load(file);
  const d = ix.data;
  return { ...d.counts, file: path.relative(ROOT, file) };
}

// ── CLI ────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--stats')) {
    const s = stats();
    console.log('═══ 等价映射（查询侧）═══');
    console.log(`  类 ${s.classes} · 成员 ${s.members} · 可翻译 ${s.translatableClasses}/${s.classes} · 多义 ${s.ambiguousForms}`);
    return;
  }
  if (!argv.length) {
    console.log('用法：node scripts/lib_equivalence.js <任一语种的形式>  |  --stats');
    return;
  }
  for (const q of argv) {
    const r = resolve(q);
    console.log(`\n「${q}」→ 候选 ${r.candidates.length} 个${r.ambiguous ? '（同名多义，按上下文择一）' : ''}`);
    if (!r.candidates.length) { console.log(`   ${r.why}`); continue; }
    for (const c of r.candidates) {
      console.log(`  ${c.id} ${c.label}  θ=${c.tensor.theta} φ=${c.tensor.phi} r=${c.tensor.r} ${c.tensor.hex}`);
      for (const m of c.members) console.log(`     [${m.strength}] ${m.lang.padEnd(8)} ${m.form}`);
      if (c.probe) console.log(`     [D] en       ${c.probe.en}  （组合探针，覆盖率 ${c.probe.coverage}）`);
    }
    const t = translate(q, 'en');
    console.log(`  英文等价：${t.hits.filter((h) => !h.isSelf).map((h) => h.form).join(' | ') || '（无）'}`);
    const p = probes(q);
    if (p.probes.length) console.log(`  检索探针：${p.probes.map((x) => `${x.en}${x.derived ? '(D)' : ''}`).join(' | ')}`);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = {
  load, resolve, translate, probes, sameSemanticPoint, tensorSimilarity, stats,
  normalizeZh, normalizeEn, CLASSES,
};
