#!/usr/bin/env node
/**
 * scripts/check_links.js — 内部链接检查（仓库内的相对链接与锚点）
 *
 *   node scripts/check_links.js              报告全部断链
 *   node scripts/check_links.js --strict     有断链则退出码 1（CI 用）
 *   node scripts/check_links.js --json       机器可读
 *   node scripts/check_links.js --path README.md
 *
 * 为什么需要它：文档里的相对路径和锚点**不会因为文件改名而自动更新**，
 * 而断链的失败形态是安静的 —— 点不动而已，没有任何东西会报错。
 * 本仓库跨文件引用很多（README → standards/、文档 → 代码、生成的索引 → 各章），
 * 没有这道门，「见 xxx.md」这类句子迟早会指向不存在的文件。
 *
 * 只管**内部**链接：外链要发 HTTP 请求，是另一回事（且离线时不该失败）。
 * 明确不检查：代码块内的路径、纯文字里的路径（那是指代不是链接，见 --mentions 说明）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const AS_JSON = argv.includes('--json');
const pathIdx = argv.indexOf('--path');
const ONLY = pathIdx >= 0 ? argv[pathIdx + 1] : null;

const SKIP_DIRS = new Set(['.git', 'node_modules', '.link-cache', 'dist']);
// 源材料全本（几万行、非本仓库撰写）与站点快照（生成物）不查：它们不是"我们的文档"
const SKIP_DIR_PARTS = [
  path.join('standards', 'materials') + path.sep,
  path.join('site', 'snapshot') + path.sep,
  'textbooks' + path.sep + 'build' + path.sep,
  'templates' + path.sep,          // 图案而非文档：里面的相对路径给实例化后的章节用
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      // 注意：要比对「目录路径 + 分隔符」。只比 full 会漏掉顶层目录
      // （full 结尾没有分隔符，'templates' 就匹配不上 'templates/'）。
      if (SKIP_DIR_PARTS.some((p) => `${full}${path.sep}`.includes(p))) continue;
      // 教材的**单书构建目录**（textbooks/<dept>/<subject>/build/）：聚合 md 与图都是生成物，
      // 且 EPUB/PDF 成品已在 .gitignore；不纳入链接检查（否则每次都报「目标不存在」）。
      if (e.name === 'build' && `${full}${path.sep}`.includes('textbooks' + path.sep)) continue;
      walk(full, out);
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** GitHub 风格锚点化：去掉标点、空格转连字符；保留 CJK 与字母数字 */
function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\](){}<>「」『』【】《》""''。，、；：？！…—–·|/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 取一个 md 文件里所有标题锚点（含显式 <a name=…>） */
function anchorsOf(file) {
  const set = new Set();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return set; }
  for (const line of text.split('\n')) {
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) { set.add(slugify(h[1])); set.add(slugify(h[1].replace(/^\d+(\.\d+)*[.、]?\s*/, ''))); }
  }
  for (const m of text.matchAll(/<a\s+[^>]*name=["']([^"']+)["']/gi)) set.add(slugify(m[1]));
  return set;
}

/** 抽出 md 里的链接目标： [text](target) 与 <a href="target"> */
function linksIn(text) {
  const out = [];
  const lines = text.split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;                       // 代码块里的不是链接
    // 行内代码（`…`）里的也不是链接 —— GitHub 不会把它渲染成链接。
    // 反例（真实踩到过）：CHANGELOG 为了说明「旧渲染器不认 `![图注](x.svg)`」，
    // 把这句话放进了反引号；不剥行内代码，这段**举例**就会被判成一处真断链。
    const line2 = line.replace(/`[^`]*`/g, '');
    for (const m of line2.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      out.push({ target: m[1], line: i + 1 });
    }
    for (const m of line2.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)) {
      out.push({ target: m[1], line: i + 1 });
    }
  });
  return out;
}

const EXTERNAL = /^(https?:|mailto:|tel:|data:)/i;

// ── 「声明了但还不存在」的路径：用来区分「断链」与「尚未开工」─────────
//
// 这份大纲有 120 学科 / 1086 章节，目前只建了 1 个学科 3 章。README 与目录类文档
// 指向**尚未开工**的学科是正常的（那是在列大纲），不是错 ——
// 把 100 多处前瞻引用一律判为断链，这条门就会被人忽略，等于没有。
//
// **但判据必须精确**：只有「curriculum 里声明了、而目录真的还不存在」的学科才算未开工。
// 第一版写成「凡在已声明前缀之下就算未开工」，结果把**已建学科内部**的路径写错
// （docs/zh.md 里写 `outputs/…`，实为 `../outputs/…`）也吞掉了 —— 那是真断链。
let UNBUILT_PREFIXES = [];
function loadDeclared() {
  const declared = [];
  try {
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
    for (const d of cat.departments || []) {
      const deptBase = (d.path || path.join('departments', d.slug)).replace(/\\/g, '/').replace(/\/+$/, '');
      declared.push(deptBase);
      for (const s of d.subjects || []) declared.push(`${deptBase}/${s.slug}`);
    }
  } catch { /* 没有 catalog.json 就退化为「全部算断链」 */ }
  // 「尚未开工」的判据：**目录不存在，或存在但里面一个文件都没有**。
  // 不能只看存在性 —— `npm run build` 会把 120 个学科目录全建出来（空目录），
  // 那样判据就随"上次有没有跑过构建"而变，而 git 又不跟踪空目录，
  // 于是同一份仓库在不同机器上给出不同结论。
  const hasFiles = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return false;
    const stack = [abs];
    while (stack.length) {
      const cur = stack.pop();
      let entries;
      try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (e.isFile()) return true;
        if (e.isDirectory()) stack.push(path.join(cur, e.name));
      }
    }
    return false;
  };
  return [...new Set(declared)]
    .filter((p) => !hasFiles(p))
    .sort((a, b) => b.length - a.length);   // 长前缀优先
}
UNBUILT_PREFIXES = loadDeclared();

const relToRoot = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');
function declaredUnbuilt(absPath) {
  const rel = relToRoot(absPath).replace(/\/+$/, '');
  return UNBUILT_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`));
}

