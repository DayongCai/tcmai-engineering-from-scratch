#!/usr/bin/env node
/**
 * scripts/render_video_queue.js —— 成片队列：逐门课重渲染 + HLS，可断点续跑
 *
 * 为什么要它：2026-11-23 实测，2169 章里有 2021 章（93.2%）的讲稿**没有 body 段**——
 * 正文用「## 一、…」中文序号分节，extract_narration.js 只认七段模板名，这些节被静默丢弃，
 * 成片只有标题/MOTTO/PROBLEM/免责，约 1–2 分钟。补了 narration-map.json 后同一章讲稿
 * 变成 11 段 / 9 分 05 秒。所以「成片已生成」必须按「正文进没进旁白」重算。
 *
 * 单章成本实测（9 分钟成片）：配音 194s + 帧 15s + 合成 85s ≈ 300s。整库 2169 章串行约 180 小时，
 * 因此本脚本按**门**并行（默认 3 路），并落一份进度账，中断后接着跑，不重做已完成的课。
 *
 *   node scripts/render_video_queue.js --dry
 *   node scripts/render_video_queue.js --dept=05-huli --workers=3
 *   node scripts/render_video_queue.js --course=09-jichu/07-shenghua-xue
 *   node scripts/render_video_queue.js --workers=3 --force      # 不看账，全部重跑
 *
 * 判定「这门要不要重做」：任一章满足其一即重做整门——
 *   1) video/lesson.mp4 不存在；
 *   2) lesson.mp4 比 docs/zh.md 旧（正文改过，成片没跟上）；
 *   3) narration/lesson.json 没有 body 段，而正文有 ≥1500 汉字（讲稿是骨架稿）。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const COURSES = path.join(ROOT, 'platform', 'courses');
const DEPTS = path.join(ROOT, 'departments');
const LOG = path.join(ROOT, 'scratch', 'video_queue.log');
const STATE = path.join(ROOT, 'scratch', 'video_queue_state.json');

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const WORKERS = Math.max(1, Number(arg('workers', '3')));
const ONLY_DEPT = arg('dept', '');
const ONLY_COURSE = arg('course', '');

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hz = (s) => (String(s).match(CJK) || []).length;

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { done: {} };
const saveState = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

const log = (line) => {
  const s = `[${new Date().toISOString().slice(11, 19)}] ${line}`;
  console.log(s);
  fs.appendFileSync(LOG, s + '\n');
};

function listCourses() {
  const out = [];
  for (const dept of fs.readdirSync(COURSES).sort()) {
    if (ONLY_DEPT && dept !== ONLY_DEPT) continue;
    const dp = path.join(COURSES, dept);
    if (!fs.statSync(dp).isDirectory()) continue;
    for (const subject of fs.readdirSync(dp).sort()) {
      const id = `${dept}/${subject}`;
      if (ONLY_COURSE && id !== ONLY_COURSE) continue;
      if (fs.statSync(path.join(dp, subject)).isDirectory()) out.push(id);
    }
  }
  return out;
}

/** 这门课要不要重做；返回原因列表（空数组=不用做） */
function whyCourse(id) {
  const [dept, subject] = id.split('/');
  const cdir = path.join(COURSES, dept, subject);
  const ddir = path.join(DEPTS, dept, subject, 'chapters');
  if (!fs.existsSync(ddir)) return ['缺 departments 章目录'];
  const chapters = fs.readdirSync(cdir).filter((c) => fs.statSync(path.join(cdir, c)).isDirectory());
  const reasons = [];
  for (const c of chapters) {
    const mp4 = path.join(cdir, c, 'video', 'lesson.mp4');
    const doc = path.join(ddir, c, 'docs', 'zh.md');
    const lesson = path.join(cdir, c, 'narration', 'lesson.json');
    if (!fs.existsSync(mp4)) { reasons.push(`${c}: 缺成片`); continue; }
    let docHz = 0;
    if (fs.existsSync(doc)) docHz = hz(fs.readFileSync(doc, 'utf8'));
    if (fs.existsSync(doc) && fs.statSync(doc).mtimeMs > fs.statSync(mp4).mtimeMs) reasons.push(`${c}: 成片旧于正文`);
    if (docHz >= 1500) {
      let body = 0;
      if (fs.existsSync(lesson)) {
        try {
          const j = JSON.parse(fs.readFileSync(lesson, 'utf8'));
          body = (j.segments || []).filter((s) => s.role === 'body').length;
        } catch (e) { body = 0; }
      }
      if (body === 0) reasons.push(`${c}: 讲稿缺正文段`);
    }
  }
  return reasons;
}

/** 跑一门课：extract → slides → tts → frames → video → hls */
function runCourse(id) {
  return new Promise((resolve) => {
    const steps = [
      ['extract_narration', [id]],
      ['build_slides', [id]],
      ['synthesize_narration', [id]],
      ['render_frames', [id]],
      ['build_video', [id]],
      ['build_hls', [id]],
    ];
    let i = 0;
    const next = () => {
      if (i >= steps.length) return resolve({ ok: true });
      const [script, args] = steps[i++];
      const p = spawn(process.execPath, [path.join(ROOT, 'platform', 'pipeline', `${script}.js`), ...args], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let tail = '';
      p.stdout.on('data', (b) => { tail = (tail + b.toString()).slice(-2000); });
      p.stderr.on('data', (b) => { tail = (tail + b.toString()).slice(-2000); });
      p.on('exit', (code) => {
        if (code !== 0) {
          log(`✗ ${id} · ${script} exit=${code} · ${tail.split('\n').filter(Boolean).slice(-2).join(' | ')}`);
          return resolve({ ok: false, step: script });
        }
        next();
      });
    };
    next();
  });
}

(async () => {
  fs.mkdirSync(path.join(ROOT, 'scratch'), { recursive: true });
  const all = listCourses();
  const queue = [];
  for (const id of all) {
    if (!FORCE && state.done[id]) continue;
    const why = whyCourse(id);
    if (why.length) queue.push({ id, why });
  }
  log(`待渲染 ${queue.length} 门 / 扫描 ${all.length} 门 / 并行 ${WORKERS}${DRY ? ' [dry]' : ''}`);
  if (DRY) {
    for (const q of queue.slice(0, 40)) log(`  ${q.id} ← ${q.why.length} 项（${q.why.slice(0, 2).join('；')}）`);
    if (queue.length > 40) log(`  …其余 ${queue.length - 40} 门`);
    return;
  }

  let ok = 0, bad = 0;
  const t0 = Date.now();
  const worker = async (n) => {
    while (queue.length) {
      const job = queue.shift();
      log(`▶ [w${n}] ${job.id}（${job.why.length} 项待补）`);
      const r = await runCourse(job.id);
      if (r.ok) {
        ok += 1;
        state.done[job.id] = { at: new Date().toISOString(), reasons: job.why.length };
        saveState();
        const mins = ((Date.now() - t0) / 60000).toFixed(0);
        log(`✅ [w${n}] ${job.id} 完成 · 累计 ${ok} 门 / 失败 ${bad} 门 / 已跑 ${mins} 分钟`);
      } else {
        bad += 1;
        log(`✗ [w${n}] ${job.id} 失败于 ${r.step}`);
      }
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
  log(`结束：完成 ${ok} 门 / 失败 ${bad} 门 / 用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分钟`);
  process.exit(bad ? 1 : 0);
})();
