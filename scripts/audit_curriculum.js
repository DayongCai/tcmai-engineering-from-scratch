#!/usr/bin/env node
/**
 * audit_curriculum.js — 课程结构与章节契约审计（CI 阻断门）
 *
 * 分四层:
 *   L0 数据层 : curriculum.json 自身合法（数量/唯一性/元组形状/取值域）
 *   L1 结构层 : 磁盘目录与 curriculum.json 对齐，命名规范
 *   L2 契约层 : 已建章节必须满足 docs/zh.md + quiz.json + outputs/ 契约
 *   L3 内容层 : docs/zh.md 的内容要求（经典引文/免责声明/代价与边界/篇幅/UTF-8/单一 H1）
 *
 * 退出码: 0 通过 / 1 有错误
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, STATUS, loadCurriculum, subjectStatus } = require('./lib');

const errors = [];
const warns = [];
const ok = [];

const VALID_TYPES = ['Core', 'Build', 'Reference', 'Clinic'];
const QUIZ_STAGES = { pre: 1, check: 3, post: 2 };

function err(msg) { errors.push(msg); }
function warn(msg) { warns.push(msg); }

// ─────────── L0 数据层 ───────────
const cur = loadCurriculum();

if (cur.departments.length !== cur.domain.scale.departments) {
  err(`L0 院系数 ${cur.departments.length} ≠ 声明值 ${cur.domain.scale.departments}`);
}
const flat = cur.departments.flatMap((d) => d.subjects);
if (flat.length !== cur.domain.scale.subjects) {
  err(`L0 学科数 ${flat.length} ≠ 声明值 ${cur.domain.scale.subjects}`);
}
for (const d of cur.departments) {
  // 设计基准 15 门/院系；扩科后针灸 20、护理 25、中医/智能各 16；2026-10 补第 9/10 学期轮转与毕设后各 +2。
  // 选修课（元组第 9 位 true）按内容相关性挂进院系，**不计入必修规模基准** —— 否则「加一门选修」会被误判成结构错误。
  const required = d.subjects.filter((s) => !s.elective).length;
  const elective = d.subjects.length - required;
  if (![15, 16, 17, 18, 20, 22, 25, 27].includes(required)) {
    warn(`L0 院系 ${d.slug} 必修学科数为 ${required}（设计基准 15 / 扩科后允许 16、17、18、20、22、25、27）`);
  }
  if (elective > 0) console.log(`   · ${d.slug} 选修 ${elective} 门（不计入必修基准）`);
}
const slugSeen = new Map();
for (const s of flat) {
  if (slugSeen.has(s.slug)) err(`L0 学科目录名重复: ${s.slug}`);
  slugSeen.set(s.slug, s);
  if (!/^\d{2}-[a-z0-9-]+$/.test(s.slug)) err(`L0 学科目录名不合规范: ${s.slug}`);
  if (!VALID_TYPES.includes(s.type)) err(`L0 类型非法: ${s.slug} = ${s.type}`);
  if (!(s.semester >= 1 && s.semester <= cur.domain.scale.semesters)) {
    err(`L0 学期越界: ${s.slug} = ${s.semester}`);
  }
  if (!(s.hours > 0)) err(`L0 学时非法: ${s.slug}`);
  if (!(s.chapters > 0)) err(`L0 章节数非法: ${s.slug}`);
  if (!s.bridge || s.bridge.length < 4) err(`L0 缺中医→AI 桥梁说明: ${s.slug}`);
}

// ── L0 · 先修图 ──────────────────────────────────────────────────────
// 先修关系是「排课能排出来」的前提，不是注释。三类错误必须挡在这里：
//   1. 引用了不存在的课（拼错 slug 是最常见的失败形态，且不会自己报错）
//   2. 前置课排在本课之后（图上能画，课表上排不出来）
//   3. 成环（A→B→A，拓扑排序不收敛）
// 另外统计根课/孤立课：学期 > 1 却没有前置，通常意味着「这门课其实有前置，只是没声明」。
const byFull = new Map(flat.map((s) => [`${s.deptSlug}/${s.slug}`, s]));
let prereqEdges = 0;
const crossDept = [];
for (const s of flat) {
  for (const ref of s.prereq) {
    const full = ref.includes('/') ? ref : `${s.deptSlug}/${ref}`;
    const target = byFull.get(full);
    if (!target) { err(`L0 先修引用不存在的课: ${s.deptSlug}/${s.slug} → ${ref}`); continue; }
    if (full === `${s.deptSlug}/${s.slug}`) { err(`L0 先修自指: ${full}`); continue; }
    if (!(target.semester < s.semester)) {
      err(`L0 前置不早于本课: ${s.deptSlug}/${s.slug}（第 ${s.semester} 学期）← ${ref}（第 ${target.semester} 学期）`);
    }
    prereqEdges += 1;
    if (target.deptSlug !== s.deptSlug) crossDept.push(`${s.deptSlug}/${s.slug} ← ${full}`);
  }
}
// Kahn 拓扑排序：不收敛即有环
{
  const indeg = new Map(flat.map((s) => [`${s.deptSlug}/${s.slug}`, 0]));
  const adj = new Map(flat.map((s) => [`${s.deptSlug}/${s.slug}`, []]));
  for (const s of flat) {
    for (const full of s.prereqFull) {
      if (!byFull.has(full)) continue;
      adj.get(full).push(`${s.deptSlug}/${s.slug}`);
      indeg.set(`${s.deptSlug}/${s.slug}`, indeg.get(`${s.deptSlug}/${s.slug}`) + 1);
    }
  }
  const q = [...indeg.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  let seen = 0;
  while (q.length) {
    const n = q.shift();
    seen += 1;
    for (const m of adj.get(n) || []) {
      indeg.set(m, indeg.get(m) - 1);
      if (indeg.get(m) === 0) q.push(m);
    }
  }
  if (seen !== flat.length) {
    const stuck = [...indeg.entries()].filter(([, v]) => v > 0).map(([k]) => k);
    err(`L0 先修图有环（拓扑排序只排出 ${seen}/${flat.length} 门）: ${stuck.slice(0, 6).join(', ')}`);
  }
}
// 先修深度（最长链），供看板与排课解释用
{
  const depth = new Map();
  const calc = (s, guard = new Set()) => {
    const key = `${s.deptSlug}/${s.slug}`;
    if (depth.has(key)) return depth.get(key);
    if (guard.has(key)) return 0;
    guard.add(key);
    const d = s.prereqFull.filter((f) => byFull.has(f)).reduce((m, f) => Math.max(m, calc(byFull.get(f), guard) + 1), 0);
    depth.set(key, d);
    return d;
  };
  for (const s of flat) calc(s);
  const roots = flat.filter((s) => s.prereq.length === 0).length;
  const orphans = flat.filter((s) => s.semester > 1 && s.prereq.length === 0);
  const maxDepth = Math.max(...depth.values());
  // 根课必须登记理由（data/prereq-roots.json）：prereq 为空有两种可能 —— 真根课 / 漏声明。
  // 不登记就无法区分这两者，于是「覆盖率」永远停在 92%，而人不会去查那 14 门到底该不该有前置。
  const rootsDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prereq-roots.json'), 'utf8'));
  const rootMap = new Map((rootsDoc.roots || []).map((r) => [r.key, r]));
  for (const [key, r] of rootMap) {
    const s = byFull.get(key);
    if (!s) { err(`L0 根课登记引用了不存在的学科: ${key}`); continue; }
    if (s.prereq.length) err(`L0 根课 ${key} 却声明了前置（${s.prereq.join(',')}）—— 根课表与数据打架`);
    if (!r.why || r.why.length < 20) err(`L0 根课 ${key} 的理由过短（要写清前置在哪个体系里）`);
  }
  const orphansAll = flat.filter((s) => s.prereq.length === 0 && !rootMap.has(`${s.deptSlug}/${s.slug}`));
  if (orphansAll.length) {
    warn(
      `L0 ${orphansAll.length} 门没有声明前置、也没登记为根课（漏声明）: ${orphansAll.slice(0, 8).map((s) => s.slug).join(', ')}`
    );
  }
  const declared = flat.filter((s) => s.prereq.length > 0).length;
  const eligible = flat.length - rootMap.size;
  const coverage = eligible ? Math.round((declared / eligible) * 1000) / 10 : 100;
  cur.__prereqStats = {
    edges: prereqEdges,
    roots,
    rootsRegistered: rootMap.size,
    maxDepth,
    crossDept: crossDept.length,
    orphans: orphansAll.length,
    coverage,
  };
  ok.push(
    `L0 先修图: ${prereqEdges} 条边 · 根课 ${roots}（登记 ${rootMap.size}）· 最长先修链 ${maxDepth} 层 · 跨院系 ${crossDept.length} 条 · 覆盖率 ${coverage}%`
  );
  if (orphansAll.length === 0) console.log(`   · 先修覆盖率 ${coverage}% = ${declared} / (${flat.length} − ${rootMap.size} 已登记根课)`);
}
for (const d of cur.departments) {
  const deptSeen = new Set();
  for (const s of d.subjects) {
    if (deptSeen.has(s.n)) err(`L0 院系 ${d.slug} 内序号重复: ${s.n}`);
    deptSeen.add(s.n);
  }
}
ok.push(`L0 数据层: ${cur.departments.length} 院系 / ${flat.length} 学科 / 学期与类型字段全部合法`);

// ─────────── L1 结构层 ───────────
const deptDir = path.join(ROOT, 'departments');
if (!fs.existsSync(deptDir)) {
  warn('L1 departments/ 尚未创建（脚手架未运行）');
} else {
  for (const d of cur.departments) {
    const dp = path.join(ROOT, d.path);
    if (!fs.existsSync(dp)) {
      warn(`L1 未落盘院系: ${d.path}`);
      continue;
    }
    if (!fs.existsSync(path.join(dp, 'README.md'))) err(`L1 院系缺 README.md: ${d.path}`);
    for (const s of d.subjects) {
      const sp = path.join(ROOT, s.path);
      if (!fs.existsSync(sp)) continue; // 未落盘不报错（增量建设）
      if (!fs.existsSync(path.join(sp, 'README.md'))) err(`L1 学科缺 README.md: ${s.path}`);
      if (!fs.existsSync(path.join(sp, 'meta.json'))) err(`L1 学科缺 meta.json: ${s.path}`);
      else {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(sp, 'meta.json'), 'utf8'));
          if (m.slug !== s.slug) err(`L1 meta.json slug 不匹配: ${s.path}`);
          if (m.title !== s.title) warn(`L1 meta.json title 与 curriculum.json 不一致: ${s.path}`);
        } catch (e) {
          err(`L1 meta.json 解析失败: ${s.path} — ${e.message}`);
        }
      }
      // 章节索引：知识结构必须与 curriculum 的章节目标一一对上。
      // 没有这道门时，「1086 章节」只是一个数字 —— 120 个学科里 119 个连章节名都没有，
      // 而所有门都是绿的（它们只查已建章节）。声明与结构脱节不会自己报错。
      const idxPath = path.join(sp, 'chapters.json');
      if (!fs.existsSync(idxPath)) {
        err(`L1 学科缺 chapters.json（知识结构）: ${s.path}`);
      } else {
        try {
          const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
          const list = Array.isArray(idx.chapters) ? idx.chapters : [];
          if (list.length !== s.chapters) {
            err(`L1 chapters.json 章数 ${list.length} ≠ 目标 ${s.chapters}: ${s.path}`);
          }
          const seen = new Set();
          for (const c of list) {
            if (!/^\d{2}-[a-z0-9-]+$/.test(c.slug || '')) err(`L1 chapters.json slug 非法（${c.slug}）: ${s.path}`);
            if (seen.has(c.slug)) err(`L1 chapters.json slug 重复（${c.slug}）: ${s.path}`);
            seen.add(c.slug);
            if (!c.title) err(`L1 chapters.json 有章节缺标题: ${s.path}`);
          }
        } catch (e) {
          err(`L1 chapters.json 解析失败: ${s.path} — ${e.message}`);
        }
      }
    }
  }
  ok.push('L1 结构层: 已落盘院系/学科的 README + meta.json + 章节知识结构齐备');
}

// ─────────── L2 契约层 ───────────
let builtChapters = 0;
// L3 用：最小篇幅。必须声明在调用点之前 —— 函数声明会提升，const 不会，
// 声明在后面会让第一次调用撞上 TDZ（第一版就栽在这里）。
const CONTENT_MIN_CHARS = 1500;

for (const s of flat) {
  const st = subjectStatus(s);
  if (st.built === 0) continue;
  const chaptersDir = path.join(ROOT, s.path, 'chapters');
  for (const name of fs.readdirSync(chaptersDir)) {
    const cdir = path.join(chaptersDir, name);
    if (!fs.statSync(cdir).isDirectory()) continue;
    const zh = path.join(cdir, 'docs', 'zh.md');
    if (!fs.existsSync(zh)) { err(`L2 缺 docs/zh.md: ${s.path}/chapters/${name}`); continue; }
    const body = fs.readFileSync(zh, 'utf8');
    for (const key of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累']) {
      if (!body.includes(key)) err(`L2 docs/zh.md 缺 ${key}: ${s.path}/chapters/${name}`);
    }
    const quizPath = path.join(cdir, 'quiz.json');
    if (!fs.existsSync(quizPath)) { err(`L2 缺 quiz.json: ${s.path}/chapters/${name}`); continue; }
    try {
      const q = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
      const got = { pre: 0, check: 0, post: 0 };
      for (const item of q.questions || []) {
        if (!(item.stage in got)) { err(`L2 quiz stage 非法: ${s.path}/chapters/${name} = ${item.stage}`); continue; }
        got[item.stage] += 1;
        if (!Array.isArray(item.options) || item.options.length !== 4) {
          err(`L2 quiz 选项数必须为 4: ${s.path}/chapters/${name}`);
        }
        if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) {
          err(`L2 quiz correct 必须为 0..3 整数: ${s.path}/chapters/${name}`);
        }
      }
      for (const [stage, want] of Object.entries(QUIZ_STAGES)) {
        if (got[stage] !== want) err(`L2 quiz ${stage} 题数 ${got[stage]} ≠ ${want}: ${s.path}/chapters/${name}`);
      }
    } catch (e) {
      err(`L2 quiz.json 解析失败: ${s.path}/chapters/${name} — ${e.message}`);
    }
    checkOutputs(s, cdir, name, err);
    checkContent(s, cdir, name, err);
    builtChapters += 1;
  }
}
ok.push(`L2 契约层: ${builtChapters} 个已建章节通过 docs/quiz/outputs 契约`);
ok.push(`L3 内容层: ${builtChapters} 个已建章节通过 引文/免责/代价与边界/篇幅 校验`);

/**
 * L2 · outputs/ 契约
 *
 * 契约不是「目录存在」—— 那是个空壳也能过的门。每章必须交出两件**可复用**的产物：
 *   outputs/prompt-<slug>.md   提示词：本课的判断过程能被别人复述的形式
 *   outputs/skill-<slug>.md    技能：带 frontmatter 的可装载产物（name/description/version）
 *
 * 为什么值得当硬门：这两件产物正是「工程化」与「讲课」的分界。
 * 只查存在性的话，一个空的 outputs/ 目录能让「每章都产出提示词与技能」变成假话。
 */
