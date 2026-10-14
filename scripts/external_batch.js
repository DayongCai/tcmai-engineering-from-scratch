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

function queryFor(label) {
  // 去掉证名里的括注（如「膀胱湿热证（热淋）」→ 膀胱湿热证），检索更干净
  const base = label.replace(/[（(][^）)]*[）)]/g, '').trim();
  return `${base} 中医病证名 病因病机 主症 舌象 脉象 治法`;
}

function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);

  const { all, pending: todo, have } = pending();

  if (argv.includes('--status')) {
    console.log('═══ 外部证据队列 ═══\n');
    console.log(`  证名总数 ${all.length} · 已有外部证据 ${have.size} · 待检索 ${todo.length}`);
    console.log(`  下一批（前 8）: ${todo.slice(0, 8).join('、')}`);
    return;
  }

  if (argv.includes('--next')) {
    const n = Number(val('-n', '8'));
    const batch = todo.slice(0, n);
    if (!batch.length) { console.log('队列已空'); return; }
    // 输出可直接喂给检索的 JSON（每项一条独立查询）
    console.log(JSON.stringify(batch.map((label) => ({ label, query: queryFor(label) })), null, 2));
    return;
  }

  if (argv.includes('--import')) {
    const f = val('--import');
    const incoming = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'));
    const ext = loadExt();
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
    return;
  }

  console.log('用法: --status | --next [-n N] | --import <file.json>');
}

if (require.main === module) main();

module.exports = { allLabels, queryFor, EXT };
