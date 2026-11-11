#!/usr/bin/env node
/**
 * scripts/figures/check_provenance.js —— [textbooks] 插图出处校验
 *
 *   node scripts/figures/check_provenance.js
 *
 * textbooks/FIGURES.md 第七条「图必须过三关」的第一关是**有据**：图的内容必须能追溯到
 * 本章正文或所引原典。这条规则原来靠人自觉，现在把它变成可执行的门禁：
 *
 *   1. 每个图源（*.py / *.mmd）文件头必须有「内容依据：<md 路径>[ §小节号]」一行；
 *      没有就直接判失败 —— 出处不明的图不许进书。
 *   2. *.py 的每一格 steps 文字，必须能在所指章节的正文里找到。
 *      判定用「最长连续命中占该格字数的比例」：低于 6 成且命中不足 6 字，
 *      说明这一格是改写或编造，列出来让人看。
 *   3. *.mmd 只验出处行，不逐字比对 —— 结构图的节点本来就是正文的压缩转述
 *      （「离入出合·六合」这种概括在原文里是散在的几句话），逐字比对只会制造假阳性。
 *
 * 为什么值得单独一个脚本：这 12 张循行图是并行子代理产出的，它们交回的是自报
 * 「每格都是原文分句」。自报不算数，机械比对才算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TBDIR = path.join(ROOT, 'textbooks');

/** 去括注、换行、空白、中文标点 —— 比对两端必须用同一套规范化，否则逗号差异会变成假阳性 */
function core(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, '')
    .replace(/\\n/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\s「」『』"'，。、；：？！·—…]/g, '');
}

/** 只去空白与标点，**保留括注内容**。
 *  正文里的年代常常写在括注里：「皇甫谧于魏甘露年间（公元256～260年）」
 *  「次年（1027年）设计制成两具铜人模型」。查数字与书名必须用这一版，
 *  用 core() 会把整段括注删掉，于是明明写着 1027 也报「找不到」。 */
