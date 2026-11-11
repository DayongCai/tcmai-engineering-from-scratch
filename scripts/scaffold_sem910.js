#!/usr/bin/env node
/**
 * scripts/scaffold_sem910.js —— 落盘第 9/10 学期新增学科的目录骨架与章节知识结构
 *
 * 为什么单独一个脚本：`scaffold_subject.js` 只写空 chapters.json（它的契约是「章节由人开」）。
 * 但第 9/10 学期的轮转 / 毕设课的章节名是**这一轮就定稿**的（见 data/new-subjects-chapters.json），
 * 否则 L1 结构层会因为「chapters.json 章数 0 ≠ 目标 6」直接红。
 *
 *   node scripts/scaffold_sem910.js           生成缺失的 README / meta.json，并写 chapters.json
 *   node scripts/scaffold_sem910.js --check   只对账，不写盘
 *
 * 契约（2026-11 修正）：
 *   **章节名与顺序**来自 data/new-subjects-chapters.json，不许手改；
 *   **状态与产物路径**由磁盘现算——`chapters/<slug>/docs/zh.md` 存在即 🚧 并写 docs/code 两栏，否则 ⬚。
 *   此前本脚本把 status 一律写死 ⬚、--check 又要求整份文件字节相同，导致这门课一旦开始写正文
 *   就会把 `npm run check` 打红；现在只强制 (n, slug, title) 三项一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT, loadCurriculum, writeJson } = require('./lib');

const CHECK = process.argv.includes('--check');
const cur = loadCurriculum();
const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'new-subjects-chapters.json'), 'utf8')
);
const byKey = new Map(data.subjects.map((s) => [s.key, s.chapters]));

const targets = cur.departments.flatMap((d) => d.subjects.filter((s) => s.semester >= 9));

let bad = 0;
let wrote = 0;
let built = 0;

for (const s of targets) {
  const key = `${s.deptSlug}/${s.slug}`;
  const chapters = byKey.get(key);
  if (!chapters) {
    console.error(`✗ ${key} 缺章节知识结构（data/new-subjects-chapters.json 里没有）`);
    bad += 1;
    continue;
  }
  if (chapters.length !== s.chapters) {
    console.error(`✗ ${key} 章名数 ${chapters.length} ≠ 章节目标 ${s.chapters}`);
    bad += 1;
    continue;
  }
  const dir = path.join(ROOT, s.path);
  const needScaffold = !fs.existsSync(path.join(dir, 'README.md')) || !fs.existsSync(path.join(dir, 'meta.json'));
  if (needScaffold && !CHECK) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'scaffold_subject.js'), key], { stdio: 'inherit' });
    wrote += 1;
  }
  if (needScaffold && CHECK) {
    console.error(`✗ ${key} 缺 README.md / meta.json（先跑 node scripts/scaffold_sem910.js）`);
    bad += 1;
    continue;
  }

  const expected = chapters.map(([slug, title], i) => ({
    n: i + 1,
    slug: `${String(i + 1).padStart(2, '0')}-${slug}`,
    title,
  }));

  const idxPath = path.join(dir, 'chapters.json');
  const prev = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : null;
  const prevBySlug = new Map((prev?.chapters || []).map((c) => [c.slug, c]));

  const payload = {
    slug: s.slug,
    title: s.title,
    chapters: expected.map((e) => {
      const old = prevBySlug.get(e.slug);
      const docsPath = path.join(dir, 'chapters', e.slug, 'docs', 'zh.md');
      const hasDocs = fs.existsSync(docsPath);
      const out = { ...e, status: hasDocs ? '🚧' : '⬚' };
      if (hasDocs) {
        built += 1;
        out.kind = old?.kind || 'core';
        out.docs = `chapters/${e.slug}/docs/zh.md`;
        out.code = `chapters/${e.slug}/code/main.js`;
      }
      return out;
    }),
  };

  if (CHECK) {
    // 只对账「章节名与顺序」；状态/产物路径由磁盘现算，不进对账口径
    const curRaw = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : null;
    const curList = (curRaw?.chapters || []).map((c) => [c.n, c.slug, c.title]);
    const expList = expected.map((c) => [c.n, c.slug, c.title]);
    if (JSON.stringify(curList) !== JSON.stringify(expList)) {
      console.error(`✗ ${key} chapters.json 的章节名/顺序与知识结构不一致`);
      bad += 1;
    }
    continue;
  }
  fs.writeFileSync(idxPath, JSON.stringify(payload, null, 2) + '\n');
}

if (CHECK) {
  if (bad) {
    console.error(`\n第 9/10 学期骨架：${bad} 处不一致。`);
    process.exit(1);
  }
  console.log(`✓ 第 9/10 学期骨架 ${targets.length} 门：README / meta / chapters.json 齐备且与知识结构一致`);
  process.exit(0);
}

console.log(`✓ 第 9/10 学期 ${targets.length} 门学科：chapters.json 写入完成（新建 ${wrote} 个目录骨架 · 已建章节 ${built}）`);
