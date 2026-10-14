#!/usr/bin/env node
/**
 * scripts/build_porting_map.js —— 渲染 PORTING.md（全链路账本）
 *
 * 为什么要有渲染器而不是手写文档：**账本会烂**。
 * 工具链一改（新增脚本、拆分子测试套件），手写的对照表就悄悄过期，而没人会去核对
 * 一张已经"看起来对"的表。所以：`porting-map.json` 是源，本脚本渲染，测试查漂移。
 *
 *   node scripts/build_porting_map.js            # 写出 PORTING.md
 *   node scripts/build_porting_map.js --check    # 只校验是否漂移（CI 用）
 *
 * 与 build_outputs_index.js 同一套做法：**产物不许漂移**。
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'porting-map.json');
const OUT = path.join(ROOT, 'PORTING.md');

const STATUS_CN = {
  ported: '移植',
  extended: '移植+扩写',
  split: '拆分',
  merged: '合并',
  'ported+extended': '移植+扩写',
};

// ── 参考仓库新鲜度：靠浅克隆（只要目录树，不要 blob）────────────────
//
// 为什么不上 API：api.github.com 有 60 次/时限额（实测撞到过），jsdelivr 的
// data 主机在这条网络上超时。**blob-less 浅克隆只要 9 秒**，且给的是权威的树。
// git 需要两项本地参数（不改全局）：safe.directory（本机仓库属旧 SID）与
// http.sslBackend=schannel（本机 git 自带的 CA bundle 读不了）。

function resolveGit() {
  for (const cand of [process.env.HERMES_GIT, 'git', 'J:/Program Files/Git/cmd/git.exe']) {
    if (!cand) continue;
    try {
      execFileSync(cand, ['--version'], { stdio: 'pipe' });
      return cand;
    } catch { /* 试下一个 */ }
  }
  return null;
}

const GIT_ARGS = ['-c', 'safe.directory=*', '-c', 'http.sslBackend=schannel'];

