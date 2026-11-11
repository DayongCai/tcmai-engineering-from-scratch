#!/usr/bin/env node
/**
 * scripts/figures/render.js —— [textbooks] 插图渲染与对账
 *
 *   node scripts/figures/render.js                    渲染全部图源
 *   node scripts/figures/render.js --only 人体解剖学    只渲一门
 *   node scripts/figures/render.js --check            只对账：产物缺失/过期就失败
 *   node scripts/figures/render.js --force            产物比源新也重渲
 *
 * 图源与产物放在同一目录，同根名：
 *     textbooks/<dept>/<subject>/figures/fig-01-五行气化.mmd  →  fig-01-五行气化.svg
 *     textbooks/<dept>/<subject>/figures/fig-02-经络流注.py   →  fig-02-经络流注.svg
 *
 * 两类图源各管一路，选题只看「这张图要不要数据」：
 *   .mmd  mermaid —— 结构 / 流程 / 关系。节点、边、分叉，手写。
 *   .py   matplotlib —— 数据 / 函数 / 统计。要算，要坐标轴，要量纲。
 *
 * 为什么强制「源 + 产物」双份并存：
 *   只存 SVG 就没法重画（改一个错别字得重新打开绘图软件），只存源就没法直接嵌进教材。
 *   --check 比对 mtime，源比产物新即视为过期 —— 这条规则让「改了源却忘了重渲染」
 *   在 npm run check 里立刻暴露，而不是等到有人翻书时才发现图还是旧版。
 *
 * mermaid 为什么不用 @mermaid-js/mermaid-cli：
 *   它会把 puppeteer + Chromium 一起拉下来（几百 MB），且实测其 postinstall
 *   要从源码跑 tsc && vite build，在本机直接失败。这里改用 vendor/mermaid.min.js
 *   （3.2 MB，版本与 sha256 记在 textbooks/FIGURES.md）+ 系统已装的 Edge/Chrome
 *   无头渲染，整条链零外部依赖、可离线重现。
 *
 * 缺工具时明确拒绝，不生成占位图 —— 与 platform/pipeline/build_video.js 同一原则。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const tools = require(path.join(__dirname, '..', '..', 'platform', 'pipeline', 'find_tools.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const TBDIR = path.join(ROOT, 'textbooks');
const VENDOR_MERMAID = path.join(__dirname, 'vendor', 'mermaid.min.js');
const SOURCE_EXT = ['.mmd', '.py'];

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const onlyIdx = argv.indexOf('--only');
const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
const force = argv.includes('--force');

// 教材纸色，与 textbooks/build_book.js 的 --paper 一致：图与书页不能是两个底色
const PAPER = '#fbf8f2';
const FONT_STACK = "'Noto Serif SC','Source Han Serif CN','Songti SC','SimSun',serif";

/** 收集全部图源：textbooks/<dept>/<subject>/figures/*.{mmd,py} */
function collectSources() {
  const out = [];
  if (!fs.existsSync(TBDIR)) return out;
  for (const dept of fs.readdirSync(TBDIR, { withFileTypes: true })) {
    if (!dept.isDirectory()) continue;
    const deptDir = path.join(TBDIR, dept.name);
    for (const subj of fs.readdirSync(deptDir, { withFileTypes: true })) {
      if (!subj.isDirectory()) continue;
      if (only && subj.name !== only) continue;
      const figDir = path.join(deptDir, subj.name, 'figures');
      if (!fs.existsSync(figDir)) continue;
      for (const f of fs.readdirSync(figDir)) {
        const ext = path.extname(f).toLowerCase();
        if (!SOURCE_EXT.includes(ext)) continue;
        const src = path.join(figDir, f);
        out.push({
          src,
          ext,
          subject: subj.name,
          dept: dept.name,
          out: path.join(figDir, f.slice(0, -ext.length) + '.svg'),
        });
      }
    }
  }
  return out;
}

function mtime(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, opts || {}));
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || ''),
  };
}

/**
 * mermaid → SVG：写一个自包含 HTML，用无头浏览器跑 mermaid，再把渲染好的 <svg> 抠出来。
 *
 * 两个必须的配置，少一个都会出坏图：
 *   htmlLabels:false —— 默认把标签塞进 <foreignObject> 的 HTML 里。那样导出的 .svg
 *                      文件（走 XML 解析）会直接报 Unexpected closing tag 并只渲染出第一个节点。
 *   useMaxWidth:false —— 否则 mermaid 按容器宽度算 max-width，无头环境下算出 91px 这种
 *                      荒谬尺寸，图被压成一条。
 * 另外 mermaid.render 是异步的，靠 --virtual-time-budget 给它时间跑完。
 */
