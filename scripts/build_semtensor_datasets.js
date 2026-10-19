#!/usr/bin/env node
/**
 * scripts/build_semtensor_datasets.js — 生成语义张量数据集
 *
 *   node scripts/build_semtensor_datasets.js
 *
 * 输入（源数据，原样入库，不手抄）:
 *   standards/semtensor/datasets/neijing-axiom-text.source.md   内经 162 篇公理文本（含「总纲」规模表）
 *   standards/semtensor/datasets/shl-episodes.source.json       伤寒论底本 28 集目录（含域/θ/φ/u/色/时长）
 *
 * 输出（生成物，入库）:
 *   standards/semtensor/datasets/neijing-domains.json
 *   standards/semtensor/datasets/shanghan-domains.json
 *
 * 为什么要有这一层：域清单与规模数字必须**从源文件解析**，不能手抄 ——
 * 手抄的数字会漂移，而且漂移时没有任何东西会报错。
 *
 * ★ 关于「色」的重要口径说明：
 *   源数据集里的 `色` 是源系统（axis_color.py）产出的。实测 28/28 **无法**用
 *   规范写明的颜色公理从同一组 u 复现（见 standards 的「待裁定项」§14.1）。
 *   因此本生成物同时保留两列：colorSource（源系统的值，原样）与
 *   colorDerived（本仓库按规范公理算出的值），并给出 colorMatch 便于追踪。
 *   本仓库的图与测试一律使用 colorDerived；colorSource 只作对照与溯源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const S = require('../site/semtensor');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'semtensor', 'datasets');

// ── 内经 12 语义域：从公理文本的「总纲」表解析 ─────────────────────────

function parseNeijingDomains() {
  const md = fs.readFileSync(path.join(DIR, 'neijing-axiom-text.source.md'), 'utf8');
  const head = md.slice(0, md.indexOf('## 1.'));
  const rows = head
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').map((c) => c.trim()));

  const domains = [];
  let total = null;
  for (const cells of rows) {
    // | 内序 | 人类生命语义域 | 篇obj | 章obj | 节obj | 字数 | 篇占比 | 来源 |
    if (cells.length < 9) continue;
    const name = cells[2];
    // 「合计」行的内序列是「—」而非数字，必须在数字守卫**之前**判断，
    // 否则会被静默跳过，然后报「未解析到合计行」——症状指向错的地方。
    if (/合计/.test(name)) {
      total = {
        order: null,
        name: name.replace(/\*/g, ''),
        pian: Number(cells[3].replace(/[^0-9]/g, '')),
        zhang: Number(cells[4].replace(/[^0-9]/g, '')),
        jie: Number(cells[5].replace(/[^0-9]/g, '')),
        chars: Number(cells[6].replace(/,/g, '')),
        share: Number(String(cells[7]).replace('%', '')),
        source: cells[8],
      };
      continue;
    }
    const n = Number(cells[1]);
    if (!Number.isFinite(n)) continue;
    domains.push({
      order: n,
      name,
      pian: Number(cells[3]),
      zhang: Number(cells[4]),
      jie: Number(cells[5]),
      chars: Number(cells[6].replace(/,/g, '')),
      share: Number(String(cells[7]).replace('%', '')),
      source: cells[8],
    });
  }
  if (!total) throw new Error('未解析到「合计」行');
  if (domains.length !== 12) throw new Error(`域名数应为 12，实得 ${domains.length}`);
  if (total.pian !== 162) throw new Error(`合计篇数应为 162，实得 ${total.pian}`);
  return { domains, total };
}

/**
 * 内经域的球面映射（本仓库本地约定，非规范原文 —— 规范 §5 的编码公式针对 DSU，
 * 域级数据没有「证据等级/症状密度/桥接完备度」三字段）。
 *
 *   φ（方位角）= 内序均分环位：φ_i = (order − 1) × 30°（12 域 × 30° = 360°，闭合无缝）
 *   θ（仰角，展开度）= 篇占比归一化后映射到 [−90°, +90°]：占比最大的域接近天顶
 *   r（尺度）= 篇占比归一化到 [0.20, 1.00]，与 DSU 的 r 下限一致
 *
 * 这三条写进规范 §14.2，改公式必须同步改这里与规范。
 */