function git(gitExe, args, opts = {}) {
  return execFileSync(gitExe, [...GIT_ARGS, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

/**
 * 量上游：缓存存在就 fetch + 读树，不存在就浅克隆。
 * 返回 {head, headDate, scripts[], topDirs[], measuredAt}；仓库不可达时抛错（**不静默降级**）。
 */
function measureUpstream({ repoUrl, cacheDir, gitExe, quiet = false }) {
  const say = (s) => { if (!quiet) console.log(s); };
  const inRepo = path.join(ROOT, cacheDir);
  if (!fs.existsSync(path.join(inRepo, '.git'))) {
    say(`  ← 浅克隆 ${repoUrl}（只要目录树，不要 blob）`);
    git(gitExe, ['clone', '--depth', '1', '--filter=blob:none', '--no-checkout', repoUrl, inRepo]);
  } else {
    say('  ← fetch 上游最新');
    git(gitExe, ['-C', inRepo, 'fetch', '--depth', '1', 'origin', 'HEAD']);
    git(gitExe, ['-C', inRepo, 'reset', '--soft', 'FETCH_HEAD']);
  }
  // `-r` 递归取**文件**（不含子目录本身）；`-d` 只取**目录**。
  // 踩过：不带 `-r` 拿到的 43 是"顶层条目"（含 agent-machine 这类子目录），
  // 不带 `-d` 拿到的顶层把 README.md 这些**文件**也算成了目录 —— 两个量纲都错。
  const scripts = git(gitExe, ['-C', inRepo, 'ls-tree', '--name-only', '-r', 'HEAD', 'scripts/'])
    .split('\n').filter(Boolean).map((s) => s.replace(/^scripts\//, '')).sort();
  const topDirs = git(gitExe, ['-C', inRepo, 'ls-tree', '--name-only', '-d', 'HEAD'])
    .split('\n').filter(Boolean).map((s) => s.replace(/\/$/, '')).sort();
  const headLine = git(gitExe, ['-C', inRepo, 'log', '-1', '--format=%H|%ad', '--date=short']);
  const [head, headDate] = headLine.split('|');
  return { head, headDate, scripts, topDirs, measuredAt: new Date().toISOString().slice(0, 10) };
}

/** 漂移由 json **派生**（不落库），保证渲染是纯函数、结果确定 */
function computeDrift(map) {
  const up = map.reference.upstream;
  if (!up) return null;
  const snap = new Set(map.reference.inventory.scripts);
  const live = new Set(up.scripts);
  const snapTop = new Set(map.reference.inventory.dirs.map((d) => d.split(' ')[0]));
  return {
    scriptsAdded: up.scripts.filter((s) => !snap.has(s)),
    scriptsRemoved: map.reference.inventory.scripts.filter((s) => !live.has(s)),
    topDirsAdded: up.topDirs.filter((d) => !snapTop.has(d)),
    snapshotAt: map.reference.measuredAt,
    upstreamAt: up.measuredAt,
    upstreamHead: up.head,
    upstreamHeadDate: up.headDate,
  };
}

function render(map) {
  const r = map.reference;
  const L = [];
  L.push('<!-- 本文件由 scripts/build_porting_map.js 从 porting-map.json 渲染，请勿手改。 -->');
  L.push('');
  L.push('# 全链路账本：参考 ai-engineering-from-scratch → 本仓库');
  L.push('');
  L.push('这份文档回答一个问题：**本仓库的哪一块，是从参考项目的哪一块来的，中途改了什么。**');
  L.push('');
  L.push(`参考快照实测路径：\`${r.measuredPath}\`（量于 ${r.measuredAt}）`);
  L.push('');
  L.push(`> ${r.note}`);
  L.push('');
  L.push('**账本不是散文**：本文每个「本仓库」路径与每条 `evidence` 都由 `tests/test_porting_map.js`');
  L.push('在文件系统上验真，本文自身也由渲染器查漂移。参考仓库不在本机时，新鲜度比对跳过，');
  L.push('结构比对不受影响。');
  L.push('');

  // ── 一、参考侧实测清单 ──
  L.push('## 一、参考侧实测清单（不引用记忆，全部现场列目录）');
  L.push('');
  L.push('| 项 | 内容 |');
  L.push('|---|---|');
  L.push(`| scripts/ | ${r.inventory.scripts.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 结构 | ${r.inventory.structure} |`);
  L.push(`| 根文档 | ${r.inventory.rootDocs.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 目录 | ${r.inventory.dirs.map((s) => `\`${s}\``).join(' · ')} |`);
  L.push(`| 运行时 | ${r.inventory.runtime} |`);
  L.push('');
  const d = computeDrift(map);
  if (d) {
    L.push('### 参考侧漂移（新鲜度比对）');
    L.push('');
    L.push(`快照量于 **${d.snapshotAt}**，上游量于 **${d.upstreamAt}**（HEAD \`${d.upstreamHead.slice(0, 7)}\` · ${d.upstreamHeadDate}）。`);
    L.push('');
    L.push(`**上游 \`scripts/\` 有 ${d.scriptsAdded.length + map.reference.inventory.scripts.length - d.scriptsRemoved.length} 个，本仓库据以移植的快照只有 ${map.reference.inventory.scripts.length} 个。**`);
    L.push('');
    if (d.scriptsAdded.length) {
      L.push(`上游新增 ${d.scriptsAdded.length} 个（**未移植，逐一列在这里以免被静默忽略**）：`);
      L.push('');
      L.push(`> ${d.scriptsAdded.map((s) => `\`${s}\``).join(' · ')}`);
      L.push('');
    }
    if (d.scriptsRemoved.length) {
      L.push(`快照里有、上游已删：${d.scriptsRemoved.map((s) => `\`${s}\``).join(' · ')}`);
      L.push('');
    }
    if (d.topDirsAdded.length) {
      L.push(`上游新增顶层目录：${d.topDirsAdded.map((s) => `\`${s}\``).join(' · ')}`);
      L.push('');
    }
    L.push('**这份漂移不是"待办清单"，是事实记账**：参考项目在本仓库换域之后仍在长（上表里 `build_book.py`');
    L.push('对应本仓库独立长出来的 `textbooks/build_book.js`，方向撞上了；其余多数是 i18n / certifications');
    L.push('这类本仓库域内不需要的东西）。要刷新：`npm run porting -- --measure`。');
    L.push('');
  } else {
    L.push('### 参考侧漂移（新鲜度比对）');
    L.push('');
    L.push('**状态：尚未比对。** 跑 `npm run porting -- --measure` 从上游量一次（blob-less 浅克隆，约 9 秒），');
    L.push('把上游 \`scripts/\` 与顶层目录记进账本 —— 否则参考侧新增了什么，本账本**不知道**。');
    L.push('');
  }

  // ── 二、三个不变量 ──
  L.push('## 二、先定的三个不变量（换域时唯一不能动的东西）');
  L.push('');
  L.push('| 不变量 | 参考 | 本仓库 | 为什么是它 |');
  L.push('|---|---|---|---|');
  for (const iv of map.invariants) {
    L.push(`| **${iv.name}** | ${iv.ref} | ${iv.ours} | ${iv.why} |`);
  }
  L.push('');

  // ── 三、结构映射 ──
  L.push('## 三、结构映射');
  L.push('');
  L.push('| 参考 | 本仓库 | 关系 | 说明 |');
  L.push('|---|---|---|---|');
  for (const s of map.structure) {
    L.push(`| ${s.ref} | ${s.ours} | ${s.relation} | ${s.note} |`);
  }
  L.push('');

  // ── 四、工具链映射 ──
  L.push('## 四、工具链映射（逐个脚本）');
  L.push('');
  L.push('| 参考 | 本仓库 | 状态 | 守它的测试 |');
  L.push('|---|---|---|---|');
  for (const t of map.toolchain) {
    const ours = t.ours.map((o) => `\`${o}\``).join('<br>');
    L.push(`| \`${t.ref}\` | ${ours} | ${STATUS_CN[t.status] || t.status} | ${t.evidence ? `\`${t.evidence}\`` : '—'} |`);
  }
  L.push('');
  L.push('### 逐条说明');
  L.push('');
  for (const t of map.toolchain) {
    L.push(`**\`${t.ref}\` → ${t.ours.map((o) => `\`${o}\``).join(' + ')}**（${STATUS_CN[t.status] || t.status}）`);
    L.push('');
    L.push(t.note);
    L.push('');
  }

  // ── 五、未移植 ──
  L.push('## 五、未移植的（**显式记账，不是遗忘**）');
  L.push('');
  L.push('| 参考 | 为什么没要 |');
  L.push('|---|---|');
  for (const d of map.dropped) L.push(`| \`${d.ref}\` | ${d.why} |`);
  L.push('');

  // ── 六、本仓库新增 ──
  L.push('## 六、本仓库新增（参考里没有对应物）');
  L.push('');
  L.push(`共 ${map.ourAdditions.length} 个。换域之后必然长出来的东西 —— 参考是 AI 工程课，`);
  L.push('本仓库是中医药教育体系，源材料是 xlsx/docx、交付物是平台与教材，工具链自然会分叉。');
  L.push('');
  L.push('| 路径 | 为什么 |');
  L.push('|---|---|');
  for (const a of map.ourAdditions) L.push(`| \`${a.path}\` | ${a.why} |`);
  L.push('');

  // ── 七、质量门 ──
  L.push('## 七、质量门（参考「不能省的四条」+ 本仓库加的一条）');
  L.push('');
  L.push('| 门 | 命令 | 守它的测试 |');
  L.push('|---|---|---|');
  for (const g of map.gates) L.push(`| ${g.name} | \`${g.cmd}\` | \`${g.evidence}\` |`);
  L.push('');
  L.push('`npm run check` 串起前四条；`npm test` 是全套。');
  L.push('');

  // ── 八、怎么用这份账本 ──
  L.push('## 八、怎么用这份账本');
  L.push('');
  L.push('1. **参考项目更新了** → 跑 `tests/test_porting_map.js`：它会把参考 `scripts/` 的现场清单');
  L.push('   与账本里的清单比对，**多出新脚本就报错**（新东西不会被静默忽略）。');
  L.push('2. **本仓库改了工具链** → 改 `porting-map.json` 后跑 `node scripts/build_porting_map.js`，');
  L.push('   再跑测试。删了文件却没改账本，测试会红。');
  L.push('3. **照着参考造第三门课** → 先读 `FORKING.md`（规程），再读这份账本（先例：哪一步实际改了什么、为什么改）。');
  L.push('');
  return `${L.join('\n')}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const measure = argv.includes('--measure');
  const map = JSON.parse(fs.readFileSync(SRC, 'utf8'));

  if (measure) {
    const repoUrl = (argv.includes('--repo') ? argv[argv.indexOf('--repo') + 1] : null) || map.reference.upstreamRepoUrl;
    const cacheDir = (argv.includes('--cache') ? argv[argv.indexOf('--cache') + 1] : null) || map.reference.upstreamCacheDir || '.refcache';
    if (!repoUrl) throw new Error('账本里没有 upstreamRepoUrl，且未给 --repo —— 不知道去量哪个仓库，不猜');
    const gitExe = resolveGit();
    if (!gitExe) throw new Error('找不到 git 可执行文件（试过 PATH 与 J:/Program Files/Git/cmd/git.exe）；设 HERMES_GIT 指定');
    const up = measureUpstream({ repoUrl, cacheDir, gitExe });
    map.reference.upstream = up;
    map.reference.upstreamCacheDir = cacheDir;
    fs.writeFileSync(SRC, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
    const drift = computeDrift(map);
    console.log(`  上游 HEAD ${up.head.slice(0, 7)}（${up.headDate}）· scripts/ ${up.scripts.length} 个`);
    console.log(`  漂移：新增 ${drift.scriptsAdded.length} · 上游已删 ${drift.scriptsRemoved.length} · 新增顶层目录 ${drift.topDirsAdded.length}`);
    console.log(`  → 账本已更新（${path.relative(ROOT, SRC)}）`);
  }

  const md = render(map);
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== md) {
      console.error('✗ PORTING.md 与 porting-map.json 不一致（漂移）。跑 `node scripts/build_porting_map.js` 重生成。');
      process.exit(1);
    }
    console.log('✅ PORTING.md 与账本一致');
    return;
  }
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`  → ${path.relative(ROOT, OUT)}（${md.length} 字符）`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n✗ ${e.message}`); process.exit(1); }
}

module.exports = { render, computeDrift, measureUpstream, resolveGit };
