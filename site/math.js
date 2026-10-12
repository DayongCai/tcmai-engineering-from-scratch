/**
 * site/math.js — LaTeX 子集 → HTML（零依赖）
 *
 * 为什么不用 KaTeX / MathJax:
 *   本项目的硬约束是「标准库优先、零第三方依赖」，而这两个库都是数百 KB。
 *   章节文档用到的 LaTeX 是**有限子集**（分式、上下标、希腊字母、常见算子），
 *   自己渲染这一子集只用一百多行，且渲染结果是纯 HTML —— 站点、幻灯片、
 *   打印/PDF 输出全部通用，不需要额外字体或运行时。
 *
 * 渲染成什么:
 *   \frac{a}{b}      → 真正的上下堆叠分式（HTML + CSS，不是斜杠近似）
 *   ^{...} _{...}    → <sup>/<sub>
 *   \sigma \lambda   → σ λ（Unicode）
 *   \mathbf{x}       → <b>x</b>
 *   \text{交叉熵}    → 交叉熵（正体）
 *   \cos \max \log   → cos max log（普通函数名）
 *
 * 未知命令不静默吞掉：去掉反斜杠保留名字（让作者至少能看到自己写了什么），
 * 同时把命令名收集进 `unknown`，由 site/build.js 在构建时打印出来。
 */

'use strict';

/** 希腊字母与常见数学符号 */
const SYMBOLS = {
  // 小写希腊
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  // 大写希腊
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // 算子与关系
  partial: '∂', nabla: '∇', infty: '∞', cdot: '·', times: '×', div: '÷',
  pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
  approx: '≈', equiv: '≡', propto: '∝', sim: '∼', ll: '≪', gg: '≫',
  sum: '∑', prod: '∏', int: '∫', sqrt: '√', bigcup: '⋃', bigcap: '⋂',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', cup: '∪', cap: '∩',
  forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', leftrightarrow: '↔',
  mapsto: '↦', implies: '⟹', iff: '⟺',
  ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  // 范数记号 \|x\| —— LaTeX 里 \| 就是双竖线。漏掉它不会报错，
  // 只会让 \|a\| 渲染成「去掉反斜杠的竖线」，看起来"差不多对"但其实是错的排版。
  '|': '‖',
  // 排版类（作为命令处理，不产出字符）
  top: 'ᵀ',
};

/** 函数名：以正体渲染，不斜体（与变量区分） */
const FUNCTION_NAMES = new Set([
  'cos', 'sin', 'tan', 'cot', 'sec', 'csc', 'arccos', 'arcsin', 'arctan',
  'log', 'ln', 'lg', 'exp', 'max', 'min', 'argmax', 'argmin', 'sup', 'inf',
  'lim', 'det', 'dim', 'ker', 'deg', 'gcd', 'mod', 'Pr', 'sgn',
]);

/** 排版命令：吃掉参数，保留内容并施加样式 */
const WRAPPERS = {
  mathbf: (x) => `<b>${x}</b>`,
  mathrm: (x) => `<span class="math-rm">${x}</span>`,
  mathit: (x) => `<i>${x}</i>`,
  mathcal: (x) => `<span class="math-cal">${x}</span>`,
  mathbb: (x) => `<span class="math-bb">${x}</span>`,
  mathsf: (x) => x,
  mathtt: (x) => `<code>${x}</code>`,
  text: (x) => `<span class="math-text">${x}</span>`,
  textrm: (x) => `<span class="math-text">${x}</span>`,
  operatorname: (x) => `<span class="math-op">${x}</span>`,
  overline: (x) => `<span class="math-line">${x}</span>`,
  bar: (x) => `<span class="math-line">${x}</span>`,
  hat: (x) => `<span class="math-hat">${x}</span>`,
  vec: (x) => `<span class="math-line">${x}</span>`,
  left: () => '',
  right: () => '',
  bigl: () => '',
  bigr: () => '',
  Bigl: () => '',
  Bigr: () => '',
  Big: () => '',
  big: () => '',
  displaystyle: () => '',
  limits: () => '',
};

/** 间距命令 */
const SPACES = {
  ',': '\u2009', ';': '\u2005', ':': '\u2005', '!': '', ' ': ' ', quad: '\u2001', qquad: '\u2001\u2001',
};

const unknown = new Set();

