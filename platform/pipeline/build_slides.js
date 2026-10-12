#!/usr/bin/env node
/**
 * platform/pipeline/build_slides.js — narration/lesson.json + docs/zh.md → slides/index.html
 *
 *   node platform/pipeline/build_slides.js 01-zhongyi/01-zhongyi-jichu-lilun
 *
 * 产出一个**单文件、离线可放映**的幻灯片页（← → 翻页，空格下一页，Home/End 跳首尾）。
 * 不含任何外部依赖，可直接丢给录屏软件或投影。
 *
 * 依赖: 复用 site/md.js 的 Markdown 渲染器；复用 site/figures.js 的动画图（内联进 HTML）。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const md = require('../../site/md');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));

if (!target || !target.includes('/')) {
  console.error('用法: node platform/pipeline/build_slides.js <dept>/<subject>');
  process.exit(1);
}

const [dept, subject] = target.split('/');
const subjectDir = path.join(ROOT, 'departments', dept, subject);
const courseDir = path.join(ROOT, 'platform', 'courses', dept, subject);

if (!fs.existsSync(subjectDir)) {
  console.error(`✗ 学科目录不存在: departments/${dept}/${subject}`);
  process.exit(1);
}

const chapters = fs
  .readdirSync(path.join(subjectDir, 'chapters'))
  .filter((d) => fs.statSync(path.join(subjectDir, 'chapters', d)).isDirectory())
  .sort();

const figuresJs = fs.readFileSync(path.join(ROOT, 'site', 'figures.js'), 'utf8');
const figuresCss = `
:root{--ink:#1b1a17;--paper:#faf8f3;--paper-2:#f2efe6;--line:#ddd7c8;--muted:#6f6a5e;
--jade:#1f6f5c;--jade-soft:#e3efe9;--cinnabar:#a8321e;--cinnabar-soft:#f7e6e2;--gold:#a8862a;
--sans:system-ui,-apple-system,"Segoe UI","Noto Sans SC","Microsoft YaHei",sans-serif;
--serif:"Songti SC","Noto Serif SC",Georgia,serif;
--mono:ui-monospace,"Cascadia Mono",Consolas,monospace;}
`;

function slideHtml(seg, idx, total) {
  const body = (() => {
    switch (seg.role) {
      case 'title':
        return `<h1 class="big">${md.inline(seg.text)}</h1>`;
      case 'motto':
        return `<blockquote class="motto">${md.inline(seg.text)}</blockquote>`;
      case 'problem':
        return `<div class="kicker">PROBLEM</div><p class="lead">${md.inline(seg.text)}</p>`;
      case 'roots':
        return `<div class="kicker">双根因定位</div><p class="lead">${md.inline(seg.text)}</p>`;
      case 'figure':
        return `<div class="kicker">动画图</div><div class="figure-host" data-figure="${seg.text}"></div>`;
      case 'disclaimer':
        return `<div class="kicker warn">免责声明</div><p class="lead">${md.inline(seg.text)}</p>`;
      case 'build':
      case 'use':
      case 'verify':
        return `<div class="kicker">${seg.role === 'build' ? 'BUILD IT · 从零实现' : seg.role === 'use' ? 'USE IT · 框架调用' : '验证'}</div>
                <div class="compact">${md.render(seg.text)}</div>`;
      default:
        return `<div class="kicker">${seg.role === 'objectives' ? '学习目标' : seg.role === 'concept' ? '核心概念' : seg.role === 'ship' ? 'SHIP IT · 产出物' : ''}</div>
                <div class="compact">${md.render(seg.text)}</div>`;
    }
  })();

  return `<section class="slide" data-i="${idx}">
  <div class="slide-inner">${body}</div>
  <div class="slide-foot"><span>${idx + 1} / ${total}</span><span>${seg.role}</span></div>
</section>`;
}

let made = 0;

for (const ch of chapters) {
  const narrPath = path.join(courseDir, ch, 'narration', 'lesson.json');
  if (!fs.existsSync(narrPath)) {
    console.error(`  ✗ ${ch}: 缺 narration/lesson.json —— 先跑 extract_narration.js`);
    continue;
  }
  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));
  const slides = narr.segments.map((s, i) => slideHtml(s, i, narr.segments.length)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>${narr.title} · 幻灯片</title>
<style>
${figuresCss}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#12110f;color:var(--ink);font-family:var(--sans)}
#deck{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth}
.slide{min-height:100%;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;
  padding:5vh 7vw;background:var(--paper);border-bottom:1px solid #000}
.slide-inner{max-width:1000px;width:100%;margin:0 auto}
.slide-foot{max-width:1000px;width:100%;margin:3vh auto 0;display:flex;justify-content:space-between;
  font-family:var(--mono);font-size:12px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
h1.big{font-family:var(--serif);font-size:clamp(28px,4.4vw,54px);line-height:1.25;margin:0}
blockquote.motto{font-family:var(--serif);font-size:clamp(20px,2.6vw,34px);line-height:1.6;margin:0;
  border-left:6px solid var(--gold);padding-left:24px}
.kicker{font-family:var(--mono);font-size:12px;letter-spacing:.2em;color:var(--jade);
  text-transform:uppercase;margin-bottom:14px}
.kicker.warn{color:var(--cinnabar)}
p.lead{font-size:clamp(18px,2.1vw,28px);line-height:1.7;margin:0;font-family:var(--serif)}
.compact{font-size:clamp(14px,1.35vw,18px);line-height:1.75;max-height:64vh;overflow:auto}
.compact h2,.compact h3{font-family:var(--serif);margin:.6em 0 .3em}
.compact pre{background:var(--paper-2);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:13px}
.compact code{background:var(--paper-2);border:1px solid var(--line);border-radius:4px;padding:1px 4px;font-family:var(--mono)}
.compact table{border-collapse:collapse;font-size:13px;width:100%}
.compact th,.compact td{border:1px solid var(--line);padding:5px 8px;text-align:left}
.figure-host{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px}
#hud{position:fixed;right:14px;bottom:12px;font-family:var(--mono);font-size:12px;color:#8a8578;
  background:#faf8f3cc;border:1px solid var(--line);border-radius:8px;padding:5px 10px}
@media print{.slide{page-break-after:always;min-height:auto}#hud{display:none}}
</style>
</head>
<body>
<div id="deck">
${slides}
</div>
<div id="hud">← → 翻页 · 空格下一页 · Home/End 首尾 · p 打印/导出 PDF</div>
<script>${figuresJs}</script>
<script>
(function(){
  const deck=document.getElementById('deck');
  const slides=[...document.querySelectorAll('.slide')];
  let i=0;
  function go(n){i=Math.max(0,Math.min(slides.length-1,n));slides[i].scrollIntoView();}
  addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();go(i+1);}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(i-1);}
    else if(e.key==='Home'){e.preventDefault();go(0);}
    else if(e.key==='End'){e.preventDefault();go(slides.length-1);}
    else if(e.key==='p'||e.key==='P'){e.preventDefault();print();}
  });
  deck.addEventListener('click',e=>{if(e.target.closest('a'))return;go(i+1);});
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting)i=+en.target.dataset.i;});},{root:deck,threshold:.6});
  slides.forEach(s=>io.observe(s));
  if(window.TCMFigures)window.TCMFigures.mount(document);
})();
</script>
</body>
</html>
`;

  const dir = path.join(courseDir, ch, 'slides');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  made += 1;
  console.log(`  ✅ ${ch} → slides/index.html (${narr.segments.length} 张, ${(html.length / 1024).toFixed(0)} KB)`);
}

console.log(`\n完成: ${made}/${chapters.length} 个章节的幻灯片`);
console.log('放映: 用浏览器打开 platform/courses/' + target + '/<chapter>/slides/index.html');
console.log('按 p 可打印为 PDF。');
