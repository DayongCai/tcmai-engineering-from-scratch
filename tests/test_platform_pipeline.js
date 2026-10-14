#!/usr/bin/env node
/**
 * tests/test_platform_pipeline.js —— [tcmP] 成片流水线的门
 *
 * 为什么需要这道门：`platform/courses/` 下的产物此前**没有任何检查**。
 * 三章里只有第一章走到了成片，另两章停在幻灯片 —— 而这个事实
 * **在仓库里任何地方都看不见**：没有计数、没有清单、没有门。
 * 于是「平台能不能出片」只能靠跑一遍才知道，而「跑通了」的声明无法复核。
 *
 * 这道门守四件事（按「能不能被空壳骗过」排）：
 *   1. 若有产物，就必须**与段数对齐** —— 12 段就该有 12 帧 / 12 段配音 / 12 条字幕 / 12 个分片。
 *      这条能抓住「渲染到一半失败、留下 8 张图」这种最容易漏过验收的状态。
 *   2. 成片与产物**不许是占位** —— 有下限体积（实测：成片 5.61 MB、单帧 40 KB、单段配音 86 KB）。
 *      没有这条，一个 `touch video/lesson.mp4` 就能让「视频已生成」变真。
 *   3. 流水线自带的**诚实报告必须被填**（估算 vs 实测、视音差、字幕条数），
 *      不许是空字段 —— 那正是本项目最看重的可复核性。
 *   4. 六段脚本与 npm 命令、README 表格**三方齐备**（防「有脚本但没人知道怎么跑」）。
 *
 * 外加：完成度必须**被打印出来**。这个项目反复踩的坑是「报绿的跳过比没有检查更坏」，
 * 所以 courses 目录不存在时**明说**而不是静默 exit 0。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COURSES = path.join(ROOT, 'platform', 'courses');
const PIPELINE = path.join(ROOT, 'platform', 'pipeline');

/** 体积下限（字节）—— 取自本机实测产物，留足余量 */
const MIN = {
  videoFull: 1024 * 1024,   // 成片 5.61 MB 实测 → 下限 1 MB
  videoPart: 8 * 1024,      // 单分片 0.09 MB 实测 → 下限 8 KB
  frame: 5 * 1024,          // 单帧 40 KB 实测   → 下限 5 KB
  audio: 10 * 1024,         // 单段配音 86 KB 实测 → 下限 10 KB
  slide: 2 * 1024,          // 幻灯片 43 KB 实测  → 下限 2 KB
};

let passed = 0;
const failures = [];

// 与「新鲜度三态」同一套做法：测不了就**明说**，不静默通过、也不假装失败。
if (!fs.existsSync(COURSES)) {
  console.log('⚠ 成片流水线：platform/courses 不存在 —— 产物契约未比对（明说，不是通过）');
}
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const size = (p) => { try { return fs.statSync(p).size; } catch { return -1; } };
const listOf = (dir, re) => {
  try { return fs.readdirSync(dir).filter((f) => re.test(f)).sort(); } catch { return []; }
};

// ── 七段流水线（与 platform/README.md 的表格一一对应）─────────
//
// 第 5.5 段 build_subtitles.js 曾经**缺席于 npm 命令与 README 表格**，
// 却真实存在、被 build_video.js 依赖、且有产物（subtitles.json 里写着
// generatedBy 是它）。这道门就是照这个缺口写的。

const STAGES = [
  { id: '2', script: 'extract_narration.js', cmd: 'tcmP:narration', out: 'narration/lesson.json', label: '讲稿' },
  { id: '3', script: 'build_slides.js', cmd: 'tcmP:slides', out: 'slides/index.html', label: '幻灯片' },
  { id: '4', script: 'render_frames.js', cmd: 'tcmP:frames', out: 'frames/', label: '画面帧' },
  { id: '5', script: 'synthesize_narration.js', cmd: 'tcmP:tts', out: 'narration/audio/', label: '配音' },
  { id: '5.5', script: 'build_subtitles.js', cmd: 'tcmP:subtitles', out: 'narration/subtitles.vtt', label: '字幕' },
  { id: '6', script: 'build_video.js', cmd: 'tcmP:video', out: 'video/lesson.mp4', label: '成片' },
];

// ── 一、三方齐备：脚本 / npm 命令 / README 表格 ──────────────

