#!/usr/bin/env node
/**
 * tests/test_math_render.js — LaTeX 子集渲染器测试
 *
 * site/math.js 是自研的零依赖公式渲染器（站点与幻灯片共用）。它有三个必须成立的性质：
 *   1. 章节文档里实际用到的每个 LaTeX 命令都能渲染（没有一个漏成裸源码）
 *   2. 结构正确：分式真的上下堆叠、上下标真的用 sup/sub
 *   3. 退化安全：未知命令不静默吞掉、文本被转义（公式里不能注入 HTML）
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const math = require('../site/math');

// ── 1. 章节文档里真实出现的公式，全部逐条渲染 ────────────────

/** 从章节文档中抽出全部 $...$ / $$...$$ 公式源码 */
function extractFormulas() {
  const out = [];
  const dir = path.join(ROOT, 'departments');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name !== 'zh.md') continue;
      const raw = fs.readFileSync(p, 'utf8');
      // 代码块里的 $ 不是公式：shell 变量、正则、模板串都会出现成对的 $，
      // 原样抽出来会把 `node -e "...const u=..."` 当成 LaTeX（实测出现未知命令 u）。
      const body = raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      for (const m of body.matchAll(/\$\$([^$]+)\$\$/g)) out.push({ file: p, src: m[1] });
      for (const m of body.matchAll(/(?<!\$)\$([^$\n]+)\$(?!\$)/g)) out.push({ file: p, src: m[1] });
    }
  };
  walk(dir);
  return out;
}

const formulas = extractFormulas();

test('章节文档里确实有公式可测（否则本套件形同虚设）', () => {
  assert.ok(formulas.length >= 8, `只抽到 ${formulas.length} 个公式`);
});