function mapNeijingDomain(d, maxShare) {
  const phi = (d.order - 1) * 30;
  const normShare = d.share / maxShare;                 // 0..1
  const theta = (2 * normShare - 1) * 90;               // −90..+90
  const r = S.clip(0.2 + 0.8 * normShare, 0.2, 1.0);
  return { theta, phi, r };
}

// ── 伤寒六经域：从 28 集目录聚合 ──────────────────────────────────────

function buildShanghan() {
  const src = JSON.parse(fs.readFileSync(path.join(DIR, 'shl-episodes.source.json'), 'utf8'));

  const episodes = src.map((e) => {
    // 源数据用的是「代码口径」：θ = 方位角（−180…180），φ = 仰角。
    // v1.0 规范把 θ 定为仰角、φ 定为方位角，两者字母分工互换 ——
    // 这里显式换算并保留源值，避免以后有人拿两套数直接比。
    const srcTheta = Number(e['θ']);
    const srcPhi = Number(e['φ']);
    const thetaV1 = srcPhi;                       // 仰角
    let phiV1 = srcTheta % 360;                   // 方位角
    if (phiV1 < 0) phiV1 += 360;

    const u = Array.isArray(e.u) ? e.u : S.sphToCart(1, thetaV1, phiV1);
    const derived = S.iotColor(u);
    return {
      code: e.code,
      juan: e['集号'],
      name: e.name,
      domain: e['域'],
      tiao: e['条数'],
      durationSec: e['时长'],
      file: e['文件'],
      // 源口径原样保留（便于与源系统对照）
      source: { theta: srcTheta, phi: srcPhi, u, color: e['色'] },
      // v1.0 口径
      theta: thetaV1,
      phi: phiV1,
      r: S.clip(Number(e['密度']) || 1, 0.05, 1),
      colorSource: e['色'],
      colorDerived: S.hexFromRgb01(derived),
      colorMatch: S.hexFromRgb01(derived) === e['色'],
    };
  });

  // 域聚合：方向加权平均（权重=条数），r 取平均值，颜色由聚合方向重算
  const byDomain = new Map();
  for (const ep of episodes) {
    if (!byDomain.has(ep.domain)) byDomain.set(ep.domain, []);
    byDomain.get(ep.domain).push(ep);
  }

  const domains = [...byDomain.entries()].map(([name, eps], i) => {
    const agg = S.aggregate(
      eps.map((e) => ({ theta: e.theta, phi: e.phi, r: e.r })),
      eps.map((e) => e.tiao || 1)
    );
    const secs = eps.reduce((a, e) => a + (e.durationSec || 0), 0);
    const tiao = eps.reduce((a, e) => a + (e.tiao || 0), 0);
    return {
      order: i + 1,
      name,
      episodes: eps.map((e) => e.juan),
      pianLike: eps.length,
      tiao,
      durationSec: Number(secs.toFixed(2)),
      theta: agg.theta,
      phi: agg.phi,
      r: agg.r,
      u: agg.u,
      colorDerived: S.hexFromRgb01(agg.rgb),
      colorAggregateNote: '颜色由聚合方向重算（规范 §10 域聚合）',
    };
  });

  return { episodes, domains };
}

// ── 源实现的 116 个真实语义单元 ───────────────────────────────────────
// 来源：standards/semtensor/sources/*.html（源实现交付物，原样入库）
// 103 个病证单元（DSU）+ 13 个域级节点（六经域 6 / 四系统 4 / 精气神 3）。
// 这是**真实数据**，比任何自造的映射都可信 —— 所以站点默认用它。

