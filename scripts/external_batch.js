#!/usr/bin/env node
/**
 * scripts/external_batch.js —— 证候外部证据的**分批**取用与入库
 *
 * 为什么需要它：外部检索只能走 web_search（逐条、有界），而 96 个证名要分很多轮。
 * 一个"队列 + 幂等入库"的机制比手工维护 external.json 可靠：
 *   · `--next -n 8`  给出**下一批**待检索的证名与现成查询串
 *   · `--import f`   把取回的结果**幂等**并入 external.json（按 label 去重）
 *   · `--status`     还差多少
 *
 * **这个脚本不联网。** 检索由调用方（人或定时任务）执行，取回的原文按片段交给 --import。
 * 这样：① 每一轮的产出可复核；② 失败就是失败，不会被脚本"补"成一条记录。
 *
 * 用法：
 *   node scripts/external_batch.js --status
 *   node scripts/external_batch.js --next -n 8
 *   node scripts/external_batch.js --import batch.json
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const api = require('./tcm_api.js');
const { classify } = require('./lib_evidence_scope.js');   // 证据分级口径（唯一判定处）

// ── 运行租约 ────────────────────────────────────────────────────────
// 为什么要它：同一个 job 会被并发跑（第 11–14 批实测：05:48 与 08:03 两条提交、
// 12:42 与 16:02 两条提交，其中两条不在调度时间点上 —— 同日多会话各取了一批）。
// 两个运行同时 --next 会**检索同一批**、再各自 --import，白烧检索还互相覆盖文件。
// 租约只解决"重复取批"，不替代 --import 的写指纹校验（那个防的是写冲突）。
const LEASE = process.env.EXTERNAL_BATCH_LEASE === 'off'
  ? null
  : (process.env.EXTERNAL_BATCH_LEASE || path.join(ROOT, '.cache', 'external_batch.lease.json'));
const LEASE_TTL_MS = Number(process.env.EXTERNAL_BATCH_LEASE_TTL_MS || 45 * 60 * 1000);

function readLease() {
  if (!LEASE) return null;
  try { return JSON.parse(fs.readFileSync(LEASE, 'utf8')); } catch { return null; }
}

/**
 * 租约是否仍然有效：**只看时间，不看 PID**。
 *
 * 为什么不能看 PID：`--next` 一返回进程就退出了，而"取批 → 检索 → 入库"是跨多个进程的一段时间
 * （在一个 agent 会话里）。按 PID 存活判断，第二个运行永远会被判成"持租进程已死"而直接接管 ——
 * 实测就是这样失效的。所以租约由 TTL 兜底：`--import` 写完即释放，`--release` 手工释放，
 * 都没发生就 45 分钟后自动失效。pid 只写进文件供人排查。
 */
function leaseFresh(l) {
  if (!l || !l.startedAt) return false;
  const age = Date.now() - Date.parse(l.startedAt);
  return age >= 0 && age < LEASE_TTL_MS;
}

function writeLease(labels) {
  if (!LEASE) return;
  fs.mkdirSync(path.dirname(LEASE), { recursive: true });
  fs.writeFileSync(LEASE, `${JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    ttlMinutes: Math.round(LEASE_TTL_MS / 60000),
    labels,
  }, null, 2)}\n`, 'utf8');
}

function clearLease() {
  if (!LEASE) return;
  try { fs.unlinkSync(LEASE); } catch { /* 没有就算了 */ }
}

function describeLease(l) {
  const mins = Math.round((Date.now() - Date.parse(l.startedAt)) / 60000);
  return `pid ${l.pid} · ${mins} 分钟前 · 本批 ${(l.labels || []).join('、') || '—'}`;
}

function loadExt() {
  return JSON.parse(fs.readFileSync(EXT, 'utf8'));
}

/** 待检索队列：按证名在合并表中的顺序（确定性），排除已有外部证据的 */
function pending() {
  const ext = loadExt();
  const have = new Set(ext.entries.map((e) => e.label));
  const all = api.makeApi().mergeTable().groups.length
    ? allLabels()
    : [];
  return { all, pending: all.filter((l) => !have.has(l)), have };
}

function allLabels() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const dsu = (Array.isArray(raw) ? raw : raw.units).filter((u) => u.kind === 'dsu');
  return [...new Set(dsu.map((u) => u.label))].sort();
}

