/**
 * site/md.js — 极简 Markdown → HTML 渲染器（无第三方依赖）
 *
 * 支持本项目章节文档实际用到的子集：
 *   标题 # ## ### ####   段落   无序/有序列表   引用块
 *   围栏代码块 ```lang    行内代码 `x`    粗体 **x**    斜体 *x*
 *   链接 [t](u)           表格   水平线 ---   行内公式 $...$   块公式 $$...$$
 *   mermaid 围栏 → <pre class="mermaid">
 *
 * 不支持（有意为之，避免引入依赖与 XSS 面）：原始 HTML 片段、任务列表、脚注。
 * 所有文本先转义再结构化，因此文档里写 <script> 只会显示为文字。
 */

'use strict';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  let t = esc(s);
  // 行内代码优先，避免内部内容被后续规则改写
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  // 块公式 $$...$$ 与行内公式 $...$
  t = t.replace(/\$\$([^$]+)\$\$/g, (_, m) => `<span class="math-block">${m.trim()}</span>`);
  t = t.replace(/\$([^$\n]+)\$/g, (_, m) => `<span class="math">${m.trim()}</span>`);
  // 链接
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const safe = href.startsWith('http') ? href : href.replace(/\.md$/, '.html');
    return `<a href="${safe}">${text}</a>`;
  });
  // 粗体 / 斜体
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s（(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // 还原行内代码
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
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
