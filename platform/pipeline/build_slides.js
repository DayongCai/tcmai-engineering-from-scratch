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
// 学科级可选配置（与 extract_narration.js 共用同一份 narration-map.json）
const mapPath = path.join(subjectDir, 'narration-map.json');
const MAP = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : null;

if (!fs.existsSync(subjectDir)) {
  console.error(`✗ 学科目录不存在: departments/${dept}/${subject}`);
  process.exit(1);
}

const chapters = fs
  .readdirSync(path.join(subjectDir, 'chapters'))
  .filter((d) => fs.statSync(path.join(subjectDir, 'chapters', d)).isDirectory())
  // --chapter <slug>：只重造这一章的幻灯片。整门重造会把其他章也写一遍（讲稿/正文没变时
  // 内容一样但 mtime 全变），接着就得为它们重导帧重渲片，否则 slides 比成片新。
  .filter((d) => !argv.includes('--chapter') || d === argv[argv.indexOf('--chapter') + 1])
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
  // 密度：一段一屏后，长节（尤其带表格的）会溢出被切掉——07 章第 5 屏就丢了最后一条。
  // 只用字数会误判：433 字但 12 行（含表格）比 500 字的整段更高。所以用「字数 + 行数×18」作权重。
  const rawText = String(seg.text || '');
  const lineCount = rawText.split('\n').filter((l) => l.trim()).length;
  const weight = rawText.replace(/\s/g, '').length + 18 * lineCount;
  const dens = weight > 760 ? ' denser' : weight > 470 ? ' dense' : '';
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
                <div class="compact${dens}">${md.render(seg.text)}</div>`;
      default:
        // 正文片抬头用小节标题（lesson.json 的 heading）；没有标题的老学科保持原样。
        return `<div class="kicker">${seg.heading || (seg.role === 'objectives' ? '学习目标' : seg.role === 'concept' ? '核心概念' : seg.role === 'ship' ? 'SHIP IT · 产出物' : '')}</div>
                <div class="compact${dens}">${md.render(seg.text)}</div>`;
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
  // 可选：把过长的正文段拆成多张片（学科级 narration-map.json 的 slideSplitChars）。
  // 为什么默认不拆：其他学科的 lesson.json 已有分帧/字幕等下游产物，段数一变下游就对不上；
  // 只有显式声明了拆分的学科才变。拆分只在空行（段落边界）处发生，不切断句子。
  const SPLIT = MAP && Number(MAP.slideSplitChars) > 0 ? Number(MAP.slideSplitChars) : 0;
  const SPLITTABLE = new Set(['body', 'concept', 'build', 'use', 'verify', 'boundary', 'chain', 'summary']);
  const expanded = [];
  for (const [si, s] of narr.segments.entries()) {
    if (!SPLIT || !SPLITTABLE.has(s.role)) { expanded.push({ ...s, segIndex: si }); continue; }
    const paras = String(s.text).split(/\n\s*\n/);
    let buf = [];
    let len = 0;
    const flushPart = () => {
      if (!buf.length) return;
      expanded.push({ ...s, segIndex: si, text: buf.join('\n\n'), part: true });
      buf = []; len = 0;
    };
    // 单段本身就超长（常见于「代价与边界」这类不带空行的列表/长段）时，
    // 再按句号切一层——只在句子边界断，不切在词中间。
    const splitLong = (p) => {
      if (p.replace(/\s/g, '').length <= SPLIT * 1.25) return [p];
      const parts = p.split(/(?<=[。！？；])/);
      const out = [];
      let cur = '';
      for (const seg of parts) {
        if ((cur + seg).replace(/\s/g, '').length > SPLIT && cur) { out.push(cur); cur = seg; }
        else cur += seg;
      }
      if (cur) out.push(cur);
      return out;
    };
    for (const raw of paras) {
      for (const p of splitLong(raw)) {
        const n = p.replace(/\s/g, '').length;
        if (len + n > SPLIT && buf.length) flushPart();
        buf.push(p); len += n;
      }
    }
    flushPart();
  }
  const slides = expanded.map((s, i) => slideHtml(s, i, expanded.length)).join('\n');

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
.compact{font-size:clamp(19px,1.75vw,27px);line-height:1.85;max-height:70vh;overflow:hidden}
.compact.dense{font-size:clamp(16px,1.42vw,22px);line-height:1.6;max-height:80vh}
.compact.dense table{font-size:14px}
.compact.denser{font-size:clamp(14px,1.22vw,18px);line-height:1.5;max-height:82vh}
.compact.denser table{font-size:12px}
.compact.denser pre{font-size:12px}
.compact h2,.compact h3{font-family:var(--serif);margin:.6em 0 .3em;font-size:1.15em}
.compact pre{background:var(--paper-2);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:15px}
.compact code{background:var(--paper-2);border:1px solid var(--line);border-radius:4px;padding:1px 4px;font-family:var(--mono)}
.compact table{border-collapse:collapse;font-size:16px;width:100%}
.compact th,.compact td{border:1px solid var(--line);padding:5px 8px;text-align:left}
/* 公式（与 site/style.css 同一套规则，保证幻灯片与站点显示一致） */
.math{font-style:italic;font-family:var(--serif)}
.math-block{display:block;text-align:center;font-family:var(--serif);font-size:1.05em;margin:.8em 0}
.math-op,.math-text,.math-rm{font-style:normal}
.math-op{padding:0 .12em}
.math-cal{font-style:normal}
.math-bb{font-style:normal;font-weight:700}
.frac{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;margin:0 .15em;line-height:1.15}
.frac-num{display:block;padding:0 .3em;border-bottom:1px solid currentColor}
.frac-den{display:block;padding:0 .3em}
.math-sqrt{font-style:normal;margin-right:.05em}
.math-line{border-top:1px solid currentColor;font-style:normal;padding-top:.05em}
.math-note{font-size:.8em;font-style:normal}
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

  // ── 单帧模式：?shot=N 只渲染第 N 张，供无头浏览器逐帧截图 ──
  // 截图器需要一张「干净的、正好一屏」的画面，所以这里藏掉其余幻灯片、
  // 关掉滚动吸附、去掉 HUD，并在 title 上打就绪标记（渲染完成前截图会得到空白）。
  const shot=new URLSearchParams(location.search).get('shot');
  if(shot!==null){
    const n=Math.max(0,Math.min(slides.length-1,Number(shot)||0));
    slides.forEach((s,idx)=>{ if(idx!==n) s.style.display='none'; });
    deck.style.overflow='hidden';
    deck.style.scrollSnapType='none';
    const hud=document.getElementById('hud');
    if(hud) hud.style.display='none';
    const target=slides[n];
    if(target){ target.style.borderBottom='0'; target.scrollIntoView({block:'start'}); }
    document.title='SHOT_READY '+n+' of '+slides.length;
    if(window.TCMFigures)window.TCMFigures.mount(document);
    // 只读视图：不绑键盘与点击，避免截图过程中页面状态改变
    return;
  }

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
  // 片↔段的对应关系写进 manifest：拆片之后片数 ≠ 段数，下游（截图、成片）不能靠"第 i 片就是第 i 段"猜
  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify({
    chapter: ch,
    slideCount: expanded.length,
    segmentCount: narr.segments.length,
    slides: expanded.map((s, i) => ({ n: i + 1, segment: s.segIndex + 1, chars: String(s.text).replace(/\s/g, '').length })),
  }, null, 2)}\n`, 'utf8');
  made += 1;
  console.log(`  ✅ ${ch} → slides/index.html (${expanded.length} 张 / ${narr.segments.length} 段, ${(html.length / 1024).toFixed(0)} KB)`);
}

console.log(`\n完成: ${made}/${chapters.length} 个章节的幻灯片`);
console.log('放映: 用浏览器打开 platform/courses/' + target + '/<chapter>/slides/index.html');
console.log('按 p 可打印为 PDF。');
