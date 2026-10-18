#!/usr/bin/env node
/**
 * build_knowledge_structure.js —— 从 authored 知识结构源生成各学科的 chapters.json
 *
 *   node scripts/build_knowledge_structure.js            # 生成缺失的 chapters.json（不覆盖已存在）
 *   node scripts/build_knowledge_structure.js --force     # 全量重写（已建章节的标题也会被源覆盖 —— 慎用）
 *   node scripts/build_knowledge_structure.js --check     # 只校验，不写文件；不一致则退出码 1
 *
 * 为什么要有这一层（而不是直接手写 120 份 chapters.json）：
 *   章节结构是**一个院系的课程设计**，不是 120 份互不相干的文件。按院系写成一份可读的
 *   结构源（`standards/knowledge-structure/<dept>.txt`），再由本脚本摊成学科索引 ——
 *   这样「本系 15 门课的章节分配是否均衡」一眼可看，改一处也只改一处。
 *   这与仓库的 L0→L1 单向派生同构：源是人写的，chapters.json 是投影。
 *
 * 源格式（每个院系一个文件，UTF-8）：
 *
 *   # 01-zhongyi 中医系 · 章节知识结构
 *   # 行格式：<NN>|<章节标题>|<slug>；## 开头的是学科块，正文前的 # 行是注释
 *
 *   ## 01-zhongyi-jichu-lilun
 *   01|绪论：中医学的学科属性与工程化边界|xulun
 *   02|阴阳学说 → 二分类|yin-yang-er-fenlei
 *
 * 校验（任一不满足即失败，不做静默修正）：
 *   · 学科必须在 curriculum.json 里，且每门学科恰好一个块
 *   · 章节数必须等于 curriculum 的 chaptersTarget —— 「声称 10 章、只设计 8 章」是数据错误
 *   · n 必须为 01..NN 连续；slug 必须形如 NN-english-slug 且学科内唯一
 *   · 标题在学科内不得重复
 *   · 已建章节（chapters/ 下已有目录）的 slug 必须与索引一致，否则 --force 会改坏路径
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, loadCurriculum, writeJson } = require('./lib');

const SRC_DIR = path.join(ROOT, 'standards', 'knowledge-structure');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(`✗ 缺少知识结构源目录: standards/knowledge-structure/`);
  process.exit(1);
}

/** 解析一份院系结构源 → Map(subjectSlug → chapters[]) */
function parseDeptFile(fileName) {
  const file = path.join(SRC_DIR, fileName);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = new Map();
  let curSubject = null;
  let curList = null;

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const at = `${fileName}:${i + 1}`;

    // 「## 学科」必须先于注释判定 —— 它本身也以 # 开头，先判注释就会把全部学科块吃掉
    // （第一次跑实测：覆盖学科 0/120，章节数却是对的，因为章节行没被跳过）。
    const h = /^##\s+(\S+)\s*$/.exec(line);
    if (h) {
      const slug = h[1];
      if (out.has(slug)) fail(`${at} 学科块重复: ${slug}`);
      curSubject = slug;
      curList = [];
      out.set(slug, { slug, chapters: curList, at });
      return;
    }

    if (line.startsWith('#')) return;
    if (!curSubject) {
      fail(`${at} 章节行出现在任何「## 学科」块之前: ${line}`);
      return;
    }

    const parts = line.split('|').map((s) => s.trim());
    if (parts.length !== 3) {
      fail(`${at} 应为 <NN>|<标题>|<slug> 三段，收到 ${parts.length} 段: ${line}`);
      return;
    }
    const [nn, title, slug] = parts;
    if (!/^\d{2}$/.test(nn)) fail(`${at} 章号必须是两位数字: ${nn}`);
    if (!title) fail(`${at} 标题为空`);
    // 源里只写词干（如 yin-yang-er-fenlei），章号前缀由本脚本加 —— 源里写两遍章号必然漂移。
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`${at} slug 只能是英文小写词干（连字符分隔）: ${slug}`);
    curList.push({ n: Number(nn), title, slug: `${nn}-${slug}` });
  });

  return out;
}

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.txt')).sort();
if (!files.length) {
  console.error('✗ standards/knowledge-structure/ 下没有任何 .txt 结构源');
  process.exit(1);
}