test('每个公式渲染后都不残留裸 LaTeX 命令', () => {
  const problems = [];
  for (const f of formulas) {
    const html = math.render(f.src, 'block');
    // 残留的 \cmd 说明有命令没被处理
    for (const m of html.matchAll(/\\([a-zA-Z]+)/g)) {
      problems.push(`${path.relative(ROOT, f.file)}: 「${m[0]}」未渲染 → ${f.src.trim().slice(0, 60)}`);
    }
    // 残留的未配对 $ 说明定界符处理有误
    if (html.includes('$')) {
      problems.push(`${path.relative(ROOT, f.file)}: 渲染结果残留 "$" → ${f.src.trim().slice(0, 60)}`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('渲染器没有遇到任何未知命令（构建时应保持为空）', () => {
  for (const f of formulas) math.render(f.src, 'block');
  const unknown = math.takeUnknown();
  assert.deepStrictEqual(unknown, [], `未知 LaTeX 命令: ${unknown.join(', ')}`);
});

// ── 2. 结构正确性 ────────────────────────────────────────────

test('\\frac 渲染为上下堆叠结构，而不是斜杠近似', () => {
  const html = math.render(String.raw`\frac{1}{1+e^{-z}}`, 'inline');
  assert.ok(html.includes('class="frac"'), '缺少分式容器');
  assert.ok(html.includes('frac-num') && html.includes('frac-den'), '缺少分子/分母');
  assert.ok(html.includes('>1<') && html.includes('1+e'), '分子分母内容错位');
  assert.ok(!html.includes('1/(1'), '退化成了斜杠近似');
});

test('嵌套分式与分组：\\frac{\\partial L}{\\partial \\mathbf{w}}', () => {
  const html = math.render(String.raw`\frac{\partial L}{\partial \mathbf{w}}`, 'inline');
  const num = html.match(/frac-num">([\s\S]*?)<\/span>/)[1];
  const den = html.match(/frac-den">([\s\S]*?)<\/span>/)[1];
  assert.ok(num.includes('∂') && num.includes('L'), `分子未渲染 ∂L: ${num}`);
  assert.ok(den.includes('∂') && den.includes('<b>w</b>'), `分母未渲染 ∂w（含加粗）: ${den}`);
});

test('上下标渲染为 sup/sub，且支持花括号分组', () => {
  const html = math.render(String.raw`e^{-z} + x_i + w_k^\top`, 'inline');
  assert.ok(/<sup>-z<\/sup>/.test(html), `e^{-z} 未渲染为 sup: ${html}`);
  assert.ok(/<sub>i<\/sub>/.test(html), 'x_i 未渲染为 sub');
  // ^\top 已被规范化：\top 本身是上标字符，不应再套一层 sup
  assert.ok(html.includes('ᵀ'), '\\top 未映射为上标 T');
  assert.ok(!/<sup><sup>/.test(html), '出现双层上标');
});

test('\\sum 的下标不会被当作普通字符', () => {
  const html = math.render(String.raw`\sum_{j=1}^{K} e^{z_j}`, 'inline');
  assert.ok(html.includes('∑'), '\\sum 未映射为 ∑');
  assert.ok(/<sub>j=1<\/sub>/.test(html), `下标 j=1 未成组: ${html}`);
  assert.ok(/<sup>K<\/sup>/.test(html), '上标 K 未渲染');
});

test('\\mathbf 加粗、\\text 正体、\\mathcal 花体各得其位', () => {
  assert.ok(/<b>x<\/b>/.test(math.render(String.raw`\mathbf{x}`, 'inline')));
  assert.ok(/math-text/.test(math.render(String.raw`\text{交叉熵}`, 'inline')));
  assert.ok(/交叉熵/.test(math.render(String.raw`\text{交叉熵}`, 'inline')));
  assert.ok(/math-cal/.test(math.render(String.raw`\mathcal{L}`, 'inline')));
});

test('\\underbrace{A}_{B} 保留主体并挂上下标注记', () => {
  const html = math.render(String.raw`\underbrace{-N^{-1}\sum_i \log p_i}_{\text{交叉熵}}`, 'inline');
  assert.ok(html.includes('交叉熵'), '下标注记丢失');
  assert.ok(html.includes('math-note'), '未标记为注释下标');
  assert.ok(html.includes('∑'), '主体内容丢失');
});

test('间距命令与运算符：\\, \\cdot \\leftarrow \\nabla \\lambda \\qquad', () => {
  const html = math.render(String.raw`\theta \leftarrow \theta - \eta \nabla_\theta L \cdot \lambda \qquad \text{ok}`, 'inline');
  assert.ok(html.includes('θ'), '\\theta 未映射');
  assert.ok(html.includes('←'), '\\leftarrow 未映射');
  assert.ok(html.includes('η'), '\\eta 未映射');
  assert.ok(html.includes('∇'), '\\nabla 未映射');
  assert.ok(html.includes('λ'), '\\lambda 未映射');
  assert.ok(html.includes('·'), '\\cdot 未映射');
});

test('中英混排：中文、数字、下标共存', () => {
  const html = math.render(String.raw`K(t) = \sum_i 知识学分_i \cdot e^{-age_i / \tau}`, 'inline');
  assert.ok(html.includes('知识学分'), '中文丢失');
  assert.ok(/<sub>i<\/sub>/.test(html), '下标丢失');
  assert.ok(html.includes('τ'), '\\tau 未映射');
  assert.ok(html.includes('∑'), '\\sum 未映射');
});

// ── 3. 退化安全 ──────────────────────────────────────────────

test('未知命令保留名字并记入 unknown，不静默吞掉', () => {
  const html = math.render(String.raw`\foobar{x} + \omega`, 'inline');
  assert.ok(html.includes('foobar'), '未知命令的名字被吞掉了，作者会看不到自己写了什么');
  assert.ok(html.includes('ω'), '已知命令仍应正常');
  const unknown = math.takeUnknown();
  assert.ok(unknown.includes('foobar'), `未知命令未上报: ${unknown.join(', ')}`);
  assert.ok(!unknown.includes('omega'), '已知命令被误报为未知');
});

test('公式内不得注入 HTML（尖括号与 & 被转义）', () => {
  const html = math.render(String.raw`<script>alert(1)</script> & a < b`, 'inline');
  assert.ok(!html.includes('<script>'), '原始 script 标签未被转义');
  assert.ok(html.includes('&lt;script&gt;'), '应转义为实体');
  assert.ok(html.includes('&amp;'), '& 未转义');
});

test('空输入与只有定界符的输入不抛异常', () => {
  for (const s of ['', '   ', '$$', '$ $']) {
    assert.doesNotThrow(() => math.render(s, 'inline'), `输入 ${JSON.stringify(s)} 抛异常`);
  }
});

test('未配对的括号不会挂死（健壮性）', () => {
  for (const s of [String.raw`\frac{1}{`, String.raw`\frac{1}2`, String.raw`x^{`, String.raw`\mathbf{`]) {
    assert.doesNotThrow(() => math.render(s, 'inline'), `输入 ${s} 抛异常`);
  }
});

// ── 4. 与 md.js 的集成 ───────────────────────────────────────

test('md.render 把整行 $$...$$ 渲染为块级公式，不残留定界符', () => {
  const md = require('../site/md');
  const html = md.render('$$p = \\sigma(z) = \\frac{1}{1+e^{-z}}$$');
  assert.ok(html.includes('math-block'), '未渲染为块级');
  assert.ok(html.includes('class="frac"'), '分式未渲染');
  assert.ok(!html.includes('$$'), '残留了 $$ 定界符');
  assert.ok(!html.includes('\\sigma'), '残留了 \\sigma 命令');
});

test('md.render 把行内 $...$ 渲染为行内公式', () => {
  const md = require('../site/md');
  const html = md.render('特征是 $\\mathbf{x}$，打分是 $z = \\mathbf{w}^\\top\\mathbf{x} + b$。');
  assert.ok((html.match(/class="math"/g) || []).length === 2, `行内公式数量不对: ${html}`);
  assert.ok(!html.includes('$'), '残留了 $ 定界符');
  assert.ok(!html.includes('\\mathbf'), '残留了 \\mathbf');
});

test('公式内出现 $ 时不会把后续正文吞掉', () => {
  const md = require('../site/md');
  const html = md.render('价格是 $5 和 $8，一共 $13。');
  assert.ok(html.includes('一共'), '后续正文被吞掉了');
  assert.ok(html.includes('13'), '数字被吞掉了');
});
