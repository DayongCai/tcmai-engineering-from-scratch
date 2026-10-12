#!/usr/bin/env node
/**
 * platform/pipeline/render_frames.js — slides/index.html → frames/001.png … NNN.png
 *
 *   node platform/pipeline/render_frames.js 01-zhongyi/01-zhongyi-jichu-lilun [--chapter <slug>]
 *
 * 用系统里已有的 Chromium 系浏览器（Edge / Chrome）的无头模式逐张截图。
 * 幻灯片页支持 `?shot=N` 的单帧模式（见 build_slides.js），所以每张图都是一屏，
 * 不需要靠滚动偏移去猜位置 —— 猜偏移在字体/缩放不同的机器上必然错位。
 *
 * 为什么不用别的办法导出画面:
 *   - 服务端渲染 SVG/Canvas → 需要额外依赖（resvg/cairo），与「标准库优先」冲突
 *   - ffmpeg 直接读 SVG → 需要 librsvg，官方构建默认不带
 *   浏览器的无头截图是唯一「零新增依赖且渲染结果与人工放映一致」的路径。
 *
 * 缺浏览器时明确失败，不生成占位图。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const { findBrowser } = require('./find_tools');

const W = 1920;
const H = 1080;

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const chapterIdx = argv.indexOf('--chapter');
const chapterArg = chapterIdx >= 0 ? argv[chapterIdx + 1] : null;

if (!target || !target.includes('/')) {
  console.error('用法: node platform/pipeline/render_frames.js <dept>/<subject> [--chapter <slug>]');
  process.exit(1);
}

const browser = findBrowser();
if (!browser) {
  console.error('✗ 未找到 Chromium 系浏览器（Edge / Chrome）—— 无法导出画面帧。');
  console.error('  本脚本不生成占位图：一张假帧会一路混进成片，且没人能看出来。');
  console.error('  安装任一即可:');
  console.error('    Edge   : 随 Windows 预装，或 https://microsoft.com/edge');
  console.error('    Chrome : winget install Google.Chrome');
  process.exit(1);
}

const [dept, subject] = target.split('/');
const courseDir = path.join(ROOT, 'platform', 'courses', dept, subject);
if (!fs.existsSync(courseDir)) {
  console.error(`✗ 课程目录不存在: platform/courses/${dept}/${subject}`);
  console.error(`  先跑: node platform/pipeline/extract_narration.js ${target}`);
  process.exit(1);
}

const chapters = fs
  .readdirSync(courseDir)
  .filter((d) => fs.statSync(path.join(courseDir, d)).isDirectory())
  .filter((d) => !chapterArg || d === chapterArg)
  .sort();

if (!chapters.length) {
  console.error(`✗ 没有可导出的章节${chapterArg ? `（--chapter ${chapterArg} 未匹配）` : ''}`);
  process.exit(1);
}

// 独立的浏览器 profile，避免与用户正在用的浏览器抢锁
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcmp-shot-'));

console.log('═══ [tcmP] 画面帧导出 ═══');
console.log(`  浏览器: ${browser}`);
console.log(`  尺寸  : ${W}×${H}`);
console.log(`  输出  : frames/*.png\n`);

let total = 0;
let failed = 0;

for (const ch of chapters) {
  const cdir = path.join(courseDir, ch);
  const narrPath = path.join(cdir, 'narration', 'lesson.json');
  const slidePath = path.join(cdir, 'slides', 'index.html');

  if (!fs.existsSync(narrPath)) {
    console.error(`  ✗ ${ch}: 缺 narration/lesson.json`);
    continue;
  }
  if (!fs.existsSync(slidePath)) {
    console.error(`  ✗ ${ch}: 缺 slides/index.html —— 先跑 build_slides.js`);
    continue;
  }

  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));
  const framesDir = path.join(cdir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const url = `file:///${slidePath.replace(/\\/g, '/')}`;
  let ok = 0;

  for (let i = 0; i < narr.segments.length; i += 1) {
    const out = path.join(framesDir, `${String(i + 1).padStart(3, '0')}.png`);
    const r = spawnSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profileDir}`,
      `--window-size=${W},${H}`,
      `--virtual-time-budget=1500`,
      `--screenshot=${out}`,
      `${url}?shot=${i}`,
    ], { encoding: 'utf8', timeout: 60000 });

    const created = fs.existsSync(out) && fs.statSync(out).size > 2000;
    if (!created) {
      failed += 1;
      console.error(`     ✗ 第 ${i + 1} 张导出失败 (exit ${r.status})`);
      const err = `${r.stderr || ''}`.trim().split('\n').slice(-2).join(' | ');
      if (err) console.error(`         ${err}`);
      continue;
    }
    ok += 1;
    total += 1;
  }

  // 段数与帧数必须相等，否则后面的配音会错位
  const mark = ok === narr.segments.length ? '✅' : '✗';
  console.log(`  ${mark} ${ch}: ${ok}/${narr.segments.length} 帧`);
  if (ok !== narr.segments.length) {
    console.error(`     ✗ 帧数与段落数不一致，成片阶段会因配音错位而拒绝执行`);
  }
}

fs.rmSync(profileDir, { recursive: true, force: true });

console.log(`\n完成: 共导出 ${total} 帧${failed ? `，失败 ${failed} 帧` : ''}`);
if (failed) {
  console.error('❌ 有帧导出失败');
  process.exit(1);
}
console.log('下一步: node platform/pipeline/build_video.js ' + target);
