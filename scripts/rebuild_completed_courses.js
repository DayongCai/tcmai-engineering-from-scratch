#!/usr/bin/env node
/**
 * rebuild_completed_courses.js —— 把「判断层已过门」的课的陈旧成片按顺序补实
 *
 * 为什么要有它：`build_video_batch.js` 有单实例锁（防两批撞同一章），
 * 而全库有 1,791 章是薄稿做的空壳。手工一门一门敲既不安全也记不住进度，
 * 所以把「哪些课已过门 → 按章数从多到少 → 逐门 --stale 重做」固化成一条命令。
 *
 *   node scripts/rebuild_completed_courses.js              # 全部已过门的课
 *   node scripts/rebuild_completed_courses.js --limit-courses 3
 *   node scripts/rebuild_completed_courses.js --dry
 *
 * 每门课的日志：.tmp/rebuild-<dept>-<subject>.log
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes('--dry');
const LIMIT_COURSES = Number(argOf('--limit-courses') || 0) || Infinity;

const LOCK = path.join(ROOT, 'platform', '.video-batch.lock');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** 等另一批跑完再上（锁存在且 PID 活着就等） */
function waitForLock(maxMinutes = 240) {
  const deadline = Date.now() + maxMinutes * 60_000;
  while (fs.existsSync(LOCK) && Date.now() < deadline) {
    const pid = Number(String(fs.readFileSync(LOCK, 'utf8')).trim());
    const probe = spawnSync(process.platform === 'win32' ? 'tasklist' : 'ps',
      process.platform === 'win32' ? ['/FI', `PID eq ${pid}`] : ['-p', String(pid)], { encoding: 'utf8' });
    const alive = process.platform === 'win32'
      ? new RegExp(`\\b${pid}\\b`).test(String(probe.stdout || '')) && !/No tasks/i.test(String(probe.stdout || ''))
      : probe.status === 0;
    if (!alive) break;
    sleep(30_000);
  }
}

// 1) 收集「判断层已过门」的课
const courses = [];
for (const d of fs.readdirSync(path.join(ROOT, 'standards'))) {
  const p = path.join(ROOT, 'standards', d, 'rewrite-plan.json');
  if (!fs.existsSync(p)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  if (j.status !== 'complete') continue;
  courses.push({ id: `${j.dept}/${j.subject}`, slug: d, chapters: (j.chapters || []).length });
}
courses.sort((a, b) => b.chapters - a.chapters);

console.log(`判断层已过门的课：${courses.length} 门 / ${courses.reduce((a, c) => a + c.chapters, 0)} 章`);
for (const c of courses) console.log(`  ${String(c.chapters).padStart(3)} 章  ${c.id}  (${c.slug})`);
if (DRY) process.exit(0);

// 2) 逐门 --stale 重做
const done = [];
let i = 0;
for (const c of courses) {
  if (done.length >= LIMIT_COURSES) break;
  i++;
  waitForLock();
  const logPath = path.join(ROOT, '.tmp', `rebuild-${c.id.replace('/', '-')}.log`);
  console.log(`\n[${i}/${courses.length}] ${c.id}（${c.chapters} 章）→ ${path.relative(ROOT, logPath)}`);
  const batchChapters = Number(argOf('--batch-chapters') || 0);
  const childArgs = [path.join(ROOT, 'scripts', 'build_video_batch.js'), c.id, '--stale'];
  if (batchChapters > 0) childArgs.push('--limit', String(batchChapters));
  const out = fs.openSync(logPath, 'w');
  const r = spawnSync(process.execPath, childArgs,
    { cwd: ROOT, stdio: ['ignore', out, out] });
  fs.closeSync(out);
  const logText = fs.readFileSync(logPath, 'utf8');
  const made = Number((logText.match(/本次成片 (\d+) 章/) || [])[1] || 0);
  const tail = logText.trim().split('\n').slice(-4).join(' | ');
  console.log(`   exit ${r.status} · 本次成片 ${made} 章 · ${tail}`);
  done.push({ id: c.id, status: r.status });
  // 一次调用只推进一门课的这一批：否则第一门课会把整条队列独占几个小时，
  // 后面的课永远排不到（药理学 49 章实测单章 15–20 分钟）。
  if (batchChapters > 0 && made > 0) break;
}
console.log(`\n完成 ${done.length} 门：${done.filter((d) => d.status === 0).length} 成功 / ${done.filter((d) => d.status !== 0).length} 失败`);
