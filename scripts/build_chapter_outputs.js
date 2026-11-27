#!/usr/bin/env node
/**
 * scripts/build_chapter_outputs.js —— 按补实后的正文重做章节 outputs（prompt / skill）
 *
 * 背景：79 门课程正文已按章题重写，但 3,139 / 4,338 份 ⬚outputs 仍是旧脚手架——
 * 写着「跑 main.js 看三辨分布」「22 单元 / 32,790 汉字」，而新正文与新代码里都没有这些东西。
 * 学生照着操作会当场对不上。
 *
 * 本脚本对**已登记补实**的科目（data/course-docs-rewritten.json）逐章重建两份文件，
 * 内容全部从 `docs/zh.md` 与 `quiz.json` 现算/现取，不写死任何数字：
 *   - 标题、MOTTO 书名篇名、链条（各节标题去编号后串联）
 *   - 节数、汉字数、题量（与 quiz.json 实数一致）
 *   - 判据（正文里的加粗判断句，原样引用）
 *   - 边界（`## 代价与边界` 下的条目，原样引用）+ 免责声明首句
 *
 * 用法：
 *   node scripts/build_chapter_outputs.js           写盘
 *   node scripts/build_chapter_outputs.js --check   只比对，漂移则退出码 1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hz = (s) => (s.match(CJK) || []).length;

function readDocs(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

/** `# 第 1 章 · 医院信息系统的构成：…` → { n, title } */
function parseHead(md) {
  const h1 = (md.match(/^#\s+(.+)$/m) || [, ''])[1].trim();
  const m = h1.match(/^第\s*(\d+)\s*章\s*[·・:：]?\s*(.+)$/);
  if (m) return { n: Number(m[1]), title: m[2].trim() };
  return { n: null, title: h1.replace(/^#\s*/, '').trim() };
}

/** 各节标题（## 级），去编号，串联成链条（结构性小节不入链） */
function sections(md) {
  const SKIP = /^(代价与边界|免责声明|验证|思考题|延伸阅读|图注|课程信息|练习|进阶思考).*$/;
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const raw = m[1].trim();
    const t = raw
      .replace(/^[一二三四五六七八九十]+[、.]\s*/, '')
      .replace(/^（[一二三四五六七八九十]+）\s*/, '')
      .replace(/^\d+[、.]\s*/, '')
      .trim();
    if (SKIP.test(t)) continue;
    out.push({ raw, title: t });
  }
  return out;
}

function motto(md) {
  const m = md.match(/\*\*MOTTO:\*\*\s*「?([^」\n]{4,120})」?\s*——《?([^》\n]{2,60})》?/);
  return m ? { quote: m[1].trim(), book: m[2].trim() } : null;
}

function problem(md) {
  const m = md.match(/\*\*PROBLEM:\*\*\s*([^\n]{10,400})/);
  return m ? m[1].trim() : '';
}

/** 正文里的加粗判断句（排除表格行与标题），取前 n 条 */
function judgments(md, n = 6) {
  const out = [];
  const seen = new Set();
  for (const line of md.split('\n')) {
    if (/^\s*[|#>]/.test(line)) continue;
    for (const m of line.matchAll(/\*\*([^*]{6,40})\*\*/g)) {
      const s = m[1].trim().replace(/[：:，,。；;]$/, '');
      if (hz(s) < 4) continue;
      if (/^(MOTTO|PROBLEM|双根因定位|免责声明|边界声明|教材出处)/.test(s)) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= n) return out;
    }
  }
  // 兜底：正文没有加粗判断句时（例如整章用叙述句写成），改取段落首句原文。
  // 必须是原文逐字片段，否则 outputs 门「首 12 字须在正文里」会判红。
  if (out.length < 2) {
    for (const line of md.split('\n')) {
      const l = line.trim();
      if (!l || /^[|#>\-*\d]/.test(l)) continue;
      const first = l.split(/[。！？]/)[0];
      if (hz(first) < 12 || seen.has(first)) continue;
      seen.add(first);
      out.push(first);
      if (out.length >= n) break;
    }
  }
  return out;
}

/** `## 代价与边界` 下的条目（- 或 1. 开头） */
function boundary(md, n = 3) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^##\s/.test(l) && /代价与边界/.test(l));
  if (i < 0) return [];
  const out = [];
  for (let k = i + 1; k < lines.length; k += 1) {
    const l = lines[k];
    if (/^##\s/.test(l)) break;
    const m = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.{6,200})$/);
    if (m) {
      out.push(m[1].trim());
      if (out.length >= n) break;
    }
  }
  return out;
}

function disclaimer(md) {
  const m = md.match(/\*\*免责声明[：:]\*\*\s*([^\n]{8,300})/);
  if (!m) return '';
  return m[1].trim().split('；')[0].replace(/[。.]$/, '');
}

function quizCount(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).questions.length;
  } catch {
    return 0;
  }
}

function buildPrompt({ course, n, title, chain, secs, hanzi, judg, bound, disc, qn, scale }) {
  const L = [];
  L.push(`# ${title} · 提示词`);
  L.push('');
  L.push('## 用途');
  L.push('');
  L.push(`给「${title}」这一章备课或自学时用的提示词。它不生成结论，只把本章的判据、规模和边界摆出来，`);
  L.push(`让使用者自己走一遍「${chain}」这条链。`);
  L.push('');
  L.push('## 提示词');
  L.push('');
  L.push('```');
  L.push(`我在学《${course}》第 ${n} 章「${title}」，本章 ${secs.length} 节 / ${hanzi.toLocaleString('en-US')} 汉字，习题 ${qn} 道。`);
  if (scale) {
    const src = scale.text ? `正文声明：${scale.text}` : `教材第 ${scale.chapters.join('–')} 章`;
    L.push(scale.text ? `教材规模（${src}）。` : `教材规模：${src}，合计 ${scale.chars.toLocaleString('en-US')} 汉字。`);
  }
  L.push('正文见本章 `docs/zh.md`，关键数字由 `node code/main.js` 从正文现算。');
  L.push('');
  L.push('请按以下顺序带我走：');
  L.push('1. 先用一句话说清本章要回答的问题，以及它为什么不能直接套用上一章；');
  L.push('2. 按正文小节顺序，逐节给出该节的判据，并指出这一节最容易被误判的那一处；');
  if (judg.length) {
    L.push('3. 本章的判据包括（请逐条解释它在什么条件下成立、什么条件下失效）：');
    for (const j of judg) L.push(`   - ${j}`);
  } else {
    L.push('3. 本章的判据请从小节标题与正文段落中自行提取，不要补充正文没有的内容；');
  }
  if (bound.length) {
    L.push('4. 本章自陈的边界（不得越过）：');
    for (const b of bound) L.push(`   - ${b}`);
  } else {
    L.push('4. 指出本章写到类别就止步、不再给参数的地方。');
  }
  L.push('');
  L.push('要求：不编造正文没有的数字；引文写到《书名·篇名》级；不确定的地方直接说「正文未展开」。');
  L.push('```');
  L.push('');
  L.push('## 边界');
  L.push('');
  L.push(`${disc || '本章内容用于教学，不构成诊疗或执业意见'}；具体操作以现行规范与所在机构制度为准。`);
  L.push('');
  return L.join('\n');
}

function buildSkill({ n, title, chain, judg, bound, disc, qn, slug, scale }) {
  const L = [];
  L.push('---');
  L.push(`name: ${slug}`);
  L.push('version: 2.0.0');
  L.push(`description: ${title}——按「${chain}」走一遍本章判据`);
  L.push('---');
  L.push('');
  L.push(`# ${title}`);
  L.push('');
  if (scale) {
    L.push(`> 教材规模：${scale.text || `${scale.chapters ? `第 ${scale.chapters.join('–')} 章 · ` : ''}${scale.chars.toLocaleString('en-US')} 汉字`}`);
    L.push('');
  }
  L.push('## 什么时候用');
  L.push('');
  L.push('需要把本章的判断讲清、或检验自己是否讲清时。');
  L.push('');
  L.push('## 怎么用');
  L.push('');
  L.push('1. 先读 `docs/zh.md` 的 MOTTO 与 PROBLEM 段，确认这一章要回答的问题是什么；');
  L.push('2. 跑 `node code/main.js`，看本章的结构清点与判据词频（数字全部从 `docs/zh.md` 现算）；');
  L.push(`3. 按正文小节顺序，逐节说出判据（本章 ${judg.length || '若干'} 条核心判断见下）；`);
  L.push(`4. 用 \`quiz.json\` 的 ${qn} 道题自检，答不上就回到对应小节。`);
  if (judg.length) {
    L.push('');
    L.push('## 核心判据');
    L.push('');
    for (const j of judg) L.push(`- ${j}`);
  }
  L.push('');
  L.push('## 边界');
  L.push('');
  if (bound.length) {
    for (const b of bound) L.push(`- ${b}`);
  } else {
    L.push('- 只写类别与要点，不写操作参数。');
  }
  L.push(`- ${disc || '本章内容用于教学，不构成诊疗或执业意见'}。`);
  L.push('');
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course-docs-rewritten.json'), 'utf8'));
  let written = 0;
  let same = 0;
  const drift = [];
  let chapters = 0;

  for (const r of reg.rewritten) {
    if (only && !`${r.dept}/${r.subject}`.includes(only)) continue;
    const sdir = path.join(ROOT, 'departments', r.dept, r.subject);
    const metaPath = path.join(sdir, 'meta.json');
    let course = r.subject;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      course = meta.title || meta.name || course;
    } catch { /* 没有 meta 就用 slug */ }
    const cdirs = path.join(sdir, 'chapters');
    if (!fs.existsSync(cdirs)) {
      drift.push(`${r.dept}/${r.subject}: 缺 chapters/`);
      continue;
    }
    // 教材规模（可选）：学科目录里有 chapter-map.json 就用它，没有就不写——
    // 不能凭「大概几章」估，那正是口径分叉的来源。
    let scaleMap = null;
    try {
      const mp = JSON.parse(fs.readFileSync(path.join(sdir, 'chapter-map.json'), 'utf8'));
      scaleMap = new Map(mp.chapters.map((x) => [x.chapter, x]));
    } catch { /* 无映射：产物不写教材规模 */ }
    for (const c of fs.readdirSync(cdirs).sort()) {
      const docs = path.join(cdirs, c, 'docs', 'zh.md');
      const quiz = path.join(cdirs, c, 'quiz.json');
      const odir = path.join(cdirs, c, 'outputs');
      if (!fs.existsSync(docs) || !fs.existsSync(quiz)) continue;
      const md = readDocs(docs);
      const head = parseHead(md);
      const secs = sections(md);
      const chain = (secs.slice(0, 4).map((s) => s.title).filter(Boolean).join(' → ') || head.title);
      // 正文若自己声明了教材规模（如「教材·第2章·2.3（舌诊四小节，1,249 字）」），
      // 产物复述正文那个数——正文是唯一真源，映射只用于没有声明时兜底。
      // 正文若写了「本章口径」行，产物照抄整条——它可能同时给出两章的规模
      // （如「第13章（1,307 字）与第14章（2,139 字）」），只取第一个数就会漏。
      const declaredLine = (/^\*\*本章口径：\*\*(.+)$/m.exec(md) || [])[1];
      const declared = declaredLine && /[\d,]{3,}\s*字/.test(declaredLine) ? declaredLine.trim() : null;
      const scale = declared
        ? { text: declared, chapters: null }
        : (scaleMap ? scaleMap.get(c) : null);
      const base = { course, n: head.n ?? '?', title: head.title, chain, secs, hanzi: hz(md),
        scale: scale ? { chars: scale.chars || null, text: scale.text || null, chapters: scale.textbookChapters || null } : null,
        judg: judgments(md), bound: boundary(md), disc: disclaimer(md), qn: quizCount(quiz) };
      const slug = c.replace(/^\d+-/, '');
      // outputs 的文件名有两种历史约定：skill-<slug>.md 与 skill-<NN-slug>.md。
      // 沿用目录里已有的名字，避免同一章出现两份 skill。
      const odirFiles = fs.existsSync(odir) ? fs.readdirSync(odir) : [];
      const existingSkill = odirFiles.find((f) => /^skill-.*\.md$/.test(f));
      const skillName = existingSkill || `skill-${slug}.md`;
      const existingPrompt = odirFiles.find((f) => /^prompt-.*\.md$/.test(f));
      const promptName = existingPrompt || `prompt-${c}.md`;
      const files = {
        [promptName]: buildPrompt(base),
        [skillName]: buildSkill({ ...base, slug }),
      };
      for (const [name, body] of Object.entries(files)) {
        const p = path.join(odir, name);
        const prev = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
        if (prev === body) { same += 1; continue; }
        if (check) drift.push(path.relative(ROOT, p).replace(/\\/g, '/'));
        else {
          fs.mkdirSync(odir, { recursive: true });
          fs.writeFileSync(p, body);
          written += 1;
        }
      }
      chapters += 1;
    }
  }

  console.log(`扫描 ${chapters} 章 · 写 ${written} · 已一致 ${same}`);
  if (check) {
    if (drift.length) {
      console.log(`✗ ${drift.length} 份 outputs 与重建结果不一致，例：`);
      for (const d of drift.slice(0, 5)) console.log(`   ${d}`);
      process.exit(1);
    }
    console.log('✓ 章节 outputs 与重建结果一致');
  }
}

if (require.main === module) main();

module.exports = { parseHead, sections, judgments, boundary, disclaimer };
