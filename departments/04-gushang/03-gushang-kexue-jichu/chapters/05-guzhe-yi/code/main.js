#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 5 章 上肢骨折的难点不在接骨，在功能
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/05-guzhe-yi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的判据是「接上不等于能用」。脚本把正文里几组必须成套出现的条目读出来：
 * 移位五项、愈合三段、临床愈合五条、前臂的两个组合骨折，看它们是否真的齐全、按序。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   移位     成角 / 侧方移位 / 短缩或分离 / 旋转 / 骨块嵌入
 *   愈合     血肿炎症期 → 原始骨痂形成期 → 骨痂改造塑形期
 *   愈合标准 五条
 *   组合     孟氏（尺骨上 1/3 + 桡骨头脱位）/ 盖氏（桡骨下 1/3 + 下尺桡关节脱位）
 *   功能     复位成功与治疗成功的区分句
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '上肢骨折的难点不在接骨，在功能';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const DISPLACEMENT = ['成角', '侧方移位', '短缩或分离', '旋转', '骨块嵌入'];
const HEALING = ['血肿炎症期', '原始骨痂形成期', '骨痂改造塑形期'];
const UNION = ['局部无压痛', '无纵向叩击痛', '无异常活动', '连续性骨痂', '不变形'];
const COMBOS = [
  { name: '孟氏骨折', ulna: '尺骨上 1/3 骨折合并桡骨头脱位', keyword: '桡骨头脱位' },
  { name: '盖氏骨折', radius: '桡骨下 1/3 骨折合并下尺桡关节脱位', keyword: '下尺桡关节脱位' },
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

  const displacement = DISPLACEMENT.filter((w) => body.includes(w));
  const healing = HEALING.map((k) => ({ key: k, at: body.indexOf(k) }));
  const healingOrdered = healing.every((h, i) => h.at >= 0 && (i === 0 || h.at > healing[i - 1].at));
  const union = UNION.filter((w) => body.includes(w));
  const combos = COMBOS.map((c) => ({ name: c.name, at: body.indexOf(c.name), keyword: c.keyword, ok: body.includes(c.keyword) }));

  const functionalGoal = body.includes('复位成功了，治疗失败了');
  const handReach = body.includes('手能不能到该到的地方');
  const rotationJoke = body.includes('指甲是否共面');

  return { hanzi, sections, cites, citeCount: cites.length, displacement, healing, healingOrdered, union, combos, functionalGoal, handReach, rotationJoke };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`移位五项：${a.displacement.join('、') || '—'}（${a.displacement.length}/5）`);
  console.log('');
  console.log('愈合三段（正文先后）：');
  for (const h of a.healing) console.log(`  ${h.key.padEnd(8, '　')} 第 ${String(h.at + 1).padStart(5)} 字`);
  console.log(`  → 次序${a.healingOrdered ? '成立' : '不成立'}`);
  console.log('');
  console.log(`临床愈合五条：${a.union.join('、') || '—'}（${a.union.length}/5）`);
  console.log('');
  console.log('前臂环上的两个组合：');
  for (const c of a.combos) {
    console.log(`  ${c.name}（第 ${c.at + 1} 字）→ 关键词「${c.keyword}」${c.ok ? '在正文' : '缺失'}`);
  }
  console.log('');
  console.log(`功能判据：${a.functionalGoal ? '复位成功了，治疗失败了' : '正文未写'}`);
  console.log(`目标函数：${a.handReach ? '手能不能到该到的地方' : '正文未写'}`);
  console.log(`旋转的床边判法：${a.rotationJoke ? '握拳看指甲是否共面' : '正文未写'}`);
  console.log('');
  console.log('※ 复位漂亮不是终点；上肢的结局由活动度、肌力、感觉与协调共同决定。');
  console.log('※ 本章不含药物剂量、固定周数与手术阈值；实际方案以所在机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, DISPLACEMENT, HEALING, UNION, COMBOS, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
