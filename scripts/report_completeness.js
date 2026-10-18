#!/usr/bin/env node
/**
 * report_completeness.js —— 一次性把「这个仓库到底完整到什么程度」量出来
 *
 *   node scripts/report_completeness.js
 *   node scripts/report_completeness.js --json   # 机读
 *
 * 为什么要有它：
 *   仓库里每个门都绿，只说明「已建的东西合格」；它不回答「该有的东西有多少还没建」。
 *   这两件事经常被混为一谈，于是「1086 章节」读起来像 1086 章已经写完。
 *   本脚本只做**测量**：声明量、落盘量、两层覆盖率、前端与后端的真实边界、
 *   以及「分布式」这个词在这个仓库里到底指什么。不修数据、不写文件。
 *
 * 判据（每条都能在硬盘上复核）：
 *   · 声明量来自 curriculum.json（唯一事实源），不从 README 抄
 *   · 落盘量来自目录遍历（章节正文 = docs/zh.md；教材 = textbooks 下的 md 稿）
 *   · 前端 = site/ 的页面与构建期数据；后端 = 真的监听端口的脚本
 *   · 任一数字与 README 的 COUNTS 块不一致 → 退出码 1（那是漂移，不是风格）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, loadCurriculum } = require('./lib');

const JSON_OUT = process.argv.includes('--json');
const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);
const P = (p) => path.join(ROOT, p);
const exists = (p) => fs.existsSync(P(p));
const readJson = (p) => JSON.parse(fs.readFileSync(P(p), 'utf8'));

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, filter, out);
    else if (!filter || filter(full)) out.push(full);
  }
  return out;
}

// ── 1. 结构 ──
const subjectDirs = flat.filter((s) => exists(`${s.path}/meta.json`));
const chapterIdx = flat.filter((s) => exists(`${s.path}/chapters.json`));
const builtChapterDirs = [];
for (const s of flat) {
  const dir = P(`${s.path}/chapters`);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const cd = path.join(dir, name);
    if (fs.statSync(cd).isDirectory()) builtChapterDirs.push(`${s.path}/chapters/${name}`);
  }
}
const withBody = builtChapterDirs.filter((c) => fs.existsSync(path.join(ROOT, c, 'docs/zh.md')));
const declareChapters = flat.reduce((a, s) => a + s.chapters, 0);
const declareHours = flat.reduce((a, s) => a + s.hours, 0);

// ── 2. 交付物 ──
const textbookMd = walk(P('textbooks'), (f) => f.endsWith('.md') && !f.includes(`${path.sep}build${path.sep}`));
const textbookWords = textbookMd.reduce((a, f) => a + fs.readFileSync(f, 'utf8').replace(/\s/g, '').length, 0);
const videoMp4 = walk(P('platform/courses'), (f) => f.endsWith('.mp4'));
const lessonMp4 = videoMp4.filter((f) => path.basename(f) === 'lesson.mp4');
// 学科教材目录 = textbooks/<dept>/<subject>/（必须两层；否则 textbooks/README.md 也会被算成一个学科）
const textbookSubjects = new Set(
  textbookMd
    .map((f) => path.relative(P('textbooks'), f).split(path.sep))
    .filter((parts) => parts.length >= 3)
    .map((parts) => `${parts[0]}/${parts[1]}`),
);
const outputsMd = walk(P('departments'), (f) => f.includes(`${path.sep}outputs${path.sep}`) && f.endsWith('.md'));
const quizFiles = walk(P('departments'), (f) => f.endsWith('quiz.json') && f.includes(`${path.sep}chapters${path.sep}`));

// ── 3. 检索/证据层 ──
const ext = exists('standards/semtensor/descriptions/external.json')
  ? readJson('standards/semtensor/descriptions/external.json')
  : { entries: [] };
const extScope = ext.entries.reduce((m, e) => ((m[e.scope] = (m[e.scope] || 0) + 1), m), {});
const embIndex = exists('standards/semtensor/embeddings/index.json')
  ? readJson('standards/semtensor/embeddings/index.json')
  : null;
const embUnits = embIndex && embIndex.counts ? embIndex.counts.units : null;
const embCorpus = embIndex && embIndex.counts ? embIndex.counts.corpusFiles : null;

// ── 4. 前端：站点页面与构建期数据 ──
const PAGES = (() => {
  const src = fs.readFileSync(P('site/pages.js'), 'utf8');
  const m = src.match(/const PAGES = \[([\s\S]*?)\];/);
  return m ? (m[1].match(/\['/g) || []).length : 0;
})();
const siteSize = (f) => (exists(`site/${f}`) ? fs.statSync(P(`site/${f}`)).size : 0);
const clientScripts = (() => {
  const src = fs.readFileSync(P('site/pages.js'), 'utf8');
  const m = src.match(/const SCRIPTS = \[([\s\S]*?)\];/);
  return m ? (m[1].match(/'/g) || []).length / 2 : 0;
})();
const siteManifest = exists('site/manifest.json') ? readJson('site/manifest.json') : {};

// ── 5. 后端：真的监听端口的脚本 ──
const servers = [
  { file: 'site/serve.js', role: '静态文件服务器（只读，不写盘）' },
  { file: 'scripts/tcm_api.js', role: '辨证/诊断/语义检索 HTTP API（自制，无框架）' },
].filter((s) => exists(s.file));
const apiEndpoints = (() => {
  if (!exists('scripts/tcm_api.js')) return [];
  const src = fs.readFileSync(P('scripts/tcm_api.js'), 'utf8');
  return [...new Set((src.match(/ep:\s*'\/([a-z-]+)/g) || []).map((s) => s.replace(/.*'\//, '/')))];
})();
const frameworkDeps = Object.keys(
  Object.assign({}, ...[['dependencies', 'devDependencies'].map((k) => (exists('package.json') ? readJson('package.json')[k] : null))].flat().filter(Boolean)),
);

// ── 6. 「分布式」在这个仓库里指什么 ──
const leaseTtl = (() => {
  if (!exists('scripts/external_batch.js')) return null;
  const src = fs.readFileSync(P('scripts/external_batch.js'), 'utf8');
  const m = src.match(/LEASE_TTL_MS\s*=\s*Number\([^|]*\|\|\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)\s*\)/);
  if (!m) return null;
  return (Number(m[1]) * Number(m[2]) * Number(m[3])) / 60000;
})();
const leaseUsers = walk(P('scripts'), (f) => f.endsWith('.js'))
  .filter((f) => /writeLease\(|readLease\(|clearLease\(/.test(fs.readFileSync(f, 'utf8')))
  .map((f) => path.relative(ROOT, f).replace(/\\/g, '/'));

const readmeCounts = (() => {
  if (!exists('README.md')) return null;
  const src = fs.readFileSync(P('README.md'), 'utf8');
  const m = src.match(/<!-- COUNTS:START[\s\S]*?-->([\s\S]*?)<!-- COUNTS:END -->/);
  if (!m) return null;
  const t = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const num = (re) => {
    const mm = t.match(re);
    return mm ? Number(mm[1]) : null;
  };
  return {
    departments: num(/\*\*(\d+)\*\*\s*院系/),
    subjects: num(/\*\*(\d+)\*\*\s*学科/),
    chapters: num(/\*\*(\d+)\*\*\s*章节/),
    hours: num(/\*\*(\d+)\*\*\s*学时/),
    built: num(/已建\s*\*\*(\d+)\*\*\s*章/),
  };
})();

const data = {
  structure: {
    departments: cur.departments.length,
    subjects: flat.length,
    subjectsScaffolded: subjectDirs.length,
    subjectsWithChapterIndex: chapterIdx.length,
    chaptersDeclared: declareChapters,
    chapterDirs: builtChapterDirs.length,
    chaptersWithBody: withBody.length,
    hours: declareHours,
    quizzes: quizFiles.length,
    outputs: outputsMd.length,
  },
  delivery: {
    textbooksWithMarkdown: textbookSubjects.size,
    textbookWords,
    videos: lessonMp4.length,
    videoParts: videoMp4.length - lessonMp4.length,
  },
  knowledge: {
    externalEntries: ext.entries.length,
    externalScope: extScope,
    embeddingUnits: embUnits,
    embeddingCorpus: embCorpus,
  },
  frontend: {
    pages: PAGES,
    clientScripts,
    dataJsKB: +(siteSize('data.js') / 1024).toFixed(1),
    contentJsKB: +(siteSize('content.js') / 1024).toFixed(1),
    chaptersInContent: siteManifest.chapters ?? null,
  },
  backend: {
    servers: servers.map((s) => s.file),
    apiEndpoints,
    runtimeDeps: frameworkDeps.length,
    courseBackend: false,
  },
  distributed: {
    leaseTtlMinutes: leaseTtl,
    leaseUsers,
    model: '单机多进程 + 文件租约 + 定时任务（无多节点调度）',
  },
  readmeCounts,
};

if (JSON_OUT) {
  console.log(JSON.stringify(data, null, 2));
} else {
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(2) : '0.00');
  console.log('═══ 完整性核对（只测量，不修数据）═══\n');
  console.log('【结构】');
  console.log(`  院系 ${data.structure.departments} · 学科 ${data.structure.subjects}（已落盘 ${data.structure.subjectsScaffolded}）`);
  console.log(`  章节：声明 ${data.structure.chaptersDeclared} · 有目录 ${data.structure.chapterDirs} · 有正文 ${data.structure.chaptersWithBody}（${pct(data.structure.chaptersWithBody, data.structure.chaptersDeclared)}%）`);
  console.log(`  知识结构索引：${data.structure.subjectsWithChapterIndex}/${data.structure.subjects} 学科有 chapters.json`);
  console.log(`  测验 ${data.structure.quizzes} 份 · 章节产物 ${data.structure.outputs} 份 · 声明学时 ${data.structure.hours}`);
  console.log('\n【交付物】');
  console.log(`  教材：${data.delivery.textbooksWithMarkdown} 个学科有稿 / ${data.structure.subjects} · 正文 ${data.delivery.textbookWords} 字`);
  console.log(`  成片：${data.delivery.videos} 个 lesson.mp4（另有分段 ${data.delivery.videoParts} 个）`);
  console.log('\n【知识/证据层】');
  console.log(`  证候外部证据 ${data.knowledge.externalEntries} 条（证候总量 96）· 分级 ${JSON.stringify(data.knowledge.externalScope)}`);
  console.log(`  检索索引：知识单元 ${data.knowledge.embeddingUnits ?? '—'} · 语料文件 ${data.knowledge.embeddingCorpus ?? '—'}`);
  console.log('\n【前端】');
  console.log(`  ${data.frontend.pages} 个页面 · ${data.frontend.clientScripts} 个客户端脚本 · data.js ${data.frontend.dataJsKB} KB · content.js ${data.frontend.contentJsKB} KB`);
  console.log(`  渲染方式：构建期生成 data/content，浏览器端按 data-page 渲染（无 SPA 框架、无运行时接口）`);
  console.log('\n【后端】');
  console.log(`  监听端口的脚本 ${data.backend.servers.length} 个：${data.backend.servers.join(' · ')}`);
  console.log(`  运行时依赖 ${data.backend.runtimeDeps} 个 · 课程后端：${data.backend.courseBackend ? '有' : '无（站点为纯静态）'}`);
  console.log(`  API 端点：${data.backend.apiEndpoints.join(' · ') || '—'}`);
  console.log('\n【分布式】');
  console.log(`  ${data.distributed.model}`);
  console.log(`  租约 TTL ${data.distributed.leaseTtlMinutes ?? '—'} 分钟 · 使用租约的脚本：${data.distributed.leaseUsers.join(' · ') || '无'}`);
}

// ── 7. 声明与实测的一致性（漂移即失败）──
if (data.readmeCounts) {
  const bad = [];
  if (data.readmeCounts.subjects !== data.structure.subjects) bad.push(`学科 ${data.readmeCounts.subjects}≠${data.structure.subjects}`);
  if (data.readmeCounts.chapters !== data.structure.chaptersDeclared) bad.push(`章节 ${data.readmeCounts.chapters}≠${data.structure.chaptersDeclared}`);
  if (data.readmeCounts.hours !== data.structure.hours) bad.push(`学时 ${data.readmeCounts.hours}≠${data.structure.hours}`);
  if (data.readmeCounts.built !== data.structure.chaptersWithBody) bad.push(`已建 ${data.readmeCounts.built}≠${data.structure.chaptersWithBody}`);
  if (bad.length) {
    console.error(`\n✗ README 计数与实测不一致：${bad.join('；')}（跑 npm run catalog 重新生成）`);
    process.exit(1);
  }
}