test('七段脚本全部存在（含工具探测两段）', () => {
  const all = ['find_tools.js', 'check_tools.js', ...STAGES.map((s) => s.script)];
  for (const f of all) {
    assert(fs.existsSync(path.join(PIPELINE, f)), `缺脚本：platform/pipeline/${f}`);
  }
});

test('每一段都有 npm 命令，且命令真的指向那个脚本', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const s of STAGES) {
    const v = pkg.scripts[s.cmd];
    assert(v, `package.json 缺命令：${s.cmd}（第 ${s.id} 段 ${s.label}）`);
    assert(v.includes(s.script), `${s.cmd} 指向的不是 ${s.script}，而是：${v}`);
  }
  assert(pkg.scripts['tcmP:tools'], 'package.json 缺命令：tcmP:tools');
});

test('README 的流水线表格列出了每一段（防"有脚本但没人知道怎么跑"）', () => {
  const md = fs.readFileSync(path.join(ROOT, 'platform', 'README.md'), 'utf8');
  for (const s of STAGES) {
    assert(md.includes(s.script), `platform/README.md 的流水线表里没有 ${s.script}（第 ${s.id} 段 ${s.label}）`);
  }
});

test('不共享探测逻辑：三个脚本都从 find_tools.js 取，不许各写一份', () => {
  const consumers = ['check_tools.js', 'render_frames.js', 'build_video.js'];
  for (const f of consumers) {
    const src = fs.readFileSync(path.join(PIPELINE, f), 'utf8');
    assert(/require\(['"]\.\/find_tools['"]\)/.test(src),
      `${f} 没有 require('./find_tools') —— 探测逻辑散开必然漂移`);
  }
});

// ── 二、courses 不存在时明说（不静默跳过）────────────────────

test('platform/courses 不存在时必须明说，不许静默通过（报绿的跳过比没有检查更坏）', () => {
  const src = fs.readFileSync(__filename, 'utf8');
  assert(src.includes('成片流水线：platform/courses 不存在'),
    '缺"明说"分支 —— 目录一被删，这道门就会静默消失');
  if (!fs.existsSync(COURSES)) {
    console.log('    ⚠ platform/courses 不存在：产物契约**未比对**（明说，不是通过）');
  }
});

// ── 三、产物契约：对齐 ────────────────────────────────────────

/** 扫描所有章节，收集完成度 */
function scanChapters() {
  const out = [];
  if (!fs.existsSync(COURSES)) return out;
  for (const dept of fs.readdirSync(COURSES)) {
    const deptDir = path.join(COURSES, dept);
    if (!fs.statSync(deptDir).isDirectory()) continue;
    for (const subject of fs.readdirSync(deptDir)) {
      const subjectDir = path.join(deptDir, subject);
      if (!fs.statSync(subjectDir).isDirectory()) continue;
      for (const slug of fs.readdirSync(subjectDir)) {
        const chDir = path.join(subjectDir, slug);
        if (!fs.statSync(chDir).isDirectory()) continue;
        out.push({ key: `${dept}/${subject}/${slug}`, dir: chDir });
      }
    }
  }
  return out;
}

const chapters = scanChapters();

test('每个章节的产物与段数对齐（12 段就该有 12 帧 / 12 段配音 / 12 条字幕 / 12 个分片）', () => {
  if (!fs.existsSync(COURSES)) return;   // 已在文件头明说
  assert(chapters.length > 0, 'platform/courses 下没有章节');
  for (const ch of chapters) {
    const lessonPath = path.join(ch.dir, 'narration', 'lesson.json');
    if (!fs.existsSync(lessonPath)) continue;   // 还没起步的章节，完成度那一条会报出来
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
    const segs = lesson.segments || [];
    assert(segs.length > 0, `${ch.key}: lesson.json 没有 segments`);
    assert(lesson.segmentCount === segs.length,
      `${ch.key}: segmentCount ${lesson.segmentCount} ≠ segments.length ${segs.length}`);

    const frames = listOf(path.join(ch.dir, 'frames'), /\.png$/);
    if (frames.length) {
      assert(frames.length === segs.length,
        `${ch.key}: 画面帧 ${frames.length} 张 ≠ 段数 ${segs.length} —— 像是渲染到一半失败留下的`);
    }

    const segsWithAudio = segs.filter((s) => s.audio).length;
    const mp3 = listOf(path.join(ch.dir, 'narration', 'audio'), /\.mp3$/);
    if (mp3.length) {
      assert(mp3.length === segsWithAudio,
        `${ch.key}: 配音 ${mp3.length} 段 ≠ 有 audio 字段的段数 ${segsWithAudio}`);
    }

    const vttPath = path.join(ch.dir, 'narration', 'subtitles.vtt');
    if (fs.existsSync(vttPath)) {
      const cues = (fs.readFileSync(vttPath, 'utf8').match(/-->/g) || []).length;
      assert(cues === segs.length,
        `${ch.key}: 字幕 ${cues} 条 ≠ 段数 ${segs.length}（字幕按语义群=段切分，这是它的规则）`);
    }

    const parts = listOf(path.join(ch.dir, 'video'), /^part-\d+\.mp4$/);
    if (parts.length) {
      assert(parts.length === segs.length,
        `${ch.key}: 视频分片 ${parts.length} 个 ≠ 段数 ${segs.length}`);
    }
  }
});

// ── 四、产物不许是占位 ──────────────────────────────────────

test('成片与各段产物不许是占位（有体积下限；一个 touch 骗不过）', () => {
  for (const ch of chapters) {
    const checks = [
      ['video/lesson.mp4', MIN.videoFull, '成片'],
      ['slides/index.html', MIN.slide, '幻灯片'],
      ['narration/subtitles.vtt', 200, '字幕'],
    ];
    for (const [rel, min, label] of checks) {
      const p = path.join(ch.dir, rel);
      if (!fs.existsSync(p)) continue;
      const s = size(p);
      assert(s >= min, `${ch.key}: ${label} ${rel} 只有 ${s} 字节（下限 ${min}）—— 像是占位文件`);
    }
    for (const [dir, re, min, label] of [
      ['frames', /\.png$/, MIN.frame, '画面帧'],
      ['narration/audio', /\.mp3$/, MIN.audio, '配音'],
      ['video', /^part-\d+\.mp4$/, MIN.videoPart, '视频分片'],
    ]) {
      const d = path.join(ch.dir, dir);
      for (const f of listOf(d, re)) {
        const s = size(path.join(d, f));
        assert(s >= min, `${ch.key}: ${label} ${f} 只有 ${s} 字节（下限 ${min}）—— 像是占位文件`);
      }
    }
  }
});

test('分片与成片并存时，成片不该比分片之和还小（防只合了前半段）', () => {
  for (const ch of chapters) {
    const full = path.join(ch.dir, 'video', 'lesson.mp4');
    const parts = listOf(path.join(ch.dir, 'video'), /^part-\d+\.mp4$/);
    if (!fs.existsSync(full) || parts.length < 2) continue;
    const sum = parts.reduce((a, f) => a + size(path.join(ch.dir, 'video', f)), 0);
    assert(size(full) >= sum * 0.5,
      `${ch.key}: 成片 ${size(full)} 字节 < 分片之和的一半 ${(sum * 0.5) | 0} —— 像是只合了一部分`);
  }
});

// ── 五、诚实的报告必须被填 ──────────────────────────────────

test('讲稿的诚实报告字段被填（text/spoken 分离、估算 vs 实测）', () => {
  for (const ch of chapters) {
    const p = path.join(ch.dir, 'narration', 'lesson.json');
    if (!fs.existsSync(p)) continue;
    const L = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert(L.source, `${ch.key}: lesson.json 缺 source（不记来源就没法核对它是从哪份正文派生的）`);
    assert(L.textVsSpoken, `${ch.key}: 缺 textVsSpoken 说明 —— 这条边界不写下来，下一个人会直接把原文喂给 TTS`);
    if (L.audioMeasuredSeconds !== undefined) {
      assert(L.audioBackend, `${ch.key}: 有实测时长却缺 audioBackend —— "用了哪条降级链"必须明说`);
      assert(L.estimateVsActual, `${ch.key}: 有实测时长却缺 estimateVsActual 说明`);
    }
    // 每段都要有 spoken（没有就无从配音），且 spoken 不许残留代码围栏
    for (const s of L.segments || []) {
      assert(s.n >= 1, `${ch.key}: 段落 n 不是从 1 开始（${s.n}）`);
      assert(typeof s.spoken === 'string' && s.spoken.trim(), `${ch.key}: 第 ${s.n} 段没有 spoken`);
      assert(!/```/.test(s.spoken), `${ch.key}: 第 ${s.n} 段的 spoken 里残留代码围栏 —— 会被念出来`);
    }
  }
});

test('字幕的诚实报告被填（条数一致、视音差、文本与配音一致）', () => {
  for (const ch of chapters) {
    const p = path.join(ch.dir, 'narration', 'subtitles.json');
    if (!fs.existsSync(p)) continue;
    const S = JSON.parse(fs.readFileSync(p, 'utf8'));
    const lesson = JSON.parse(fs.readFileSync(path.join(ch.dir, 'narration', 'lesson.json'), 'utf8'));
    assert(S.generatedBy && S.generatedBy.includes('build_subtitles'),
      `${ch.key}: subtitles.json 没记 generatedBy —— 产物要能指出是哪个脚本生成的`);
    assert(S.rule, `${ch.key}: 缺 rule —— 切分规则必须写下来，否则改法无从对照`);
    assert(S.cueCount === (lesson.segments || []).length,
      `${ch.key}: cueCount ${S.cueCount} ≠ 段数 ${(lesson.segments || []).length}`);
    assert('videoMinusNarrationSeconds' in S,
      `${ch.key}: subtitles.json 里连 videoMinusNarrationSeconds 字段都没有`);
    // 这条字段的真实语义是「对视音差」——成片还没做时算不出来。
    // 所以断言要分两态（第一版写成"必须是 number"，那假设了字幕一定已有成片，
    // 对刚做完字幕、还没合成视频的章节会误报）。
    const hasVideo = fs.existsSync(path.join(ch.dir, 'video', 'lesson.mp4'));
    if (hasVideo) {
      assert(typeof S.videoMinusNarrationSeconds === 'number',
        `${ch.key}: 成片已存在，对视音差必须是实测数字，实为 ${JSON.stringify(S.videoMinusNarrationSeconds)}`);
    } else {
      assert(S.videoMinusNarrationSeconds === null,
        `${ch.key}: 无成片时应明说"未校验"（null），实为 ${JSON.stringify(S.videoMinusNarrationSeconds)} —— 不许留 undefined 或编个数字`);
    }
    assert(S.textMatchesNarration === true,
      `${ch.key}: textMatchesNarration 不为 true —— 字幕文字与配音不一致`);
    assert(Array.isArray(S.mismatches) && S.mismatches.length === 0,
      `${ch.key}: 有 ${(S.mismatches || []).length} 条字幕与配音不一致`);
  }
});

// ── 六、完成度必须可见 ──────────────────────────────────────

test('完成度被打印出来（"三章里只有一章成片"这件事不许静默）', () => {
  const reached = new Map(STAGES.map((s) => [s.id, 0]));
  const lines = [];
  for (const ch of chapters) {
    const done = STAGES.filter((s) => {
      const p = path.join(ch.dir, s.out);
      if (!fs.existsSync(p)) return false;
      const st = fs.statSync(p);
      return st.isDirectory() ? fs.readdirSync(p).some((f) => !f.startsWith('.')) : st.size > 0;
    });
    for (const s of done) reached.set(s.id, reached.get(s.id) + 1);
    lines.push(`    ${ch.key.padEnd(46)} ${done.length ? done.map((s) => s.id).join(' → ') : '（无产物）'}`);
  }
  console.log(`\n    成片流水线：${chapters.length} 个章节`);
  for (const l of lines) console.log(l);
  console.log('    各段到达章节数：' + STAGES.map((s) => `${s.label} ${reached.get(s.id)}`).join(' · '));
  const full = STAGES.filter((s) => reached.get(s.id) === chapters.length).length;
  if (full < STAGES.length) {
    console.log(`    ⚠ ${STAGES.length - full} 个阶段尚未覆盖全部章节 —— 这是**进度**，不是错误`);
  }
  assert(chapters.length > 0 || !fs.existsSync(COURSES),
    'platform/courses 存在但一个章节都没有');
});

// ── 六、course.yaml 的状态不许与磁盘实况不符 ────────────────
//
// course.yaml 自己写着「只登记讲什么、什么状态」，而 video 字段是**手工维护**的。
// 手工维护的状态必然烂：三章都已经成片了，文件里还写着 slides-ready。
// 这与 test_forking_doc.js 守的是同一条逻辑（文档里的数字/状态不许静默过期），
// 只是换了个文件。

/** 实况等级：磁盘上走到哪一段 */
function actualState(chDir) {
  if (!fs.existsSync(chDir)) return 'planned';
  if (fs.existsSync(path.join(chDir, 'video', 'lesson.mp4'))) return 'rendered';
  if (fs.existsSync(path.join(chDir, 'slides', 'index.html'))) return 'slides-ready';
  if (fs.existsSync(path.join(chDir, 'narration', 'lesson.json'))) return 'narration-ready';
  return 'planned';
}

/** 极简 yaml 读取：只取 chapters 下每条 slug 与 video（本项目无 yaml 库，够用即可） */
function readCourseYaml(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = [];
  let cur = null;
  for (const line of txt.split('\n')) {
    const mSlug = line.match(/^\s*-\s*slug:\s*(\S+)/);
    if (mSlug) { cur = { slug: mSlug[1], video: null }; out.push(cur); continue; }
    const mVideo = line.match(/^\s*video:\s*(\S+)/);
    if (mVideo && cur) cur.video = mVideo[1];
  }
  return out;
}

test('course.yaml 的 video 状态与磁盘实况一致（手工状态不许静默过期）', () => {
  const yamlFiles = [];
  const walkYaml = (dir, depth = 0) => {
    if (depth > 4 || !fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkYaml(p, depth + 1);
      else if (e.name === 'course.yaml') yamlFiles.push(p);
    }
  };
  walkYaml(COURSES);
  assert(yamlFiles.length > 0, '没找到任何 course.yaml');

  const bad = [];
  for (const f of yamlFiles) {
    const subjectDir = path.dirname(f);
    for (const ch of readCourseYaml(f)) {
      const actual = actualState(path.join(subjectDir, ch.slug));
      // published 是"已发布"这个额外动作，磁盘上表现为 rendered —— 允许它高一级
      if (ch.video === actual) continue;
      if (ch.video === 'published' && actual === 'rendered') continue;
      bad.push(`${path.relative(ROOT, f)} 里 ${ch.slug} 写的是 ${ch.video}，磁盘实况是 ${actual}`);
    }
  }
  assert(bad.length === 0, `状态与实况不符：\n      ${bad.join('\n      ')}`);
});

test('course.yaml 的时长与 lesson.json 一致（"声明了来源"就必须真的对得上）', () => {
  const yamlFiles = [];
  const walkYaml = (dir, depth = 0) => {
    if (depth > 4 || !fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkYaml(p, depth + 1);
      else if (e.name === 'course.yaml') yamlFiles.push(p);
    }
  };
  walkYaml(COURSES);

  const bad = [];
  for (const f of yamlFiles) {
    const subjectDir = path.dirname(f);
    const txt = fs.readFileSync(f, 'utf8');
    // slug 与它的 estimate_minutes / measured_minutes
    const entries = [];
    let cur = null;
    for (const line of txt.split('\n')) {
      const mSlug = line.match(/^\s*-\s*slug:\s*(\S+)/);
      if (mSlug) { cur = { slug: mSlug[1], est: null, meas: null }; entries.push(cur); continue; }
      const mEst = line.match(/^\s*estimate_minutes:\s*([\d.]+)/);
      if (mEst && cur) cur.est = Number(mEst[1]);
      const mMeas = line.match(/^\s*measured_minutes:\s*([\d.]+)/);
      if (mMeas && cur) cur.meas = Number(mMeas[1]);
    }
    for (const e of entries) {
      const lessonPath = path.join(subjectDir, e.slug, 'narration', 'lesson.json');
      if (!fs.existsSync(lessonPath)) continue;   // 未开章的不比
      const L = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
      if (e.est !== null && L.estimateTotalSeconds) {
        const want = L.estimateTotalSeconds / 60;
        if (Math.abs(e.est - want) > 0.05) {
          bad.push(`${e.slug}: estimate_minutes 写 ${e.est}，lesson.json 的 estimateTotalSeconds 换算是 ${want.toFixed(1)}`);
        }
      }
      if (e.meas !== null && L.audioMeasuredSeconds) {
        const want = L.audioMeasuredSeconds / 60;
        if (Math.abs(e.meas - want) > 0.06) {
          bad.push(`${e.slug}: measured_minutes 写 ${e.meas}，lesson.json 的 audioMeasuredSeconds 换算是 ${want.toFixed(1)}`);
        }
      }
    }
  }
  assert(bad.length === 0, `时长与来源不符：\n      ${bad.join('\n      ')}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 成片流水线产物契约通过');
