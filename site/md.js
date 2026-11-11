/**
 * site/md.js — 极简 Markdown → HTML 渲染器（无第三方依赖）
 *
 * 支持本项目章节文档实际用到的子集：
 *   标题 # ## ### ####   段落   无序/有序列表   引用块
 *   围栏代码块 ```lang    行内代码 `x`    粗体 **x**    斜体 *x*
 *   链接 [t](u)           表格   水平线 ---   行内公式 $...$   块公式 $$...$$
 *   图片 ![图注](相对路径) —— 独占一行时渲染为 <figure>+<figcaption>
 *   mermaid 围栏 → <pre class="mermaid">
 *
 * 不支持（有意为之，避免引入依赖与 XSS 面）：原始 HTML 片段、任务列表、脚注。
 * 所有文本先转义再结构化，因此文档里写 <script> 只会显示为文字。
 *
 * 图片的边界与正文同一原则：只接受仓库内相对路径 + 位图/矢量白名单扩展名。
 * 外链（http/https）、上跳（..）、绝对路径、data: 一律降级为可见占位，不静默产出空图——
 * 教材产物是离线单文件，外链图在离线场景必然打不开，悄悄留着比直接标出来更糟。
 */

'use strict';

const math = require('./math');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const IMG_EXT = /\.(svg|png|webp|jpe?g)$/i;

/**
 * 图片路径白名单。返回可用于 src 的字符串，或 null 表示不放行。
 * 放行的只有「仓库内相对路径 + 白名单扩展名」，这条规则同时挡住
 * XSS（javascript: / data:）、离线失效的外链、以及跳出教材目录的上跳路径。
 */
function safeImageSrc(src) {
  const s = String(src == null ? '' : src).trim();
  if (!s) return null;
  if (!IMG_EXT.test(s)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//')) return null;  // http: data: javascript: ...
  if (s.startsWith('/') || s.startsWith('\\')) return null;                // 绝对路径离线无意义
  if (s.split(/[\\/]/).includes('..')) return null;                        // 不许上跳
  return s;
}

function inline(s) {
  let t = esc(s);
  // 行内代码与公式都先抽出来，避免内部内容被后续规则改写。
  // 公式存的是**未转义的 LaTeX 原文**，交给 math.js 渲染（转义在那边做）。
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(esc(c));
    return `\u0000C${codes.length - 1}\u0000`;
  });
  const maths = [];
  // 先处理 $$...$$（块级），再处理 $...$（行内），否则双美元会被单美元规则拆坏
  t = t.replace(/\$\$([^$]+)\$\$/g, (_, m) => {
    maths.push({ src: m, block: true });
    return `\u0000M${maths.length - 1}\u0000`;
  });
  t = t.replace(/\$([^$\n]+)\$/g, (_, m) => {
    maths.push({ src: m, block: false });
    return `\u0000M${maths.length - 1}\u0000`;
  });
  // 图片：必须排在链接规则之前，否则 ![图注](a.svg) 会被 []() 吃掉前半截变成「!<a>」
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const safe = safeImageSrc(src);
    if (!safe) return `<span class="img-broken">[图未放行：${alt || src}]</span>`;
    return `<img class="inline-fig" src="${safe}" alt="${alt}" loading="lazy">`;
  });
  // 链接
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const safe = href.startsWith('http') ? href : href.replace(/\.md$/, '.html');
    return `<a href="${safe}">${text}</a>`;
  });
  // 粗体 / 斜体
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s（(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // 还原行内代码与公式
  t = t.replace(/\u0000C(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  t = t.replace(/\u0000M(\d+)\u0000/g, (_, i) => math.render(maths[Number(i)].src, maths[Number(i)].block ? 'block' : 'inline'));
  return t;
}

function render(markdown) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || 'text';
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (lang === 'mermaid') {
        out.push(`<pre class="mermaid">${esc(buf.join('\n'))}</pre>`);
      } else {
        out.push(
          `<div class="codeblock"><div class="codeblock-lang">${esc(lang)}</div>` +
            `<pre><code class="lang-${esc(lang)}">${esc(buf.join('\n'))}</code></pre></div>`
        );
      }
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const slug = h[2].toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${lvl} id="${slug}">${inline(h[2])}</h${lvl}>`);
      i += 1;
      continue;
    }

    // 水平线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr/>');
      i += 1;
      continue;
    }

    // 动画图占位（白名单：仅 data-figure="slug"，其余原始 HTML 一律转义）
    const fig = line.match(/^<div data-figure="([a-z0-9-]+)"><\/div>\s*$/);
    if (fig) {
      out.push(`<div class="figure-host" data-figure="${fig[1]}"></div>`);
      i += 1;
      continue;
    }

    // 独占一行的图片 → figure + figcaption（图注取 alt）
    // 教材契约要求图有图注，所以 alt 为空时退回文件名，不产出无题图。
    const figImg = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
    if (figImg) {
      const safe = safeImageSrc(figImg[2]);
      const cap = figImg[1].trim();
      if (safe) {
        const autoCap = cap || safe.split(/[\\/]/).pop();
        out.push(
          `<figure class="fig"><img src="${safe}" alt="${esc(cap || autoCap)}" loading="lazy">` +
            `<figcaption>${esc(autoCap)}</figcaption></figure>`
        );
      } else {
        out.push(`<figure class="fig fig-broken"><figcaption>［缺图］${esc(cap || figImg[2])}</figcaption></figure>`);
      }
      i += 1;
      continue;
    }

    // 块级公式：整行 $$...$$
    const blockMath = line.match(/^\$\$(.+)\$\$\s*$/);
    if (blockMath) {
      out.push(math.render(blockMath[1], 'block'));
      i += 1;
      continue;
    }

    // 表格
    if (/^\|/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const head = line.split('|').slice(1, -1).map((c) => c.trim());
      i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        body.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        i += 1;
      }
      let t = '<div class="table-wrap"><table><thead><tr>';
      t += head.map((c) => `<th>${inline(c)}</th>`).join('');
      t += '</tr></thead><tbody>';
      for (const row of body) {
        t += `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`;
      }
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }

    // 引用块
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${render(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // 列表
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const buf = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // 空行
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 段落
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|>\s?|\s*([-*+]|\d+\.)\s|\|)/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    // 兜底：以「|」开头但下一行不是分隔符的行（孤立表格行 / 表格末尾缺分隔）走不到表格分支，
    // 又进不了段落循环 —— 没有这个哨兵就会 i 不动、out 无限增长，最终 RangeError: Invalid array length。
    if (!buf.length) {
      out.push(`<p>${inline(line)}</p>`);
      i += 1;
      continue;
    }
    out.push(`<p>${inline(buf.join('\n'))}</p>`);
  }

  return out.join('\n');
}

/** 抽取 MOTTO / PROBLEM / 双根因 三元组，用于卡片与视频讲稿 */
function extractHeader(markdown) {
  const get = (re) => {
    const m = String(markdown).match(re);
    return m ? m[1].trim() : '';
  };
  return {
    motto: get(/\*\*MOTTO:\*\*\s*(.+)/),
    problem: get(/\*\*PROBLEM:\*\*\s*(.+)/),
    roots: get(/\*\*双根因定位:\*\*\s*(.+)/),
    title: get(/^#\s+(.+)$/m),
  };
}

module.exports = { render, extractHeader, inline, esc };