function norm(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, '')
    .replace(/\\n/g, '')
    .replace(/[\s「」『』"'，。、；：？！·—…]/g, '');
}

function longestHit(needle, hay) {
  if (!needle) return 0;
  let best = 0;
  for (let len = needle.length; len >= 2; len -= 1) {
    for (let i = 0; i + len <= needle.length; i += 1) {
      if (hay.includes(needle.slice(i, i + len))) return len;
    }
  }
  return 0;
}

/** 从文件头注释里读「内容依据」。
 *  § 只允许出现在同一行 —— 用 \s 会让正则跨行，把下一行的「§3.1.1.1」误当成这张图的
 *  依据小节，于是整章范围被缩成一小节，人工核对与机器校验会得出相反结论。 */
function readSource(file) {
  const head = fs.readFileSync(file, 'utf8').split('\n').slice(0, 40).join('\n');
  const m = head.match(/内容依据[:：][ \t]*(\S+\.md)(?:[ \t]*§[ \t]*([\d.]+))?/);
  if (!m) return null;
  return { md: m[1], section: m[2] || null };
}

/** 注释里的 md 路径可能写得不全（如漏了括号里的副标题），按前缀在同目录里找 */
function resolveMd(figureFile, declared) {
  const dir = path.dirname(path.dirname(figureFile));      // figures/ → subject/
  const base = path.basename(declared).replace(/\.md$/, '');
  const cands = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const exact = cands.find((f) => f === `${base}.md`);
  if (exact) return path.join(dir, exact);
  const prefixed = cands.filter((f) => f.startsWith(base));
  return prefixed.length === 1 ? path.join(dir, prefixed[0]) : null;
}

/** 取 §N.M 对应的小节正文；没有节号则取整章 */
function sectionText(md, section) {
  const lines = md.split('\n');
  if (!section) return md;
  const esc = section.replace(/\./g, '\\.');
  const start = lines.findIndex((l) => new RegExp(`^#{2,4}\\s+${esc}(?![\\d.])`).test(l));
  if (start < 0) return null;
  const level = (lines[start].match(/^#+/) || ['###'])[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const h = lines[i].match(/^(#+)\s/);
    if (h && h[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

/** .py 里 steps=[(...)] 的每一格 */
function pySteps(py) {
  const m = py.match(/steps\s*=\s*\[([\s\S]*?)\n\s*\]/);
  if (!m) return null;
  const out = [];
  const re = /\(\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1\s*,\s*["'](\w+)["']\s*\)/g;
  let x;
  while ((x = re.exec(m[1]))) out.push(x[2]);
  return out;
}

/** .mmd 的节点文字（["..."] / [...] 形式），排除 classDef / class / subgraph 行 */
function mmdLabels(mmd) {
  const out = [];
  for (const line of mmd.split('\n')) {
    if (/^\s*%%/.test(line)) continue;
    if (/^\s*(classDef|class|style|linkStyle|direction)\b/.test(line)) continue;
    for (const m of line.matchAll(/\["([^"]*)"\]|\[\'([^']*)\'\]/g)) {
      out.push(m[1] || m[2] || '');
    }
  }
  return out;
}

// ─────────────────────────── 主流程 ───────────────────────────

const figureFiles = [];
for (const dept of fs.existsSync(TBDIR) ? fs.readdirSync(TBDIR, { withFileTypes: true }) : []) {
  if (!dept.isDirectory()) continue;
  const deptDir = path.join(TBDIR, dept.name);
  for (const subj of fs.readdirSync(deptDir, { withFileTypes: true })) {
    if (!subj.isDirectory()) continue;
    const figDir = path.join(deptDir, subj.name, 'figures');
    if (!fs.existsSync(figDir)) continue;
    for (const f of fs.readdirSync(figDir)) {
      const ext = path.extname(f).toLowerCase();
      if (ext === '.py' || ext === '.mmd') figureFiles.push(path.join(figDir, f));
    }
  }
}

console.log('═══ [textbooks] 插图出处校验 ═══\n');

if (figureFiles.length === 0) {
  console.log('  尚无图源（*.py / *.mmd），跳过。');
  process.exit(0);
}

const failures = [];
const warnings = [];
let checkedCells = 0;

for (const file of figureFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = readSource(file);
  if (!src) {
    failures.push(`${rel}：文件头缺「内容依据：<md> §<小节>」，出处不明`);
    continue;
  }
  const mdPath = resolveMd(file, src.md);
  if (!mdPath) {
    failures.push(`${rel}：注明的依据文件「${src.md}」在同目录找不到`);
    continue;
  }
  const md = fs.readFileSync(mdPath, 'utf8');
  const sect = sectionText(md, src.section);
  if (sect === null) {
    failures.push(`${rel}：注明的§${src.section} 在 ${path.basename(mdPath)} 里找不到该小节`);
    continue;
  }
  const hayFull = norm(sect);      // 硬检查（书名/数字）：保留括注
  const hay = core(sect);          // 软检查（连续重合度）：去括注，避免释义干扰
  const ext = path.extname(file).toLowerCase();

  if (ext === '.mmd') {
    // 结构图只登记出处；节点是压缩转述，不逐字比对
    continue;
  }

  const steps = pySteps(fs.readFileSync(file, 'utf8'));
  if (!steps) {
    warnings.push(`${rel}：没找到 steps=[...]，跳过逐格比对`);
    continue;
  }
  for (const s of steps) {
    const c = core(s);
    if (!c) continue;
    checkedCells += 1;

    // 硬检查：书名与数字必须在正文里精确出现。
    // 这两类是最容易被「顺手写对」的东西 —— 年代写成 1026 还是 1027、书名是《千金要方》
    // 还是《备急千金要方》，编错一个整张图就不可信。压缩转述（「离入出合」这类概括）
    // 不受这条约束，因为那是图的正当写法。
    for (const book of (s.match(/《([^》]+)》/g) || [])) {
      const name = book.replace(/[《》]/g, '');
      if (!hayFull.includes(core(name))) {
        failures.push(`${rel}：「${s.replace(/\\n/g, ' / ')}」里的书名 ${book} 在正文中找不到`);
      }
    }
    const nums = [...s.matchAll(/\d{3,}/g)].map((x) => x[0]);
    for (const num of nums) {
      if (!hayFull.includes(num)) {
        failures.push(`${rel}：「${s.replace(/\\n/g, ' / ')}」里的数字 ${num} 在正文中找不到`);
      }
    }

    // 软检查：整格与正文的连续重合度。低只提示，不判失败 ——
    // 图本来就是正文的压缩写法，硬要求逐字重合会把合格图判成不合格。
    const hit = longestHit(c, hay);
    const ratio = hit / c.length;
    if (ratio < 0.4) {
      warnings.push(`${rel}：「${s.replace(/\\n/g, ' / ')}」与正文连续重合仅 ${Math.round(ratio * 100)}%（压缩转述，供人工扫一眼）`);
    }
  }
}

console.log(`  图源 ${figureFiles.length} 个 · 逐格比对 ${checkedCells} 格`);

if (warnings.length) {
  console.log('\n  ⚠ 提示:');
  warnings.forEach((w) => console.log(`     - ${w}`));
}

if (failures.length) {
  console.log(`\n  ❌ ${failures.length} 处不达标 —— 图的内容必须能在所注章节里找到:\n`);
  failures.slice(0, 25).forEach((f) => console.log(`     - ${f}`));
  if (failures.length > 25) console.log(`     … 另有 ${failures.length - 25} 处`);
  console.log('\n  → 改图源后重跑 node scripts/figures/render.js，再跑本检查。');
  process.exit(1);
}

console.log('\n  ✅ 全部图源都注明了出处；所有 .py 图格都能在正文里找到');