/**
 * 证名是**单一** DSU 条目（如 `DSU-00042 真心痛（阳衰血瘀）证`、`DSU-00063 湿热下注、邪留正伤证`），
 * 命名按 ICD-11 标准，不是把两个证名拼起来的合成名 —— 这一点我第 11 批判错过，此处按源数据更正：
 * 源 `standards/semtensor/sources/母子父-三维极坐标语义球面-同步旋转.html` 里它们各是一条
 * `{"uid":"DSU-…","label":"…","kind":"dsu"}`，一个 label 一个 unit，没有任何合并动作。
 *
 * 那为什么整串检索命中率低？因为中文临床文献仍主要按教科书分型用词（心脉瘀阻、阳虚血瘀…），
 * ICD-11 的合称写法在科普/医案里很少逐字出现。所以：
 *   1. 先按整串检（`、` 换成空格，避免搜索引擎当整句短语匹配）；
 *   2. 整串 0 命中时，调用方可按 `、` 拆成**构件**做第二遍检索；
 *   3. 但**入库不降标准**：构件分别命中 ≠ 该证被证实，必须有同一来源/同一病种同时覆盖各构件，
 *      否则记为失败留队。构件检索只用来找证据，不用来改写证名。
 */
function components(base) {
  return String(base).split('、').map((s) => s.trim()).filter(Boolean);
}

/**
 * 检索串。**括注内容不再丢弃，而是并入检索词** —— 这一条是第 3 批实跑踩出来的：
 * 原来 `气滞血瘀证(颈部)` 被削成 `气滞血瘀证`，取回的是通用来源，
 * **颈部特指性证据没取到**，而该 label 一旦入库、队列就不会再查它（沉没）。
 *
 * 括注有两种，**两种都该带上**：
 *   · 同义别名 —— `寒哮证（冷哮）` → 「冷哮」是常用名，带上能多命中
 *   · 部位/病种限定 —— `气滞血瘀证(颈部)`、`心肾不交、阴虚火旺证(不寐)` → 限定词才是区分点
 * 所以不区分两种，一律并入；只把括号符号换成空格，保留词本身。
 */
function queryFor(label) {
  const { base, context } = splitLabel(label);
  // 合成名用空格连接各构件，而不是保留「、」——顿号会让搜索引擎按整串短语匹配。
  const head = [components(base).join(' '), ...context].join(' ');
  return `${head} 中医病证名 病因病机 主症 舌象 脉象 治法`;
}

/** 拆出证名本体与括注限定词（给调用方看，也便于测试） */
function splitLabel(label) {
  const context = (label.match(/[（(]([^）)]*)[）)]/g) || [])
    .map((m) => m.replace(/[（()）]/g, '').trim())
    .filter(Boolean);
  return { base: label.replace(/[（(][^）)]*[）)]/g, '').trim(), context };
}