// 模板里的 `<slug>` 是占位符，不是链接目标；含 <> 的一律不检查
const isPlaceholder = (t) => /[<>]/.test(t);

// templates/ 是**图案**不是文档：里面的相对路径是给实例化后的章节用的
const SKIP_LINK_DIRS = ['templates' + path.sep];

function checkFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const problems = [];
  const anchorCache = new Map();

  for (const { target, line } of linksIn(text)) {
    if (EXTERNAL.test(target) || target.startsWith('//')) continue;
    if (isPlaceholder(target)) continue;          // `<slug>` 类占位符不是链接

    const hashIdx = target.indexOf('#');
    let filePart = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
    const anchor = hashIdx >= 0 ? target.slice(hashIdx + 1) : '';

    // URL 解码（%20 等）
    try { filePart = decodeURIComponent(filePart); } catch { /* 原样 */ }

    let resolved = filePart === '' ? file : path.resolve(dir, filePart);
    // 目录链接：指向目录也算有效（README 常这么写）
    let exists = fs.existsSync(resolved);
    let isDir = false;
    if (exists) { try { isDir = fs.statSync(resolved).isDirectory(); } catch { isDir = false; } }
    if (!exists) {
      // 无扩展名的链接，试着补 .md
      for (const ext of ['.md', '/README.md']) {
        if (fs.existsSync(resolved + ext)) { resolved += ext; exists = true; break; }
      }
    }

    if (!exists) {
      // 指向已声明但尚未开工的学科/院系 —— 是前瞻引用，不是断链
      if (declaredUnbuilt(resolved)) {
        problems.push({ file: rel, line, target, kind: 'unbuilt', reason: '声明的学科/院系，尚未开工' });
      } else {
        problems.push({ file: rel, line, target, kind: 'broken', reason: '目标不存在' });
      }
      continue;
    }
    if (!anchor || isDir) continue;

    const targetFile = resolved.endsWith('.md') ? resolved : null;
    if (!targetFile) continue;
    if (!anchorCache.has(targetFile)) anchorCache.set(targetFile, anchorsOf(targetFile));
    const anchors = anchorCache.get(targetFile);
    const want = slugify(anchor);
    if (want && !anchors.has(want)) {
      problems.push({ file: rel, line, target, kind: 'broken', reason: `锚点 #${anchor} 在目标文件中不存在` });
    }
  }
  return problems;
}

// ── 主流程 ────────────────────────────────────────────────────────────

const files = ONLY
  ? [path.resolve(ROOT, ONLY)]
  : walk(ROOT);

const all = [];
let scanned = 0;
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`✗ 路径不存在: ${ONLY}`); process.exit(1); }
  scanned += 1;
  all.push(...checkFile(f));
}

if (AS_JSON) {
  console.log(JSON.stringify({
    scanned,
    broken: all.filter((p) => p.kind !== 'unbuilt').length,
    declaredUnbuilt: all.filter((p) => p.kind === 'unbuilt').length,
    problems: all,
  }, null, 2));
  process.exit(STRICT && all.some((p) => p.kind !== 'unbuilt') ? 1 : 0);
}

console.log('═══ 内部链接检查 ═══\n');
console.log(`  扫描 ${scanned} 个 Markdown 文件（跳过 .git / node_modules / 源材料全本 / 站点快照）`);
console.log(`  已声明但尚未开工的路径 ${UNBUILT_PREFIXES.length} 条（来自 catalog.json，用于区分断链与未开工）`);

const broken = all.filter((p) => p.kind !== 'unbuilt');
const unbuilt = all.filter((p) => p.kind === 'unbuilt');

if (!all.length) {
  console.log('\n  ✅ 未发现断链，也没有未开工引用');
  process.exit(0);
}

if (broken.length) {
  console.log(`\n  ❌ 断链 ${broken.length} 处：\n`);
  const byFile = new Map();
  for (const p of broken) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }
  for (const [file, ps] of [...byFile.entries()].sort()) {
    console.log(`  ${file}`);
    for (const p of ps) console.log(`    L${p.line}  ${p.target}  → ${p.reason}`);
  }
  console.log(`\n  断链 ${broken.length} 处 · ${new Set(broken.map((p) => p.file)).size} 个文件`);
} else {
  console.log('\n  ✅ 无断链');
}

if (unbuilt.length) {
  const files = new Set(unbuilt.map((p) => p.file));
  console.log(`\n  ⬚ 指向尚未开工的学科/院系 ${unbuilt.length} 处（前瞻引用，不计为失败）· ${files.size} 个文件`);
  const sample = [...files].slice(0, 5);
  sample.forEach((f) => console.log(`     ${f}`));
  if (files.size > sample.length) console.log(`     … 另有 ${files.size - sample.length} 个文件`);
  console.log('     这些目标都在 curriculum.json 里声明过，只是还没开工 —— 属正常。');
}

if (broken.length) {
  if (STRICT) { console.log('\n❌ 链接检查未通过'); process.exit(1); }
  console.log('\n（未加 --strict，退出码 0）');
} else {
  console.log('\n✅ 内部链接检查通过');
}