// label 修正层：reference-units.json 是生成物（源是 sources/*.html 的 DATA.units），
// 对 label 的修正不能直接改生成结果 —— 下次 build 会被覆盖。修正写在 datasets/label-repairs.json，
// 这里在解析后套用；from 必须逐字命中，命中不了就报错（宁可炸，不要静默改错名）。
function applyLabelRepairs(units) {
  const p = path.join(ROOT, 'standards', 'semtensor', 'datasets', 'label-repairs.json');
  if (!fs.existsSync(p)) return { units, applied: [] };
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const applied = [];
  for (const r of doc.entries || []) {
    const u = units.find((x) => x.uid === r.uid);
    if (!u) throw new Error(`label-repairs: uid ${r.uid} 不在源数据里`);
    if (u.label !== r.from) throw new Error(`label-repairs: ${r.uid} 源 label 不等于 from（源「${u.label}」≠ from「${r.from}」）`);
    u.label = r.to;
    u.labelRepairedFrom = r.from;
    applied.push(`${r.uid} ${r.from} → ${r.to}`);
  }
  return { units, applied };
}

function parseReferenceUnits() {
  const srcDir = path.join(ROOT, 'standards', 'semtensor', 'sources');
  if (!fs.existsSync(srcDir)) return null;
  const htmlFile = fs.readdirSync(srcDir).find((f) => f.endsWith('.html'));
  if (!htmlFile) return null;
  const html = fs.readFileSync(path.join(srcDir, htmlFile), 'utf8');
  const m = html.match(/const DATA = (\{[\s\S]*?\});\s*\n/);
  if (!m) return null;
  const DATA = JSON.parse(m[1]);

  const units = (DATA.units || []).filter((u) => Number.isFinite(u.x)).map((u) => {
    const u_ = S.sphToCart(1, u.theta_deg, u.phi_deg);
    return {
      uid: u.uid,
      label: u.label,
      kind: u.kind,
      x: u.x, y: u.y, z: u.z,
      theta: u.theta_deg,
      phi: u.phi_deg,
      r: u.r,
      u: u_,
      colorSourceHex: u.hex,
      colorDerived: S.compHex(u.x, u.y, u.z),
      colorMatch: S.compHex(u.x, u.y, u.z) === u.hex,
      meta: u.meta,
    };
  });

  const repaired = applyLabelRepairs(units);

  return {
    sourceFile: `standards/semtensor/sources/${htmlFile}`,
    labelRepairs: repaired.applied,
    convention: 'v1.0-elevation（源数据已是该口径：θ=仰角、φ=方位角）',
    colorNote:
      'colorSourceHex 为源系统（Python 编码器）产出的 hex；colorDerived 为按规范公理算出的值。' +
      '实测二者仅 2/116 一致（只在 |v|=1 的单轴点上），且源实现自身的 JS comp() 也不复现该 hex —— ' +
      '见规范 §14.1 与 scripts/verify_semtensor_axiom.js。',
    params: DATA.params,
    spheres: DATA.spheres,
    mirror: DATA.mirror,
    ruling: DATA.ruling,
    unitCount: units.length,
    byKind: units.reduce((a, u) => { a[u.kind] = (a[u.kind] || 0) + 1; return a; }, {}),
    units,
  };
}

// ── 主流程 ────────────────────────────────────────────────────────────

const { domains: njRaw, total: njTotal } = parseNeijingDomains();
const maxShare = Math.max(...njRaw.map((d) => d.share));

const neijing = {
  generatedBy: 'scripts/build_semtensor_datasets.js',
  source: 'standards/semtensor/datasets/neijing-axiom-text.source.md（《黄帝内经》162 篇公理文本「总纲」表）',
  convention: 'v1.0-elevation（θ = 仰角，φ = 方位角）',
  mapping: {
    phi: 'φ (方位角) = (内序 − 1) × 30°；12 域 × 30° = 360° 闭合',
    theta: 'θ (仰角，展开度) = (2 × 篇占比/最大篇占比 − 1) × 90°',
    r: 'r (尺度) = clip(0.20 + 0.80 × 篇占比/最大篇占比, 0.20, 1.00)',
    note: '本映射是本仓库的域级本地约定，非规范 §5 的 DSU 编码公式（域级数据没有证据等级/症状密度/桥接完备度三字段）。见规范 §14.2。',
  },
  totals: njTotal,
  domains: njRaw.map((d) => {
    const m = mapNeijingDomain(d, maxShare);
    const u = S.sphToCart(1, m.theta, m.phi);
    return {
      ...d,
      theta: m.theta,
      phi: m.phi,
      r: m.r,
      u,
      colorDerived: S.compHex(...u),
    };
  }),
};

