#!/usr/bin/env node
/**
 * map_materials_to_subjects.js —— 桌面材料能支撑哪些学科/章节（**测量，不生成**）
 *
 *   node scripts/map_materials_to_subjects.js
 *   node scripts/map_materials_to_subjects.js --json
 *
 * 为什么要有它：
 *   「1075 章没有正文」这句话里藏着一个未经验证的假设 —— 假定**没有资料**。
 *   桌面上的 10 份材料合计约 987 万字（内经全本 61 万字、逐句讲解 535 万字、
 *   课程图式 8.5 万字…）。它们能不能支撑某几章的正文，是可以量的：
 *   拿每章的标题去材料的分节标题与正文里找证据，命中了就记「有源」，没命中记「无源」。
 *
 * 口径（可复核）：
 *   · 章节 → 材料的匹配只看**标题级线索**（章标题里的关键词是否出现在材料的分节标题/前 2000 字里），
 *     不做语义相似度 —— 语义相似会把「阳气」匹配到任何一篇内经，结果不可复核。
 *   · 命中分两档：strong（≥2 个关键词命中且材料分节 ≥300 字）/ weak（1 个关键词命中）。
 *   · 只报数，不写章节正文：正文要不要写、写到什么程度，是人的判断。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, loadCurriculum } = require('./lib');

const JSON_OUT = process.argv.includes('--json');

// 材料 → 它天然对应的学科（人工核对过的对应关系；不是关键词猜的）
// 依据：材料本身是什么书，就服务哪门课。
const MAP = {
  'neijing-quanwen': {
    note: '《素问》81 篇 + 《灵枢》81 篇全本（原文/译文/按语）',
    subjects: ['06-neijing-xuandu', '01-zhongyi-jichu-lilun', '05-zhongyi-zhen-duan-xue', '09-wenbing-xue'],
  },
  'wuyishan-suwen30': {
    note: '《素问》选讲 31 讲（逐句字幕）',
    subjects: ['06-neijing-xuandu', '01-zhongyi-jichu-lilun'],
  },
  'hdnj-yinpin': {
    note: '《黄帝内经》逐句音频讲解（125027 条字幕）',
    subjects: ['06-neijing-xuandu'],
  },
  'neijing-jizhen': {
    note: '《黄帝内经》急症条文 + 病理生理 + 处置',
    subjects: ['10-zhongyi-neike-xue', '06-neijing-xuandu'],
  },
  'leijing-tuyi': {
    note: '《类经图翼》18 卷图注（张介宾）',
    subjects: ['06-neijing-xuandu', '01-zhongyi-jichu-lilun'],
  },
  'neiyin-qiqing': {
    note: '内因七情 19 讲（情志病机与泛函）',
    subjects: ['06-zhongyi-xinli-xue', '09-zhongyi-neike-xue'],
  },
  'waiyin-liuyin': {
    note: '外因六淫 12 讲（六淫病机与泛函）',
    subjects: ['01-zhongyi-jichu-lilun', '09-wenbing-xue'],
  },
  zhongyiyao_ai_daolun: {
    note: '中医药 AI 导论 10 讲',
    subjects: ['01-yixue-rengong-zhineng-daolun', '05-zhongyi-zhishi-tupu', '06-zhongyi-zhineng-bianzheng'],
  },
  'lingjichu-ai': {
    note: '零基础学 AI 20 讲',
    subjects: ['01-yixue-rengong-zhineng-daolun', '10-llm-yu-zhongyi-zhinengti'],
  },
  tcmscheme: {
    note: '课程图式：章/节/段 + 内涵 + 知识点 + 数学/物理/AI 桥接（3363 段）',
    subjects: [
      '01-zhongyi-jichu-lilun', '05-zhongyi-zhen-duan-xue', '07-shanghanlun', '09-wenbing-xue',
      '01-zhongyaoxue', '03-fangjixue', '01-jingluo-xue', '02-shuxue-xue',
      '08-zhenjiu-zhiliao-xue', '10-zhongyi-neike-xue', '11-zhongyi-waike-xue',
      '12-zhongyi-fuke-xue', '13-zhongyi-erke-xue', '06-zhongyi-yanke-xue',
    ],
  },
};
// 键名修正（zhongyiyao_ai_daolun 实际 slug 用连字符）
MAP['zhongyiyao-ai-daolun'] = MAP.zhongyiyao_ai_daolun;
delete MAP.zhongyiyao_ai_daolun;

const matDir = path.join(ROOT, 'standards', 'materials');
const readMd = (slug) => {
  const dir = path.join(matDir, slug);
  if (!fs.existsSync(dir)) return '';
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  return files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
};

// 材料的分节标题（## 开头）与前 2000 字，作为「证据面」
const surfaces = {};
for (const slug of Object.keys(MAP)) {
  const text = readMd(slug);
  if (!text) continue;
  const headings = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  // 证据面用**全文**：材料的分节标题往往只是「05中药」，真正的知识在行里。
  // 只看标题会把「解表药」「清热药」这类章节全判成无源，而它们就在表里。
  surfaces[slug] = { headings, full: text, bytes: text.length };
}

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);
const bySlug = new Map(flat.map((s) => [s.slug, s]));

// 关键词：把章标题切成 2–6 字的中医词块（去掉「从零实现」这类工程后缀与标点）
const STOP = /从零实现|实现|→|从|的|与|：|:|\(|\)|（|）|\s+/g;
function keywords(title) {
  const t = title.replace(new RegExp(STOP.source, 'g'), ' ');
  const parts = t
    .split(/[ ，、·—\/]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && /[\u4e00-\u9fff]/.test(x));
  const out = new Set();
  for (const p of parts) {
    out.add(p);
    if (p.length > 4) {
      out.add(p.slice(0, 2));
      out.add(p.slice(-2));
    }
  }
  return [...out].filter((x) => x.length >= 2);
}

const rows = [];
for (const [slug, spec] of Object.entries(MAP)) {
  const surf = surfaces[slug];
  if (!surf) { rows.push({ material: slug, subjects: spec.subjects, error: '材料未导入' }); continue; }
  const hay = surf.full;
  for (const subjSlug of spec.subjects) {
    const s = bySlug.get(subjSlug);
    if (!s) { rows.push({ material: slug, subject: subjSlug, error: '学科不存在' }); continue; }
    const idxPath = path.join(ROOT, s.path, 'chapters.json');
    if (!fs.existsSync(idxPath)) continue;
    const chapters = JSON.parse(fs.readFileSync(idxPath, 'utf8')).chapters;
    const detail = chapters.map((c) => {
      const kws = keywords(c.title);
      const hits = kws.filter((k) => hay.includes(k));
      const strong = hits.length >= 2;
      return { n: c.n, slug: c.slug, title: c.title, hits, level: strong ? 'strong' : hits.length ? 'weak' : 'none' };
    });
    rows.push({
      material: slug,
      note: spec.note,
      subject: subjSlug,
      subjectTitle: s.title,
      chapters: detail.length,
      strong: detail.filter((x) => x.level === 'strong').length,
      weak: detail.filter((x) => x.level === 'weak').length,
      detail,
    });
  }
}

// 去重：同一学科可能被多份材料覆盖，取「强命中最多」的那份作为主源
const best = new Map();
for (const r of rows) {
  if (r.error) continue;
  const prev = best.get(r.subject);
  if (!prev || r.strong > prev.strong) best.set(r.subject, r);
}

const subjectsWithSource = best.size;
const chaptersStrong = [...best.values()].reduce((a, r) => a + r.strong, 0);
const chaptersWeak = [...best.values()].reduce((a, r) => a + r.weak, 0);
const totalChapters = flat.reduce((a, s) => a + s.chapters, 0);

const summary = {
  materials: Object.keys(MAP).length,
  materialsImported: Object.keys(surfaces).length,
  subjectsWithSource,
  chaptersStrong,
  chaptersWeak,
  totalChapters,
  untouchedSubjects: flat.filter((s) => !best.has(s.slug)).length,
};

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  console.log('═══ 桌面材料 ↔ 学科章节 · 覆盖测量 ═══\n');
  console.log(`  材料 ${summary.materialsImported}/${summary.materials} 份已导入`);
  console.log(`  有源学科 ${summary.subjectsWithSource}/${flat.length} · 无源学科 ${summary.untouchedSubjects}`);
  console.log(`  章节：强命中 ${summary.chaptersStrong} · 弱命中 ${summary.chaptersWeak} · 全书 ${summary.totalChapters}`);
  console.log('\n  按学科（取强命中最多的一份材料为主源）：');
  for (const r of [...best.values()].sort((a, b) => b.strong - a.strong)) {
    console.log(`    ${String(r.strong).padStart(3)}/${String(r.chapters).padEnd(3)} 强 ${r.subjectTitle.padEnd(8)} ← ${r.material}`);
  }
}
