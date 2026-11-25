#!/usr/bin/env node
/**
 * scripts/check_chapter_outputs.js —— 章节 outputs（prompt / skill）与正文对齐门
 *
 * 背景：3,139 / 4,338 份 outputs 曾是旧脚手架——写着「跑 main.js 看三辨分布」
 * 「22 单元 / 32,790 汉字」，而补实后的正文与新代码里都没有这些东西。
 * 2026-11-23 起由 scripts/build_chapter_outputs.js 从 docs/zh.md + quiz.json 重建。
 *
 * 本门只对已登记补实科目断言（data/course-docs-rewritten.json）：
 *   1. prompt-<章>.md 与 skill-<slug>.md 都必须存在
 *   2. 不得出现脚手架指纹（三辨/四位面/单元规模/本课第 N 章）
 *   3. 必须指向真实入口：出现 `node code/main.js`
 *   4. 声明的节数与汉字数必须与 docs/zh.md 实测一致（±0）
 *   5. 声明的习题道数必须与 quiz.json 实数一致
 *   6. skill 的 frontmatter name 必须等于章节 slug（去序号）
 *   7. skill 至少引用一条正文里的判据或边界原句（可核）
 *
 * 用法：node scripts/check_chapter_outputs.js [--report]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { sections: splitSections } = require('./build_chapter_outputs');

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hz = (s) => (s.match(CJK) || []).length;
const BAD = [/三辨/, /四位面/, /单元规模/, /本课第\s*\d+\s*章[（(]/];

function main() {
  const report = process.argv.includes('--report');
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course-docs-rewritten.json'), 'utf8'));
  let okSubjects = 0;
  let totalChapters = 0;
  const violations = [];

  for (const r of reg.rewritten) {
    const sdir = path.join(ROOT, 'departments', r.dept, r.subject);
    const cdirs = path.join(sdir, 'chapters');
    if (!fs.existsSync(cdirs)) continue;
    const v = [];
    for (const c of fs.readdirSync(cdirs).sort()) {
      const docsPath = path.join(cdirs, c, 'docs', 'zh.md');
      const quizPath = path.join(cdirs, c, 'quiz.json');
      if (!fs.existsSync(docsPath) || !fs.existsSync(quizPath)) continue;
      totalChapters += 1;
      const md = fs.readFileSync(docsPath, 'utf8').replace(/\r\n/g, '\n');
      const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
      const qn = quiz.questions.length;
      const hanzi = hz(md);
      const secs = splitSections(md).length;
      const slug = c.replace(/^\d+-/, '');
      const outFiles = fs.existsSync(path.join(cdirs, c, 'outputs'))
        ? fs.readdirSync(path.join(cdirs, c, 'outputs')).filter((f) => /^skill-.*\.md$/.test(f))
        : [];
      const skillPath = path.join(cdirs, c, 'outputs', outFiles[0] || `skill-${slug}.md`);
      if (outFiles.length > 1) v.push(`${c}: outputs 里有 ${outFiles.length} 份 skill-*.md（应只有一份）`);
      const promptFiles = fs.existsSync(path.join(cdirs, c, 'outputs'))
        ? fs.readdirSync(path.join(cdirs, c, 'outputs')).filter((f) => /^prompt-.*\.md$/.test(f))
        : [];
      if (promptFiles.length > 1) v.push(`${c}: outputs 里有 ${promptFiles.length} 份 prompt-*.md（应只有一份）`);
      const promptPath = path.join(cdirs, c, 'outputs', promptFiles[0] || `prompt-${c}.md`);
      if (!fs.existsSync(promptPath)) { v.push(`${c}: 缺 prompt-${c}.md`); continue; }
      if (!fs.existsSync(skillPath)) { v.push(`${c}: 缺 skill-${slug}.md`); continue; }
      const prompt = fs.readFileSync(promptPath, 'utf8').replace(/\r\n/g, '\n');
      const skill = fs.readFileSync(skillPath, 'utf8').replace(/\r\n/g, '\n');

      for (const [name, text] of [['prompt', prompt], ['skill', skill]]) {
        for (const re of BAD) {
          if (re.test(text)) v.push(`${c}: ${name} 含脚手架指纹 ${re}`);
        }
        if (!/node code\/main\.js/.test(text)) v.push(`${c}: ${name} 未指向 node code/main.js`);
      }
      // 只认生成器写的那句声明（「本章 N 节 / M 汉字」）。prompt 正文里会原样引用
      // 小节标题（如「24 味、6 节、2,956 字：…」），裸 /(\d+)\s*节/ 会先命中引文，
      // 把正确的声明判成漂移——这是门的假阳性，不是 outputs 过期。
      const mDecl = prompt.match(/本章\s*(\d+)\s*节\s*\/\s*([\d,]+)\s*汉字/);
      const mHan = mDecl ? [null, mDecl[2]] : prompt.match(/([\d,]+)\s*汉字/);
      if (mHan && Number(mHan[1].replace(/,/g, '')) !== hanzi) {
        v.push(`${c}: prompt 声明汉字 ${mHan[1]} ≠ 实测 ${hanzi}`);
      }
      const mSec = mDecl ? [null, mDecl[1]] : null;
      if (mSec && Number(mSec[1]) !== secs) v.push(`${c}: prompt 声明节数 ${mSec[1]} ≠ 实测 ${secs}`);
      const mQ = prompt.match(/习题\s*(\d+)\s*道/);
      if (mQ && Number(mQ[1]) !== qn) v.push(`${c}: prompt 声明习题 ${mQ[1]} ≠ 实际 ${qn}`);
      const mQs = skill.match(/`quiz\.json`\s*的\s*(\d+)\s*道题/);
      if (mQs && Number(mQs[1]) !== qn) v.push(`${c}: skill 声明习题 ${mQs[1]} ≠ 实际 ${qn}`);
      const mName = skill.match(/^---\n[\s\S]*?^name:\s*(\S+)\s*$/m);
      if (!mName || mName[1] !== slug) v.push(`${c}: skill name ${mName ? mName[1] : '缺失'} ≠ ${slug}`);

      // 至少引用一条正文原句（判据或边界）
      const quoted = skill.match(/^-\s+(.{8,120})$/gm) || [];
      const hit = quoted.some((line) => {
        const s = line.replace(/^-\s+/, '').replace(/\*\*/g, '').trim();
        const core = s.slice(0, 12);
        return core && md.includes(core);
      });
      if (!hit) v.push(`${c}: skill 未引用正文原句（判据/边界）`);
    }
    if (v.length) violations.push({ subject: `${r.dept}/${r.subject}`, v });
    else okSubjects += 1;
  }

  for (const { subject, v } of violations) {
    console.log(`✗ ${subject}   ${v.length} 处`);
    if (report) for (const line of v.slice(0, 6)) console.log(`    ${line}`);
  }
  const bad = violations.reduce((a, x) => a + x.v.length, 0);
  console.log(`\n扫描已登记科目 ${reg.rewritten.length} 门 / ${totalChapters} 章`);
  console.log(bad
    ? `✗ ${violations.length} 门 / ${bad} 处 outputs 与正文不一致`
    : '✓ 章节 outputs 与正文同源（无脚手架残留、入口真实、声明数字与实测一致、引用可核）');
  process.exit(bad ? 1 : 0);
}

if (require.main === module) main();