function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);

  const { all, pending: todo, have } = pending();

  if (argv.includes('--status')) {
    console.log('═══ 外部证据队列 ═══\n');
    console.log(`  证名总数 ${all.length} · 已有外部证据 ${have.size} · 待检索 ${todo.length}`);
    console.log(`  下一批（前 8）: ${todo.slice(0, 8).join('、')}`);
    const held = readLease();
    console.log(`  租约: ${held ? (leaseFresh(held) ? `有效 — ${describeLease(held)}` : `已失效 — ${describeLease(held)}`) : '无'}`);
    return;
  }

  if (argv.includes('--next')) {
    const force = argv.includes('--force');
    const held = readLease();
    if (!force && leaseFresh(held)) {
      // 退出码 3 = "别人正在跑"。定时任务看到它应当**直接收工**，不要再检索、不要 import。
      console.log(`中止：另一个运行持有本批租约（${describeLease(held)}）。`);
      console.log('  两个运行同时取批会重复检索同一批证名，并各自 import —— 白烧检索、互相覆盖。');
      console.log('  确认对方已死：node scripts/external_batch.js --release   强行接管：--next --force');
      process.exit(3);
    }
    if (held && !force) console.log(`（旧租约已失效，接管：${describeLease(held)}）`);
    const n = Number(val('-n', '8'));
    const batch = todo.slice(0, n);
    if (!batch.length) { console.log('队列已空'); return; }
    writeLease(batch.map((b) => b));
    // 输出可直接喂给检索的 JSON（每项一条独立查询）
    // 合成名额外给出 parts：整串 0 命中时，调用方按构件分别检索再判断是否同现。
    console.log(JSON.stringify(batch.map((label) => {
      const parts = components(splitLabel(label).base);
      return parts.length > 1 ? { label, parts, query: queryFor(label) } : { label, query: queryFor(label) };
    }), null, 2));
    return;
  }

  if (argv.includes('--release')) {
    const held = readLease();
    clearLease();
    console.log(held ? `已释放租约（${describeLease(held)}）` : '没有租约');
    return;
  }

  if (argv.includes('--audit')) {
    // 重算全库分级：口径调整过、或早年入库没定级时跑它。**只写 scope/missingParts，不动来源。**
    const ext0 = JSON.parse(fs.readFileSync(EXT, 'utf8'));
    const before = new Map(ext0.entries.map((e) => [e.label, e.scope]));
    const tally = { single: 0, whole: 0, component: 0, partial: 0 };
    const drift = [];
    for (const e of ext0.entries) {
      const r = classify(e);
      if (before.get(e.label) && before.get(e.label) !== r.scope) {
        drift.push(`${e.label}: ${before.get(e.label)} → ${r.scope}`);
      }
      e.scope = r.scope;
      if (r.attestedBy !== null) e.attestedBy = r.attestedBy; else delete e.attestedBy;
      if (r.missing.length) e.missingParts = r.missing; else delete e.missingParts;
      tally[r.scope] += 1;
    }
    fs.writeFileSync(EXT, `${JSON.stringify(ext0, null, 2)}\n`, 'utf8');
    console.log(`分级：单构件 ${tally.single} · 整串级 ${tally.whole} · 构件级 ${tally.component} · 不合格 ${tally.partial}`);
    console.log(`合计 ${ext0.entries.length} · 计入整串覆盖 ${tally.single + tally.whole} · 只计构件覆盖 ${tally.component}`);
    if (drift.length) {
      console.log('本次改判：');
      for (const d of drift) console.log(`  ${d}`);
    }
    return;
  }

  if (argv.includes('--import')) {
    const f = val('--import');
    const incoming = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'));
    // 读入时留指纹：并发跑同一个 job 会各读各写，后写者把先写者的条目**静默抹掉**。
    // 第 11 批实际撞上过一次并发（另一次运行在我检索期间把 28 条推到 61 条）。
    const rawAtLoad = fs.readFileSync(EXT, 'utf8');
    const ext = JSON.parse(rawAtLoad);
    const byLabel = new Map(ext.entries.map((e) => [e.label, e]));
    let added = 0, skipped = 0, empty = 0;
    for (const item of incoming) {
      if (!item || !item.label) continue;
      // **空结果不许入库**：检索失败/没取到内容，就什么都不写。
      // 写一条 sources: [] 会让"没取到"看起来像"取到了但内容为空"。
      if (!Array.isArray(item.sources) || !item.sources.length) { empty += 1; continue; }
      const clean = {
        label: item.label,
        sources: item.sources.filter((s) => s && s.url && s.snippet).map((s) => ({
          type: s.type || '未标注',
          title: s.title || '',
          url: s.url,
          snippet: String(s.snippet).slice(0, 600),
        })),
      };
      if (!clean.sources.length) { empty += 1; continue; }
      if (byLabel.has(item.label)) { skipped += 1; continue; }
      // 入库即定级（口径见 scripts/lib_evidence_scope.js）：
      // 单条来源覆盖全部构件 = 整串级；只有构件分别被覆盖 = 构件级。两级不合并。
      clean.scope = classify({ label: clean.label, sources: clean.sources }).scope;
      ext.entries.push(clean);
      byLabel.set(item.label, clean);
      added += 1;
    }
    ext.entries.sort((a, b) => a.label.localeCompare(b.label));
    const remaining = allLabels().length - ext.entries.length;
    ext.notFetched = {
      why: `分批取用中：已完成 ${ext.entries.length}，余 ${remaining} 待检索`,
      remaining,
      failedThisRun: incoming.filter((i) => i && i.failed).map((i) => i.label),
    };
    ext.channel = ext.channel || 'web_search';
    fs.writeFileSync(EXT, `${JSON.stringify(ext, null, 2)}\n`, 'utf8');
    console.log(`入库：新增 ${added} · 已有跳过 ${skipped} · 空结果丢弃 ${empty}`);
    console.log(`现有 ${ext.entries.length}/${allLabels().length} · 余 ${remaining} 待检索`);
    clearLease();   // 本批已落库，释放租约，让下一个运行能取新批
    return;
  }

  if (argv.includes('--requery')) {
    // 把已入库的证名**退回队列**：删掉它的条目，下次 --next 会再取一次。
    // 为什么需要它：队列按 label 去重，一旦入库就**不会再查**。若当初的检索串有缺陷
    // （第 3 批的括注被削掉），取回的证据就是通用的，而系统不会自己发现 —— 必须能退回。
    const label = val('--requery');
    if (!label) throw new Error('--requery 需要证名：--requery "气滞血瘀证(颈部)"');
    const ext = loadExt();
    const before = ext.entries.length;
    ext.entries = ext.entries.filter((e) => e.label !== label);
    if (ext.entries.length === before) {
      console.log(`未入库：${label}（不在 external.json 里，无需退回）`);
      return;
    }
    fs.writeFileSync(EXT, `${JSON.stringify(ext, null, 2)}\n`, 'utf8');
    console.log(`已退回队列：${label}（${before} → ${ext.entries.length}）—— 下次 --next 会重新检索`);
    return;
  }

  console.log('用法: --status | --next [-n N] [--force] | --import <file.json> | --audit | --release | --requery "<证名>"');
}

if (require.main === module) main();

module.exports = { queryFor, splitLabel, components, allLabels, pending, EXT };
