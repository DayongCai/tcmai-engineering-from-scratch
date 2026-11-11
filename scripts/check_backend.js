#!/usr/bin/env node
/**
 * scripts/check_backend.js —— 后台支撑体检（一次性把「跑得起来吗」量出来）
 *
 * 为什么要有它:
 *   项目的后台面已经不止「本机 Node 跑个脚本」——还有 ASR 批处理（Python + 模型）、
 *   视频六段流水线（ffmpeg / 无头浏览器 / TTS）、上游漂移与证候检索的定时任务
 *   （Hermes cron）、以及三个外部数据源（WHO ICD-11 / B站 / GitHub）。
 *   这些东西散在 scripts/ platform/ 与 hermes-home/scripts/ 三处，
 *   任何一处缺件都表现为「某个任务默默失败」，而不是报错。
 *
 * 判据:
 *   · 必需项缺失 → 退出码 1
 *   · 可降级项（pandoc）缺失 → 只提示，不影响退出码
 *   · 不联网、不写文件：只读探测；网络与定时任务的活体状态由 cron 与 check_links 各自负责
 *
 * 用法: node scripts/check_backend.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const T = require('../platform/pipeline/find_tools.js');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const okMark = (b) => (b ? '✅' : '✗');

const rows = [];
const missing = [];
const degraded = [];
function row(kind, name, detail, status) {
  rows.push({ kind, name, detail, status });
  if (status === 'missing') missing.push(`${kind}/${name}`);
  if (status === 'degraded') degraded.push(`${kind}/${name}`);
}

// ── 1. 宿主运行时 ────────────────────────────────────────────────
function cmd(exe, args) {
  const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 20000 });
  return r.status === 0 ? String(r.stdout || '').trim().split(/\r?\n/)[0] : null;
}
function havePython() {
  for (const exe of ['python', 'python3']) {
    const v = cmd(exe, ['-c', 'import sys;print(sys.version.split()[0])']);
    if (v) return { exe, version: v };
  }
  return null;
}

const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
row('运行时', 'Node', `v${process.versions.node}（engines >=20）`, nodeOk ? 'ok' : 'missing');
const npmV = cmd(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['-v'])
  || (spawnSync('npm', ['-v'], { encoding: 'utf8', shell: true, timeout: 20000 }).stdout || '').trim().split(/\r?\n/)[0];
row('运行时', 'npm', npmV ? `v${npmV}` : '不可用', npmV ? 'ok' : 'degraded');

const py = havePython();
row('运行时', 'Python', py ? `${py.exe} · ${py.version}` : '不可用（ASR 与脚本校验会用不了）', py ? 'ok' : 'missing');

// ── 2. 零第三方依赖契约 ──────────────────────────────────────────
// 仓库刻意不用 npm 依赖：可复现性优先。这里扫一遍 require，任何非相对、非 node: 的模块名都是违约。
function scanRequires(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { scanRequires(p, acc); continue; }
    if (!/\.(js|mjs|cjs)$/.test(e.name)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/require\((['"])([^'"]+)\1\)/g)) {
      const spec = m[2];
      if (spec.startsWith('.') || spec.startsWith('node:')) continue;
      acc.push(`${path.relative(ROOT, p)} → ${spec}`);
    }
  }
  return acc;
}
const thirdParty = [];
const BUILTIN = new Set(require('node:module').builtinModules);
for (const d of ['scripts', 'platform/pipeline', 'site', 'tests']) {
  if (!fs.existsSync(P(d))) continue;
  for (const hit of scanRequires(P(d), [])) {
    const spec = hit.split('→').pop().trim();
    if (!BUILTIN.has(spec.replace(/^node:/, ''))) thirdParty.push(hit);
  }
}
row('Node 依赖', '第三方模块', thirdParty.length ? thirdParty.slice(0, 3).join(' · ') : '0 个（全部 node: 内置或相对路径）',
  thirdParty.length ? 'missing' : 'ok');

// ── 3. Python 依赖（ASR 链）──────────────────────────────────────
const PY_MODULES = ['faster_whisper', 'ctranslate2', 'numpy', 'onnxruntime', 'tokenizers', 'huggingface_hub'];
if (py) {
  const code = 'import importlib.metadata as m\n'
    + `for p in ${JSON.stringify(PY_MODULES)}:\n`
    + '    try: print(p+"="+m.version(p.replace("_","-")))\n'
    + '    except Exception: print(p+"=")';
  const out = cmd(py.exe, ['-c', code]) || '';
  // cmd() 只取首行，这里要全部：重取一次
  const r = spawnSync(py.exe, ['-c', code], { encoding: 'utf8', timeout: 60000 });
  const got = String(r.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  const bad = got.filter((l) => l.endsWith('='));
  row('Python 包', 'ASR 链', got.map((l) => (l.endsWith('=') ? `${l.slice(0, -1)} ✗` : l)).join(' · ') || out || '探测失败',
    bad.length === 0 ? 'ok' : 'missing');
} else {
  row('Python 包', 'ASR 链', 'Python 不可用，无法探测', 'missing');
}

// ── 4. Whisper 模型 ─────────────────────────────────────────────
const modelRoot = path.join(process.env.TEMP || os.tmpdir(), 'models');
const models = fs.existsSync(modelRoot)
  ? fs.readdirSync(modelRoot).filter((d) => d.startsWith('faster-whisper-'))
  : [];
function dirSize(p) {
  let n = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const q = path.join(p, e.name);
    try { n += e.isDirectory() ? dirSize(q) : fs.statSync(q).size; } catch { /* 跳过 */ }
  }
  return n;
}
const turbo = path.join(modelRoot, 'faster-whisper-turbo');
row('ASR 模型', 'faster-whisper-turbo', fs.existsSync(turbo)
  ? `${(dirSize(turbo) / 1024 ** 3).toFixed(1)} GB · 同级 ${models.length} 个模型`
  : `缺失（${modelRoot}）`, fs.existsSync(turbo) ? 'ok' : 'missing');