function checkOutputs(s, cdir, name, err) {
  const outDir = path.join(cdir, 'outputs');
  const where = `${s.path}/chapters/${name}`;
  if (!fs.existsSync(outDir)) {
    err(`L2 缺 outputs/: ${where}`);
    return;
  }

  const files = fs.readdirSync(outDir);
  const prompts = files.filter((f) => /^prompt-.*\.md$/.test(f));
  const skills = files.filter((f) => /^skill-.*\.md$/.test(f));

  if (prompts.length !== 1) {
    err(`L2 outputs/ 需恰好 1 个 prompt-*.md，实为 ${prompts.length}: ${where}`);
  }
  if (skills.length !== 1) {
    err(`L2 outputs/ 需恰好 1 个 skill-*.md，实为 ${skills.length}: ${where}`);
  }

  // 基准名：与 skill frontmatter 的 name 同一约定 —— 章目录名去掉「NN-」前缀。
  // （第一版直接比目录全名，结果把三个本来合规的章节全判成违规 —— 断言错了，不是文件错了。）
  const base = name.replace(/^\d+-/, '');

  // 提示词：文件名含基准名、有 H1 与「用途」段，正文不得是空壳
  if (prompts.length === 1) {
    if (!prompts[0].includes(base)) {
      err(`L2 prompt 文件名须含「${base}」: ${where}/${prompts[0]}`);
    }
    const t = fs.readFileSync(path.join(outDir, prompts[0]), 'utf8');
    if (!/^#\s+\S/m.test(t)) err(`L2 prompt 缺 H1: ${where}/${prompts[0]}`);
    if (!/^##\s*用途/m.test(t)) err(`L2 prompt 缺「## 用途」段: ${where}/${prompts[0]}`);
    if (t.replace(/\s/g, '').length < 300) {
      err(`L2 prompt 正文过短（${t.replace(/\s/g, '').length} 字）: ${where}/${prompts[0]}`);
    }
  }

  // 技能：YAML frontmatter 三件套齐全，且 name 必须等于基准名
  if (skills.length === 1) {
    if (!skills[0].includes(base)) {
      err(`L2 skill 文件名须含「${base}」: ${where}/${skills[0]}`);
    }
    const raw = fs.readFileSync(path.join(outDir, skills[0]), 'utf8');
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
    if (!m) {
      err(`L2 skill 缺 YAML frontmatter: ${where}/${skills[0]}`);
    } else {
      const fm = m[1];
      const get = (k) => {
        const mm = new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm);
        return mm ? mm[1].trim() : '';
      };
      for (const k of ['name', 'description', 'version']) {
        if (!get(k)) err(`L2 skill frontmatter 缺 ${k}: ${where}/${skills[0]}`);
      }
      if (get('name') && get('name') !== base) {
        err(`L2 skill name「${get('name')}」≠ 基准名「${base}」: ${where}/${skills[0]}`);
      }
      if (get('description') && get('description').replace(/\s/g, '').length < 12) {
        err(`L2 skill description 过短: ${where}/${skills[0]}`);
      }
    }
    if (raw.replace(/\s/g, '').length < 300) {
      err(`L2 skill 正文过短（${raw.replace(/\s/g, '').length} 字）: ${where}/${skills[0]}`);
    }
  }
}

/**
 * L3 · 内容层
 *
 * 契约（CONTRIBUTING.md / FORKING.md）对 `docs/zh.md` 的要求不止"文件在"：
 *   有经典引文（写到《书名·篇名》级）· 有免责/边界声明 · 有「代价与边界」段。
 *
 * 这一层此前**不存在**。要说精确：L2 并非完全不看 docs —— 它查 4 个结构标记
 * （MOTTO / PROBLEM / 环境逼迫 / 知识积累）与文件存在性。
 * 但契约承诺的另三项**没人查**：经典引文（须写到《书名·篇名》级）、
 * 免责/边界声明、「代价与边界」段。
 * FORKING.md 的产物契约表还把这三项标成"由 audit_curriculum.js L2 检查"，那是假的。
 *
 * docs 内容不达标时的失败形态是安静的：文件在、能打开、读起来像那么回事。
 * 实现后立刻在已有内容里查出两处违约：第 1 章缺「代价与边界」、
 * 三章的免责声明只写在代码块里（文档级声明一条没有）。
 * 这个门第一次跑就抓到了东西 —— 它不是形式主义。
 *
 * **必须跳过围栏代码块**：`# 边界声明: …` 这种行出现在示例输出里，
 * 算不得文档级声明（第一版正则没跳过，把 19 行代码注释误计成 19 个 H1）。
 */
function stripFenced(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (!inFence) out.push(line);
  }
  return out.join('\n');
}

