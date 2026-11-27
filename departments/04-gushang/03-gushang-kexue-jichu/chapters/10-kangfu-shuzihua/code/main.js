#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 10 章 康复不是治疗之后，是治疗的一部分
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/10-kangfu-shuzihua/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的判据是「有评定才有处方，有随访才算疗效」。脚本从正文里读出六个功能维度、
 * 康复三期、五方角色、数字化的五个方向、评价的三层，以及一份可执行处方的五个要素。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   维度     关节活动度 / 肌力与耐力 / 本体感觉与平衡 / 步态与负重 / 日常生活 / 重返工作
 *   分期     制动期 → 活动期 → 负重期（与愈合同步）
 *   协作     骨科医师 / 康复治疗师 / 护理 / 中医师 / 家属与照护者
 *   数字化   三维重建 / 导航与机器人 / 可穿戴 / 影像 AI / 结构化病历
 *   评价     结构 / 过程 / 结果
 *   处方     练哪个动作 / 一天几组 / 每组几次 / 疼到什么程度停 / 什么时候复评
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '康复不是治疗之后，是治疗的一部分';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const DIMENSIONS = ['关节活动度', '肌力与耐力', '本体感觉与平衡', '步态与负重能力', '日常生活能力', '重返工作与运动'];
const STAGES = ['制动期', '活动期', '负重期'];
const ROLES = ['骨科医师', '康复治疗师', '护理', '中医师', '家属与照护者'];
const DIGITAL = ['三维重建与 3D 打印', '手术导航与机器人', '可穿戴与远程康复', '影像人工智能', '结构化电子病历'];
const LAYERS = [
  { name: '结构', mark: '骨折对位' },
  { name: '过程', mark: '是否按规范复查' },
  { name: '结果', mark: '生活质量' },
];
const RX = ['练哪个动作', '一天几组', '每组几次', '疼到什么程度停', '什么时候复评'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const dimensions = DIMENSIONS.filter((w) => body.includes(w));

  const stages = STAGES.map((k) => ({ key: k, at: body.indexOf('**' + k) }));
  const stagesOrdered = stages.every((s, i) => s.at >= 0 && (i === 0 || s.at > stages[i - 1].at));

  const roles = ROLES.filter((w) => body.includes(w));
  const digital = DIGITAL.filter((w) => body.includes(w));
  const layers = LAYERS.map((l) => ({ ...l, ok: body.includes(l.mark) }));
  const rx = RX.filter((w) => body.includes(w));

  const syncHealing = body.includes('与愈合同步，而不是与日历同步');
  const baseline = body.includes('没有基线，就没有「进步」这个词');
  const followupBias = body.includes('失访是最大的偏倚来源');
  const fixedNotLimb = body.includes('固定的是骨折端，不是整条肢体');

  return { hanzi, sections, cites, citeCount: cites.length, dimensions, stages, stagesOrdered, roles, digital, layers, rx, syncHealing, baseline, followupBias, fixedNotLimb };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`功能维度：${a.dimensions.join('、') || '—'}（${a.dimensions.length}/6）`);
  console.log(`评定前提：${a.baseline ? '没有基线，就没有「进步」这个词' : '未写'}`);
  console.log('');
  console.log('康复分期（按正文加粗项定位）：');
  for (const s of a.stages) console.log(`  ${s.key.padEnd(4, '　')} 第 ${String(s.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.stagesOrdered ? '次序成立' : '次序不成立'}；${a.syncHealing ? '与愈合同步，而不是与日历同步' : '正文未写同步判据'}`);
  console.log('');
  console.log(`五方角色：${a.roles.join('、') || '—'}（${a.roles.length}/5）`);
  console.log(`数字化五方向：${a.digital.join('、') || '—'}（${a.digital.length}/5）`);
  console.log('');
  console.log('评价三层：');
  for (const l of a.layers) console.log(`  ${l.name}（判据：${l.mark}）${l.ok ? '' : ' —— 正文缺该层'}`);
  console.log(`处方五要素：${a.rx.join('、') || '—'}（${a.rx.length}/5）`);
  console.log('');
  console.log(`贯穿三期的原则：${a.fixedNotLimb ? '固定的是骨折端，不是整条肢体' : '未写'}`);
  console.log(`随访的地位：${a.followupBias ? '失访是最大的偏倚来源，随访率要作为质量指标报告' : '未写'}`);
  console.log('');
  console.log('※ 数字化提高的是「看得见」的能力，不自动提高「治得好」的能力。');
  console.log('※ 本章不含训练剂量、评定阈值与设备参数；具体方案以所在机构规范与治疗师评定为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, DIMENSIONS, STAGES, ROLES, DIGITAL, LAYERS, RX, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