// ── 5. 外部二进制 ───────────────────────────────────────────────
const ff = T.findFfmpeg();
const fp = T.findFfprobe();
row('外部工具', 'ffmpeg', ff || '缺失（视频流水线第 4 段）', ff ? 'ok' : 'missing');
row('外部工具', 'ffprobe', fp || '缺失（时长探测）', fp ? 'ok' : 'missing');
const br = T.findBrowser();
row('外部工具', '无头浏览器', br || '缺失（Edge/Chrome，画面帧导出）', br ? 'ok' : 'missing');
const tts = T.findTtsBackend();
row('外部工具', 'TTS', tts.path ? `${tts.kind} · ${tts.label}` : tts.label, tts.path ? 'ok' : 'missing');
const pandoc = T.findPandoc();
row('外部工具', 'pandoc', pandoc || '缺失（仅 [textbooks] PDF/EPUB 排版，可降级）', pandoc ? 'ok' : 'degraded');
const git = T.onPath('git') || (fs.existsSync('J:/Program Files/Git/cmd/git.exe') ? 'J:/Program Files/Git/cmd/git.exe' : null);
row('外部工具', 'git', git || '缺失（上游漂移 / 账本实测）', git ? 'ok' : 'missing');

// ── 6. 后台入口（本仓库侧）──────────────────────────────────────
const ENTRIES = [
  ['ASR 批处理', 'scripts/asr/run_all.sh'],
  ['ASR 取音频', 'scripts/asr/fetch_audio.sh'],
  ['ASR 转写', 'scripts/asr/transcribe.py'],
  ['视频流水线探测', 'platform/pipeline/check_tools.js'],
  ['上游漂移哨兵', 'scripts/check_upstream_drift.js'],
  ['定时任务包装', 'scripts/cron_upstream_drift.sh'],
  ['证候 API CLI', 'scripts/tcm_api.js'],
  ['外部证据队列', 'scripts/external_batch.js'],
];
for (const [name, rel] of ENTRIES) {
  row('后台入口', name, rel + (fs.existsSync(P(rel)) ? '' : '（文件不存在）'), fs.existsSync(P(rel)) ? 'ok' : 'missing');
}

// ── 7. Hermes 侧定时脚本（存在即报；换机器没有也正常）────────────
const hermesScripts = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
  'Hermes Agent CN Desktop', 'data', 'hermes-home', 'scripts');
for (const f of ['upstream_drift.py', 'asr_resume.py']) {
  const p = path.join(hermesScripts, f);
  if (fs.existsSync(p)) row('定时脚本', f, '已就位（cron no_agent）', 'ok');
  else row('定时脚本', f, `未安装（${hermesScripts}）—— 换机器后需重装`, 'degraded');
}

// ── 8. 外部数据缓存 ─────────────────────────────────────────────
const icd = P('data/icd11/entities.ndjson');
if (fs.existsSync(icd)) {
  const n = fs.readFileSync(icd, 'utf8').split('\n').filter(Boolean).length;
  row('数据缓存', 'ICD-11 本地库', `${n} 实体 · ${(fs.statSync(icd).size / 1024 ** 2).toFixed(0)} MB`, 'ok');
} else {
  row('数据缓存', 'ICD-11 本地库', '缺失（npm run icd11:ensure 可取）', 'degraded');
}

// ── 输出 ────────────────────────────────────────────────────────
console.log('═══ 后台支撑体检 ═══\n');
let lastKind = null;
for (const r of rows) {
  if (r.kind !== lastKind) { console.log(`\n【${r.kind}】`); lastKind = r.kind; }
  const mark = r.status === 'ok' ? '✅' : r.status === 'degraded' ? '⬚ ' : '✗ ';
  console.log(`  ${mark} ${r.name.padEnd(16, ' ')} ${r.detail}`);
}
console.log('\n─── 结论 ───');
if (missing.length) {
  console.log(`  ✗ 必需项缺失 ${missing.length} 项：${missing.join('、')}`);
} else {
  console.log('  ✅ 必需项齐备：构建、校验、ASR、视频流水线均可执行');
}
if (degraded.length) console.log(`  ⬚ 降级项 ${degraded.length} 项：${degraded.join('、')}`);
process.exit(missing.length ? 1 : 0);