function renderMermaid(item, env) {
  const code = fs.readFileSync(item.src, 'utf8');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcm-mmd-'));
  const htmlPath = path.join(tmpDir, 'fig.html');

  const theme = {
    startOnLoad: false,
    theme: 'base',
    flowchart: { useMaxWidth: false, htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: false },
    themeVariables: {
      fontFamily: FONT_STACK,
      fontSize: '15px',
      background: PAPER,
      primaryColor: '#f3ede2',
      primaryTextColor: '#1f1b16',
      primaryBorderColor: '#8a5a2b',
      secondaryColor: '#eef2e8',
      tertiaryColor: '#fdf6e8',
      lineColor: '#6b6156',
    },
  };

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:${PAPER}}body{font-family:${FONT_STACK}}</style>
</head><body><div id="out"></div>
<script src="file:///${VENDOR_MERMAID.replace(/\\/g, '/')}"></script>
<script>
const CODE = ${JSON.stringify(code)};
(async () => {
  try {
    mermaid.initialize(${JSON.stringify(theme)});
    const { svg } = await mermaid.render('tcmfig', CODE);
    const out = document.getElementById('out');
    out.innerHTML = svg;
    const el = out.querySelector('svg');
    const bb = el.getBBox();
    const pad = 10;
    el.setAttribute('viewBox', \`\${bb.x - pad} \${bb.y - pad} \${bb.width + pad * 2} \${bb.height + pad * 2}\`);
    el.setAttribute('width', String(Math.ceil(bb.width + pad * 2)));
    el.setAttribute('height', String(Math.ceil(bb.height + pad * 2)));
    el.removeAttribute('style');
    document.title = 'DONE';
  } catch (e) {
    document.getElementById('out').textContent = 'RENDER_FAILED';
    document.title = 'FAIL:' + (e && e.message ? e.message : String(e));
  }
})();
</script></body></html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');

  const r = run(env.browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--virtual-time-budget=10000',
    '--dump-dom',
    'file:///' + htmlPath.replace(/\\/g, '/'),
  ]);

  if (!r.ok) return { ok: false, err: `无头浏览器退出码 ${r.status}\n${r.stderr.split('\n').slice(-4).join('\n')}` };

  const dom = r.stdout;
  const titleMatch = dom.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';
  if (title.startsWith('FAIL:')) {
    return { ok: false, err: `mermaid 渲染失败: ${title.slice(5)}` };
  }
  if (!title.startsWith('DONE')) {
    return { ok: false, err: '无头浏览器未完成渲染（页面标题未置 DONE）—— 可能 virtual-time-budget 不够' };
  }

  const m = dom.match(/<svg[\s\S]*?<\/svg>/);
  if (!m) return { ok: false, err: '渲染结果里找不到 <svg> 节点' };

  let svg = m[0];
  if (!/\sxmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  fs.writeFileSync(
    item.out,
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- 由 scripts/figures/render.js 从 ${path.basename(item.src)} 生成，勿手改 -->\n${svg}\n`,
    'utf8'
  );
  return { ok: true };
}

function renderMatplotlib(item, env) {
  const r = run(env.python.path, [item.src, item.out], {
    cwd: ROOT,
    // 让图源脚本能直接 `from tcm_figure import canvas`，不必自己算相对路径
    env: Object.assign({}, process.env, { PYTHONPATH: path.join(__dirname) }),
  });
  if (!r.ok) return { ok: false, err: (r.stderr || r.stdout).split('\n').slice(-8).join('\n') };
  return { ok: true };
}

// ─────────────────────────── 主流程 ───────────────────────────

const sources = collectSources();

console.log('═══ [textbooks] 插图 ═══\n');
console.log('  图源目录: textbooks/<dept>/<subject>/figures/\n');

if (sources.length === 0) {
  console.log('  尚未有任何图源（*.mmd / *.py）。');
  console.log('  约定见 textbooks/FIGURES.md：结构图写 .mmd，数据图写 .py，产物同名 .svg。');
  process.exit(0);
}

if (checkOnly) {
  const stale = [];
  const missing = [];
  for (const s of sources) {
    const rel = path.relative(ROOT, s.out).replace(/\\/g, '/');
    if (!fs.existsSync(s.out)) missing.push(rel);
    else if (mtime(s.src) > mtime(s.out) + 1000) stale.push(rel);
  }
  console.log(`  图源 ${sources.length} 个 · 产物缺失 ${missing.length} · 产物过期 ${stale.length}`);
  if (missing.length) {
    console.log('\n  缺少产物（源在但没渲染）:');
    missing.slice(0, 15).forEach((m) => console.log(`     ✗ ${m}`));
    if (missing.length > 15) console.log(`     … 另有 ${missing.length - 15} 个`);
  }
  if (stale.length) {
    console.log('\n  产物过期（源比图新，图还是旧版）:');
    stale.slice(0, 15).forEach((m) => console.log(`     ✗ ${m}`));
    if (stale.length > 15) console.log(`     … 另有 ${stale.length - 15} 个`);
  }
  if (missing.length || stale.length) {
    console.log('\n  → 跑 node scripts/figures/render.js 重渲染，再提交产物。');
    process.exit(1);
  }
  console.log('\n  ✅ 图源与产物一致');
  process.exit(0);
}

// 渲染模式：先探工具，缺了就直接拒绝
const python = tools.probeMatplotlib();
const browser = tools.findBrowser();
const needs = new Set(sources.map((s) => s.ext));
const problems = [];

if (needs.has('.py') && !python) {
  problems.push(
    '缺 matplotlib —— .py 图源无法渲染。\n' +
      '    安装: python -m pip install matplotlib -i https://mirrors.aliyun.com/pypi/simple/'
  );
}
if (needs.has('.mmd')) {
  if (!fs.existsSync(VENDOR_MERMAID)) {
    problems.push(
      '缺 scripts/figures/vendor/mermaid.min.js —— .mmd 图源无法渲染。\n' +
        '    获取: curl -sSL -o scripts/figures/vendor/mermaid.min.js \\\n' +
        '          https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js\n' +
        '    sha256 应为 61b335a46df05a7ce1c98378f60e5f3e77a7fb608a1056997e8a649304a936d6'
    );
  }
  if (!browser) {
    problems.push('缺 Edge / Chrome —— mermaid 渲染需要无头浏览器的 JS 引擎（Edge 随 Windows 预装）。');
  }
}
if (problems.length) {
  console.log('  ✗ 作图工具链不完整，本次不生成任何图（不产出占位文件）:\n');
  problems.forEach((p) => console.log(`  - ${p}\n`));
  process.exit(1);
}

console.log(`  python : ${python ? `${python.path} (matplotlib ${python.version})` : '不需要'}`);
console.log(`  browser: ${needs.has('.mmd') ? browser : '不需要'}`);
console.log(`  mermaid: ${needs.has('.mmd') ? `vendor/mermaid.min.js (${(fs.statSync(VENDOR_MERMAID).size / 1024 / 1024).toFixed(1)} MB)` : '不需要'}\n`);

const env = { python, browser };

let ok = 0;
const failed = [];
for (const s of sources) {
  const rel = path.relative(ROOT, s.src).replace(/\\/g, '/');
  if (!force && fs.existsSync(s.out) && mtime(s.out) > mtime(s.src) + 1000) {
    console.log(`  ⬚ 跳过（产物比源新）${rel}`);
    continue;
  }
  const r = s.ext === '.mmd' ? renderMermaid(s, env) : renderMatplotlib(s, env);
  if (r.ok) {
    ok += 1;
    const kb = (fs.statSync(s.out).size / 1024).toFixed(1);
    console.log(`  ✓ ${rel} → ${path.basename(s.out)} (${kb} KB)`);
  } else {
    failed.push({ rel, err: r.err });
    console.log(`  ✗ ${rel}`);
  }
}

console.log(`\n═══ 结果 ═══`);
console.log(`  成功 ${ok} · 失败 ${failed.length} · 图源合计 ${sources.length}`);
if (failed.length) {
  console.log('\n  失败详情:');
  failed.forEach((f) => console.log(`  ✗ ${f.rel}\n${f.err.split('\n').map((l) => '     ' + l).join('\n')}`));
  process.exit(1);
}
console.log('\n  ✅ 全部渲染完成');