let written = 0;
let skipped = 0;
let checked = 0;
const seenSubjects = new Set();

for (const fileName of files) {
  const blocks = parseDeptFile(fileName);

  for (const [subjectSlug, block] of blocks) {
    const subject = flat.find((s) => s.slug === subjectSlug);
    if (!subject) {
      fail(`${fileName} 里的学科不在 curriculum.json: ${subjectSlug}`);
      continue;
    }
    if (seenSubjects.has(subjectSlug)) fail(`学科被两份结构源同时声明: ${subjectSlug}`);
    seenSubjects.add(subjectSlug);

    const want = subject.chapters;              // chaptersTarget
    const got = block.chapters.length;
    if (got !== want) {
      fail(`${subjectSlug} 章节数 ${got} ≠ curriculum 目标 ${want}（${fileName}）`);
      continue;
    }

    // 章号连续
    block.chapters.forEach((c, idx) => {
      if (c.n !== idx + 1) fail(`${subjectSlug} 章号不连续: 第 ${idx + 1} 条是 ${c.n}`);
    });

    // 学科内唯一性
    const slugs = new Set();
    const titles = new Set();
    for (const c of block.chapters) {
      if (slugs.has(c.slug)) fail(`${subjectSlug} slug 重复: ${c.slug}`);
      slugs.add(c.slug);
      if (titles.has(c.title)) fail(`${subjectSlug} 标题重复: ${c.title}`);
      titles.add(c.title);
    }

    // 已建章节（磁盘上有目录）必须与索引一致 —— 否则改了源就找不到正文了
    const chaptersDir = path.join(ROOT, subject.path, 'chapters');
    const builtDirs = fs.existsSync(chaptersDir)
      ? fs.readdirSync(chaptersDir).filter((x) => fs.statSync(path.join(chaptersDir, x)).isDirectory())
      : [];
    for (const d of builtDirs) {
      const c = block.chapters.find((x) => x.slug === d);
      if (!c) fail(`${subjectSlug} 已建章节 ${d} 不在结构源里（--force 会把它从索引中抹掉）`);
    }

    const chapters = block.chapters.map((c) => ({
      n: c.n,
      slug: c.slug,
      title: c.title,
      // 盘上有目录 = 在建；否则 = 待写。状态由磁盘事实决定，不由源里手填。
      status: builtDirs.includes(c.slug) ? '🚧' : '📋',
    }));

    const indexPath = path.join(ROOT, subject.path, 'chapters.json');
    const payload = { slug: subject.slug, title: subject.title, chapters };

    if (CHECK) {
      const old = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : null;
      if (JSON.stringify(old) !== JSON.stringify(payload)) {
        fail(`${subject.path}/chapters.json 与结构源不一致`);
      }
      checked += 1;
      continue;
    }

    if (fs.existsSync(indexPath) && !FORCE) {
      skipped += 1;
      continue;
    }

    writeJson(indexPath, payload);
    written += 1;
  }
}

const missing = flat.filter((s) => !seenSubjects.has(s.slug));
for (const s of missing) {
  fail(`学科没有章节结构源: ${s.deptSlug}/${s.slug}（${s.title}，目标 ${s.chapters} 章）`);
}

const totalChapters = flat.reduce((a, s) => a + s.chapters, 0);
console.log('');
console.log(`═══ 知识结构 ═══`);
console.log(`  结构源 ${files.length} 份 · 覆盖学科 ${seenSubjects.size}/${flat.length} · 章节 ${totalChapters}`);
console.log(
  CHECK
    ? `  校验 ${checked} 份 · 不一致 ${process.exitCode ? '有' : '无'}`
    : `  写入 ${written} · 已存在跳过 ${skipped}（--force 可重写）`,
);
if (process.exitCode) {
  console.error('\n✗ 知识结构未通过校验，见上方逐条错误');
} else {
  console.log('\n✅ 知识结构通过');
}
