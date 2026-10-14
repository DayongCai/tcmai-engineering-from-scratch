#!/usr/bin/env node
/**
 * scripts/check_upstream_drift.js —— 上游漂移哨兵（供定时任务用）
 *
 * 干什么：量一次参考项目（blob-less 浅克隆，约 9 秒），与账本
 * `porting-map.json` 里记的上游清单比。**有变化才说话，没变化一个字都不输出。**
 *
 * 为什么是独立脚本而不是塞进「证候外部证据」那个定时任务：
 * 那个任务在队列空时会回 `[SILENT]`（设计如此）—— 把上游漂移挂在它里面，
 * **一旦检索任务结束，漂移哨兵就跟着静音了**。两件事的生死不该绑在一起。
 *
 * 为什么"没变化就静默"：这是看门狗模式。每 8 小时报一次"上游没变"是噪音，
 * 会让人把通知关掉；只在**真的变了**的时候响，才有人看。
 *
 * **它不改仓库**：clone/fetch 只写 gitignore 掉的 `.refcache/`；
 * 账本与 PORTING.md 要人跑 `npm run porting -- --measure` 才更新（改动由人过目）。
 *
 * 用法：
 *   node scripts/check_upstream_drift.js            # 哨兵模式：有变化才输出
 *   node scripts/check_upstream_drift.js --verbose  # 无论有没有变化都说明情况（手动查）
 */

const fs = require('node:fs');
const path = require('node:path');
const B = require('./build_porting_map.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'porting-map.json');

/**
 * 纯函数：比出漂移。抽出来是为了能**在不联网的情况下单测**
 * （网络是不可控输入，逻辑不该跟它绑在一起）。
 */
function drift(recorded, live) {
  const rec = new Set(recorded);
  const lv = new Set(live);
  return {
    scriptsAdded: live.filter((s) => !rec.has(s)),
    scriptsRemoved: recorded.filter((s) => !lv.has(s)),
  };
}

/**
 * 纯函数：**决定说还是不说**。
 * 返回 '' 表示静默（上游无变化 → 定时任务不发送任何东西）。
 * 静默契约单独可测 —— 否则它只是注释里的一句承诺。
 */
function render(recorded, live) {
  const d = drift(recorded.scripts, live.scripts);
  const changed = live.head !== recorded.head || d.scriptsAdded.length || d.scriptsRemoved.length;
  if (!changed) return '';
  const L = [];
  L.push('上游参考项目有变化（与账本记的快照比）');
  L.push('');
  L.push(`HEAD ${recorded.head.slice(0, 7)}（${recorded.headDate}）→ ${live.head.slice(0, 7)}（${live.headDate}）`);
  L.push(`scripts/ ${recorded.scripts.length} → ${live.scripts.length} 个`);
  if (d.scriptsAdded.length) L.push(`新增：${d.scriptsAdded.map((s) => `\`${s}\``).join(' · ')}`);
  if (d.scriptsRemoved.length) L.push(`上游已删：${d.scriptsRemoved.map((s) => `\`${s}\``).join(' · ')}`);
  L.push('');
  L.push('要吸收进账本：`npm run porting -- --measure`（随后 PORTING.md 的「参考侧漂移」段会更新，改动由你过目）');
  return L.join('\n');
}

/**
 * 跑一次哨兵，**返回要输出的字符串**（'' = 静默）。
 * 抽成函数是为了能在测试里注入假的测量结果 —— **整条路径**（含测量环节）都可测。
 * 踩过的坑：只测纯函数 render 时，测量环节自己 `console.log` 漏出来的
 * 「← fetch 上游最新」没被发现，而定时任务会把脚本 stdout **原样发出** ——
 * 那等于每 8 小时发一条噪音。所以这里连 quiet 一起管住。
 */
function run({ measure, verbose = false }) {
  const map = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const recorded = map.reference.upstream;
  if (!recorded || !recorded.scripts) {
    return '⚠ 上游漂移哨兵无法工作：账本里没有 reference.upstream（先跑 npm run porting -- --measure）';
  }
  const gitExe = B.resolveGit();
  if (!gitExe) return '⚠ 上游漂移哨兵无法工作：找不到 git（设 HERMES_GIT 或装 git）';

  let live;
  try {
    live = measure({ map, gitExe });
  } catch (e) {
    // 量不动就说出来。**一个跑不起来的哨兵必须响**，否则"没消息"会被误读成"没变化"。
    return `⚠ 上游漂移哨兵本次未能量取上游：${String(e.message).split('\n')[0]}`;
  }
  const out = render(recorded, live);
  if (!out && verbose) return `（静默：上游无变化 · HEAD ${live.head.slice(0, 7)} · scripts/ ${live.scripts.length} 个）`;
  return out;
}

function realMeasure({ map, gitExe }) {
  return B.measureUpstream({
    repoUrl: map.reference.upstreamRepoUrl,
    cacheDir: map.reference.upstreamCacheDir || '.refcache',
    gitExe,
    quiet: true,   // **哨兵的 stdout 会被原样发出**，所以测量过程一句话都不许说
  });
}

function main() {
  const verbose = process.argv.includes('--verbose');
  const out = run({ measure: realMeasure, verbose });
  if (out) console.log(out);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`✗ 上游漂移哨兵出错：${e.message}`); process.exit(1); }
}

module.exports = { drift, render, run };