function checkContent(s, cdir, name, err) {
  const docPath = path.join(cdir, 'docs', 'zh.md');
  const where = `${s.path}/chapters/${name}`;
  if (!fs.existsSync(docPath)) return;          // 存在性由 L2 负责

  const buf = fs.readFileSync(docPath);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    err(`L3 docs/zh.md 不是有效 UTF-8（编辑器存成了别的编码？）: ${where}`);
    return;
  }

  const prose = stripFenced(text);
  const plain = prose.replace(/\s/g, '');

  const h1 = (prose.match(/^#\s+\S/gm) || []).length;
  if (h1 !== 1) err(`L3 docs/zh.md 顶层 H1 应为 1 个，实为 ${h1}: ${where}`);

  if (!/《[^》]*·[^》]*》/.test(prose)) {
    err(`L3 docs/zh.md 缺经典引文（须写到《书名·篇名》级，如《素问·阴阳应象大论》）: ${where}`);
  }
  if (!/代价与边界/.test(prose)) {
    err(`L3 docs/zh.md 缺「代价与边界」段 —— 只报喜不报忧的章节不算写完: ${where}`);
  }
  if (!/(免责|边界声明|不构成诊疗|不构成医疗)/.test(prose)) {
    err(`L3 docs/zh.md 正文缺免责/边界声明（写在代码块里不算）: ${where}`);
  }
  if (plain.length < CONTENT_MIN_CHARS) {
    err(`L3 docs/zh.md 篇幅不足 ${CONTENT_MIN_CHARS} 字（实测 ${plain.length}）: ${where}`);
  }
}

// ─────────── 输出 ───────────
console.log('═══ tcmai-engineering-from-scratch · 课程审计 ═══\n');
for (const line of ok) console.log(`  ${STATUS.DONE} ${line}`);
if (warns.length) {
  console.log('');
  for (const w of warns) console.log(`  ${STATUS.WIP} ${w}`);
}
if (errors.length) {
  console.log('');
  for (const e of errors) console.log(`  ✗ ${e}`);
}
console.log(`\n─── 统计 ───`);
console.log(`  院系 ${cur.departments.length} · 学科 ${flat.length} · 章节目标 ${cur.counts.chapters} · 已建章节 ${builtChapters}`);
console.log(`  提示 ${warns.length} · 错误 ${errors.length}`);

if (errors.length) {
  console.log('\n❌ 审计未通过');
  process.exit(1);
}
console.log('\n✅ 审计通过');