/** 从 `{` 处读一个平衡的 {...} 组；返回 [内容, 结束下标] 或 null */
function readGroup(s, i) {
  if (s[i] !== '{') return null;
  let depth = 0;
  for (let j = i; j < s.length; j += 1) {
    if (s[j] === '\\') { j += 1; continue; }
    if (s[j] === '{') depth += 1;
    else if (s[j] === '}') {
      depth -= 1;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return null;
}

/** 读一个「参数」：可能是 {组}，也可能是单个字符 */
function readArg(s, i) {
  const g = readGroup(s, i);
  if (g) return g;
  if (i >= s.length) return ['', i];
  return [s[i], i + 1];
}

/** \frac{a}{b} → 上下堆叠 */
function readFrac(s, i) {
  const a = readGroup(s, i);
  if (!a) return null;
  const b = readGroup(s, a[1]);
  if (!b) return null;
  // 分式内部继续递归处理，所以嵌套分式也成立
  return [
    `<span class="frac"><span class="frac-num">${convert(a[0])}</span>`
    + `<span class="frac-den">${convert(b[0])}</span></span>`,
    b[1],
  ];
}

/** \underbrace{A}_{B} → A 后跟一个下标注记 */
function readUnderbrace(s, i) {
  const a = readGroup(s, i);
  if (!a) return null;
  let j = a[1];
  let note = '';
  while (j < s.length && /\s/.test(s[j])) j += 1;
  if (s[j] === '_') {
    const n = readArg(s, j + 1);
    note = n[0];
    j = n[1];
  }
  const body = convert(a[0]);
  return [note ? `${body}<sub class="math-note">${convert(note)}</sub>` : body, j];
}

/**
 * 转换一段 LaTeX 为 HTML。输入不含 $ 定界符。
 * 输出是 HTML 片段，其中的文本部分已转义。
 */
function convert(latex) {
  const s = String(latex);
  let out = '';
  let i = 0;

  const pushText = (t) => {
    out += t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  while (i < s.length) {
    const c = s[i];

    // \命令
    if (c === '\\') {
      const m = s.slice(i + 1).match(/^([a-zA-Z]+|.)/);
      if (!m) { i += 1; continue; }
      const name = m[1];
      let j = i + 1 + name.length;

      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        const r = readFrac(s, j);
        if (r) { out += r[0]; i = r[1]; continue; }
      }
      if (name === 'underbrace') {
        const r = readUnderbrace(s, j);
        if (r) { out += r[0]; i = r[1]; continue; }
      }
      if (name === 'sqrt') {
        const a = readArg(s, j);
        out += `<span class="math-sqrt">√</span><span class="math-line">${convert(a[0])}</span>`;
        i = a[1];
        continue;
      }
      if (name in WRAPPERS) {
        const a = readArg(s, j);
        out += WRAPPERS[name](convert(a[0]));
        i = a[1];
        continue;
      }
      if (name === ',') {
        // \, 与 \; 等间距命令：name 已被 regex 取为单个字符
        out += '\u2009';
        i = j;
        continue;
      }
      if (name in SPACES) { out += SPACES[name]; i = j; continue; }
      if (name in SYMBOLS) { pushText(SYMBOLS[name]); i = j; continue; }
      if (FUNCTION_NAMES.has(name)) {
        // 函数名以正体渲染：与斜体变量区分开，这是数学排版的常规要求
        out += `<span class="math-op">${name}</span>`;
        i = j;
        continue;
      }

      // 未知命令：保留名字（去掉反斜杠），并记录以便构建时报警
      unknown.add(name);
      pushText(/^[a-zA-Z]+$/.test(name) ? name : '');
      i = j;
      continue;
    }

    // 上下标
    if (c === '^' || c === '_') {
      const tag = c === '^' ? 'sup' : 'sub';
      const a = readArg(s, i + 1);
      out += `<${tag}>${convert(a[0])}</${tag}>`;
      i = a[1];
      continue;
    }

    // 普通字符（含中文、数字、运算符）
    if (c === '{' || c === '}') { i += 1; continue; }   // 已被消费的分组括号
    if (c === '~') { out += '\u00a0'; i += 1; continue; }
    if (c === '&') { out += '&amp;'; i += 1; continue; }
    if (c === '<') { out += '&lt;'; i += 1; continue; }
    if (c === '>') { out += '&gt;'; i += 1; continue; }
    out += c;
    i += 1;
  }

  return out;
}

/**
 * 渲染一个数学片段（含或不含定界符均可）。
 * @param {string} latex 数学源码
 * @param {'inline'|'block'} mode 块级公式会独占一行、居中
 */
function render(latex, mode) {
  const src = String(latex).trim().replace(/^\$\$?/, '').replace(/\$\$?$/, '');
  const body = convert(preNormalize(src));
  return mode === 'block'
    ? `<span class="math-block">${body}</span>`
    : `<span class="math">${body}</span>`;
}

/** 构建时用：取走累计的未知命令，并清空 */
function takeUnknown() {
  const list = [...unknown].sort();
  unknown.clear();
  return list;
}

/** `^\\top` 这种写法里，\top 已经是上标字符，不需要再套一层 sup */
function preNormalize(s) {
  return String(s).replace(/\^\s*\\top\b/g, '\\top');
}

module.exports = { render, convert: (s) => convert(preNormalize(s)), takeUnknown };
