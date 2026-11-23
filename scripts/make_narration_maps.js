#!/usr/bin/env node
/**
 * make_narration_maps.js —— 给「正文用中文序号分节」的课程补 narration-map.json
 *
 * 为什么需要：platform/pipeline/extract_narration.js 只认七段模板名
 * （学习目标/核心概念/BUILD IT/…）。课程正文若用「## 一、…」分节，
 * 这些节全部落到 section.id = null，被**静默丢弃** —— 成片里只剩
 * 标题/MOTTO/PROBLEM/免责，正文一个字都没进旁白。
 * 实测：2169 章里 2021 章（93.2%）讲稿没有 body 段。
 *
 * 本脚本只给「还没有 map」的科目写一份通用 map（不覆盖已有手工 map）：
 *   sequential=true  → 未命中的节按 body 朗读
 *   drop             → 课程信息/教材出处/运行与验证/复算入口/本章判断/免责
 *   roles            → 代价与边界 → boundary
 *
 *   node scripts/make_narration_maps.js --dry
 *   node scripts/make_narration_maps.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry');
const DEPTS = path.join(ROOT, 'departments');

const MAP = {
  _comment:
    '正文按「一、二、三…」中文序号分节。sequential=true 让未命中的节一律按 body 朗读；运行与验证/复算入口 里是命令与打印样例，朗读无意义，drop。',
  _generatedBy: 'scripts/make_narration_maps.js',
  sequential: true,
  drop: ['课程信息', '教材出处', '运行与验证', '复算入口', '本章判断', '免责'],
  roles: { 代价与边界: 'boundary' },
  slideSplitChars: 420,
  _splitNote: '正文段超过 420 字时按空行（段落边界）拆成幻灯片；不切断句子。',
};

let made = 0;
const skipped = [];
for (const dept of fs.readdirSync(DEPTS).sort()) {
  const dp = path.join(DEPTS, dept);
  if (!fs.statSync(dp).isDirectory()) continue;
  for (const subject of fs.readdirSync(dp).sort()) {
    const sp = path.join(dp, subject);
    if (!fs.statSync(sp).isDirectory()) continue;
    const target = path.join(sp, 'narration-map.json');
    if (fs.existsSync(target)) { skipped.push(`${dept}/${subject}`); continue; }
    if (!dry) fs.writeFileSync(target, JSON.stringify(MAP, null, 2) + '\n');
    made += 1;
  }
}
console.log(`${dry ? '[dry] ' : ''}写入 map ${made} 门 · 已有 map 跳过 ${skipped.length} 门`);
if (skipped.length) console.log('已有（手写，未覆盖）:', skipped.join(', '));
