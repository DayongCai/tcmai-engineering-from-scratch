#!/usr/bin/env node
/**
 * platform/pipeline/extract_narration.js — docs/zh.md → narration/lesson.json
 *
 *   node platform/pipeline/extract_narration.js 01-zhongyi/01-zhongyi-jichu-lilun
 *   node platform/pipeline/extract_narration.js 01-zhongyi/01-zhongyi-jichu-lilun --chapter 01-yin-yang-er-fenlei
 *
 * 把章节文档切成可用于配音与剪辑的分镜脚本。**不生成音频**，只生成文本与段落结构。
 *
 * 时长处理原则:
 *   本脚本给出的 seconds 是**按字数的估算**（中文播报按每秒 N 字），
 *   字段名用 estimateSeconds 明示这是估算；真实的成片时长必须来自 TTS 返回或 ffprobe。
 *   两者混用是本类项目最常见的造假点，这里用字段名强制区分。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RATE = 4.6; // 中文播报估算速率（字/秒），仅用于排期与剪辑预留

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const chapterArgIdx = argv.indexOf('--chapter');
const chapterArg = chapterArgIdx >= 0 ? argv[chapterArgIdx + 1] : null;

if (!target) {
  console.error('用法: node platform/pipeline/extract_narration.js <dept>/<subject> [--chapter <slug>]');
  process.exit(1);
}

const [dept, subject] = target.includes('/') ? target.split('/') : [null, target];
if (!dept) {
  console.error('✗ 学科必须写成 <dept>/<subject> 形式，例如 01-zhongyi/01-zhongyi-jichu-lilun');
  process.exit(1);
}

const subjectDir = path.join(ROOT, 'departments', dept, subject);
if (!fs.existsSync(subjectDir)) {
  console.error(`✗ 学科目录不存在: departments/${dept}/${subject}`);
  process.exit(1);
}

const chaptersDir = path.join(subjectDir, 'chapters');
if (!fs.existsSync(chaptersDir)) {
  console.error(`✗ 学科下没有 chapters/ 目录`);
  process.exit(1);
}

const chapters = fs
  .readdirSync(chaptersDir)
  .filter((d) => fs.statSync(path.join(chaptersDir, d)).isDirectory())
  .sort();

if (chapterArg && !chapters.includes(chapterArg)) {
  console.error(`✗ 未找到章节 ${chapterArg}。可用: ${chapters.join(', ')}`);
  process.exit(1);
}

const targets = chapterArg ? [chapterArg] : chapters;

/** 按七段结构切段 */
function segment(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const segs = [];
  const push = (role, text, slide) => {
    const t = text.trim();
    if (t) segs.push({ role, text: t, slide });
  };

  // 头部三元组
  const motto = (md.match(/\*\*MOTTO:\*\*\s*(.+)/) || [])[1];
  const problem = (md.match(/\*\*PROBLEM:\*\*\s*(.+)/) || [])[1];
  const roots = (md.match(/\*\*双根因定位:\*\*\s*(.+)/) || [])[1];
  const title = (md.match(/^#\s+(.+)$/m) || [])[1];
  push('title', title || '', 'title');
  push('motto', motto || '', 'title');
  push('problem', problem || '', 'problem');
  push('roots', roots || '', 'roots');

  // 逐节切分
  let section = null;
  let buf = [];
  let inFence = false;

  const flush = () => {
    if (!section) return;
    const body = buf.join('\n').trim();
    if (!body) return;
    if (section.id === 'objectives') push('objectives', body, 'objectives');
    else if (section.id === 'concept') push('concept', body, 'concept');
    else if (section.id === 'build') push('build', body, 'build');
    else if (section.id === 'use') push('use', body, 'use');
    else if (section.id === 'ship') push('ship', body, 'ship');
    else if (section.id === 'verify') push('verify', body, 'verify');
  };

  const SECTION_IDS = [
    ['学习目标', 'objectives'],
    ['核心概念', 'concept'],
    ['BUILD IT', 'build'],
    ['USE IT', 'use'],
    ['SHIP IT', 'ship'],
    ['验证', 'verify'],
    ['练习', null],
    ['进阶思考', null],
    ['课程信息', null],
    ['课程结构', null],
  ];

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = line.match(/^##\s+(.+)$/);
    if (h && !inFence) {
      flush();
      buf = [];
      const found = SECTION_IDS.find(([name]) => h[1].startsWith(name));
      section = found ? { id: found[1] } : { id: null };
      continue;
    }
    // 图形占位单独成段，供幻灯片挂载
    const fig = line.match(/^<div data-figure="([a-z0-9-]+)"><\/div>\s*$/);
    if (fig && !inFence) {
      push('figure', fig[1], 'figure');
      continue;
    }
    if (section) buf.push(line);
  }
  flush();

  // 每集结尾必须有免责声明卡
  push('disclaimer', '本内容仅用于教育与科研，不构成临床诊疗建议。任何基于本内容的临床决策，必须由具备合法执业资格的医师复核。', 'disclaimer');

  return segs;
}

function estimateSeconds(text) {
  const chars = text.replace(/[\s`*#>|$-]/g, '').length;
  return Math.max(3, Math.round(chars / RATE));
}

const outBase = path.join(ROOT, 'platform', 'courses', dept, subject);
let written = 0;

console.log(`═══ [tcmP] 讲稿抽取 · ${dept}/${subject} ═══\n`);

for (const ch of targets) {
  const docPath = path.join(chaptersDir, ch, 'docs', 'zh.md');
  if (!fs.existsSync(docPath)) {
    console.error(`  ✗ ${ch}: 缺 docs/zh.md，跳过（不生成空讲稿）`);
    continue;
  }
  const md = fs.readFileSync(docPath, 'utf8');
  const segments = segment(md);
  const total = segments.reduce((a, s) => a + estimateSeconds(s.text), 0);

  const payload = {
    generatedBy: 'platform/pipeline/extract_narration.js',
    source: `departments/${dept}/${subject}/chapters/${ch}/docs/zh.md`,
    course: subject,
    dept,
    chapter: ch,
    title: (md.match(/^#\s+(.+)$/m) || [])[1] || ch,
    segmentCount: segments.length,
    estimateTotalSeconds: total,
    estimateNote: 'estimateSeconds 是按中文字数的排期估算，非实测时长；真实时长须来自 TTS 返回或 ffprobe',
    segments: segments.map((s, i) => ({ n: i + 1, ...s, estimateSeconds: estimateSeconds(s.text) })),
  };

  const dir = path.join(outBase, ch, 'narration');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'lesson.json');
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  written += 1;

  console.log(`  ✅ ${ch}`);
  console.log(`     ${segments.length} 段 · 估算 ${Math.floor(total / 60)}分${total % 60}秒`);
  console.log(`     ${path.relative(ROOT, file).replace(/\\/g, '/')}`);
  const roles = {};
  for (const s of segments) roles[s.role] = (roles[s.role] || 0) + 1;
  console.log(`     段落分布: ${Object.entries(roles).map(([k, v]) => `${k}×${v}`).join(' ')}`);
  if (!roles.disclaimer) console.error('     ✗ 缺少 disclaimer 段（硬规则违反）');
}

console.log(`\n完成: ${written}/${targets.length} 个章节`);
console.log('下一步: node platform/pipeline/build_slides.js ' + target);