const sh = buildShanghan();
const ref = parseReferenceUnits();

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'neijing-domains.json'), `${JSON.stringify(neijing, null, 2)}\n`, 'utf8');
if (ref) {
  fs.writeFileSync(path.join(DIR, 'reference-units.json'), `${JSON.stringify({
    generatedBy: 'scripts/build_semtensor_datasets.js',
    ...ref,
  }, null, 2)}\n`, 'utf8');
}
fs.writeFileSync(
  path.join(DIR, 'shanghan-domains.json'),
  `${JSON.stringify({
    generatedBy: 'scripts/build_semtensor_datasets.js',
    source: 'standards/semtensor/datasets/shl-episodes.source.json（伤寒论底本 28 集目录）',
    convention: 'v1.0-elevation；源数据为代码口径（θ=方位角/φ=仰角），已显式换算并保留 source 字段',
    colorNote: 'colorSource 为源系统值，colorDerived 为本仓库按规范公理算出的值；实测二者 28/28 不一致，见规范 §14.1（待裁定项）',
    ...sh,
  }, null, 2)}\n`,
  'utf8'
);

// ── 报告 ──────────────────────────────────────────────────────────────

const njOk = neijing.domains.every((d) => d.theta >= -90 && d.theta <= 90 && d.phi >= 0 && d.phi < 360 && d.r > 0 && d.r <= 1);
const matched = sh.episodes.filter((e) => e.colorMatch).length;

console.log('═══ 语义张量数据集 ═══\n');
console.log(`  内经语义域   ${neijing.domains.length} 域 · 篇 ${njTotal.pian} · 章 ${njTotal.zhang} · 节 ${njTotal.jie} · ${njTotal.chars} 字`);
console.log(`  值域检查     ${njOk ? '✅ 全部落在 θ∈[−90,90] · φ∈[0,360) · r∈(0,1]' : '✗ 有越界'}`);
console.log(`  伤寒经域     ${sh.domains.length} 域 · ${sh.episodes.length} 集 · 总时长 ${(sh.episodes.reduce((a, e) => a + (e.durationSec || 0), 0) / 60).toFixed(0)} 分钟`);
console.log(`  色复现情况   ${matched}/${sh.episodes.length} 与源系统一致 → ${matched === 0 ? '⚠ 规范公理无法复现源色，已列为待裁定项（§14.1）' : ''}`);
if (ref) {
  const refMatched = ref.units.filter((x) => x.colorMatch).length;
  console.log(`  源实现单元   ${ref.unitCount} 个（${Object.entries(ref.byKind).map(([k, v]) => `${k}×${v}`).join(' · ')}）`);
  console.log(`               色复现 ${refMatched}/${ref.unitCount} → ${refMatched < ref.unitCount ? '⚠ 源实现自身也不自洽，见 §14.1' : ''}`);
}
console.log('');
for (const d of neijing.domains) {
  console.log(`    ${String(d.order).padStart(2)}. ${d.name.padEnd(12)} 篇${String(d.pian).padStart(2)} 章${String(d.zhang).padStart(3)}  θ${d.theta.toFixed(1).padStart(6)}° φ${String(d.phi).padStart(3)}° r${d.r.toFixed(2)}  ${d.colorDerived}`);
}
console.log('');
console.log('  → standards/semtensor/datasets/neijing-domains.json');
console.log('  → standards/semtensor/datasets/shanghan-domains.json');
