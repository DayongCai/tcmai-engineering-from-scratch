#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 7 章 脱位是关节的事，后果常在关节外
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/07-tuowei/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的判据是「复位成功不等于治疗结束」，而最容易漏的是关节外的那一层。
 * 脚本从正文里读出：分类五维、病理四层、复位三步、复位成功的四条标准、各部位的神经血管搭档，
 * 以及「复位前后各查一次」这句纪律是否真的写着。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   分类     新鲜与陈旧 / 闭合与开放 / 完全与不全 / 急性与习惯性 / 先天性
 *   病理     关节囊 / 韧带 / 骨与软骨 / 关节内嵌顿物
 *   复位     先松弛 → 再牵引 → 顺路径
 *   标准     对合 / 被动活动无阻挡 / 稳定 / 神经血管完好
 *   搭档     肩前-腋神经、髋后-坐骨神经、膝-腘动脉与腓总神经
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '脱位是关节的事，后果常在关节外';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const KINDS = ['新鲜与陈旧', '闭合与开放', '完全与不全', '习惯性', '先天性'];
const PATHOLOGY = ['关节囊撕裂', '韧带损伤', '骨与软骨', '关节内嵌顿物'];
const RESET_STEPS = ['先松弛', '再牵引', '顺着脱出的路径返回'];
const SUCCESS = ['对合关系恢复', '被动活动无阻挡', '复位后稳定', '神经血管完好'];
const PAIRS = [
  { site: '肩关节前脱位', nerve: '腋神经' },
  { site: '髋关节后脱位', nerve: '坐骨神经' },
  { site: '膝关节脱位', nerve: '腓总神经' },
];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const kinds = KINDS.filter((w) => body.includes(w));
  const pathology = PATHOLOGY.filter((w) => body.includes(w));

  const steps = RESET_STEPS.map((s) => ({ step: s, at: body.indexOf(s) }));
  const stepsOrdered = steps.every((s, i) => s.at >= 0 && (i === 0 || s.at > steps[i - 1].at));

  const success = SUCCESS.filter((w) => body.includes(w));
  const twice = body.includes('复位前后各查一次神经血管');
  const reImage = body.includes('复位后必须复查影像');

  const pairs = PAIRS.map((p) => ({
    ...p,
    siteAt: body.indexOf(p.site),
    nerveAt: body.indexOf(p.nerve),
    ok: body.includes(p.site) && body.includes(p.nerve),
  }));

  return { hanzi, sections, cites, citeCount: cites.length, kinds, pathology, steps, stepsOrdered, success, twice, reImage, pairs };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`分类维度：${a.kinds.join('、')}（${a.kinds.length}/5）`);
  console.log(`病理四层：${a.pathology.join('、')}（${a.pathology.length}/4）`);
  console.log('');
  console.log('复位三步（正文先后）：');
  for (const s of a.steps) console.log(`  ${s.step.padEnd(9, '　')} 第 ${String(s.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.stepsOrdered ? '次序成立' : '次序不成立'}`);
  console.log('');
  console.log(`复位成功的标准：${a.success.join('、') || '—'}（${a.success.length}/4）`);
  console.log(`复位前后各查一次神经血管：${a.twice ? '写着' : '未写'}`);
  console.log(`复位后必须复查影像：${a.reImage ? '写着' : '未写'}`);
  console.log('');
  console.log('关节外的那一层（部位 → 该查的神经）：');
  for (const p of a.pairs) console.log(`  ${p.site.padEnd(8, '　')} → ${p.nerve}${p.ok ? '' : '（正文未配对）'}`);
  console.log('');
  console.log('※ 复位成功不等于治疗结束；固定体位、时长与康复起点决定最终功能。');
  console.log('※ 本章不含麻醉、药物剂量与固定周数；实际处理以所在机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, KINDS, PATHOLOGY, RESET_STEPS, SUCCESS, PAIRS, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
