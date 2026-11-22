#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 8 章 筋伤的病人大多不需要手术，但都需要诊断
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/08-jinshang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的判据是「先定位，再谈治疗」。脚本把正文里必须成套出现的条目读出来：
 * 机制六类、病机四线、诊断四步、腰腿痛的红旗征，并核对「脊髓型是手法禁忌」是否写着。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   机制     扭伤 / 挫伤 / 劳损 / 筋断 / 筋出槽 / 腱鞘与滑囊病变
 *   病机     气滞血瘀 / 寒湿痹阻 / 肝肾亏虚 / 痰瘀互结
 *   分期     急性期 → 亚急性期 → 慢性期
 *   诊断     一问机制 → 二查定位 → 三做应力与抗阻 → 四用影像
 *   红旗     夜间痛 / 体重下降 / 发热 / 肿瘤病史 / 大小便 / 鞍区麻木 / 肌力下降
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '筋伤的病人大多不需要手术，但都需要诊断';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const MECHANISMS = ['扭伤', '挫伤', '劳损', '筋断', '筋出槽', '腱鞘与滑囊病变'];
const PATHO = ['气滞血瘀', '寒湿痹阻', '肝肾亏虚', '痰瘀互结'];
const STAGES = ['急性期', '亚急性期', '慢性期'];
const STEPS = ['一问机制', '二查定位', '三做应力与抗阻', '四用影像'];
const RED_FLAGS = ['夜间痛', '体重下降', '发热', '肿瘤病史', '大小便功能障碍', '鞍区麻木', '肌力下降'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const mechanisms = MECHANISMS.filter((w) => body.includes(w));
  const patho = PATHO.filter((w) => body.includes(w));

  // 分期在正文里是加粗的三项；慢性期在病机段先被提到，所以按加粗定位而不是按首次出现
  const stages = STAGES.map((k) => ({ key: k, at: body.indexOf('**' + k + '**') }));
  const stagesOrdered = stages.every((s, i) => s.at >= 0 && (i === 0 || s.at > stages[i - 1].at));

  const steps = STEPS.map((k) => ({ key: k, at: body.indexOf(k) }));
  const stepsOrdered = steps.every((s, i) => s.at >= 0 && (i === 0 || s.at > steps[i - 1].at));

  const redFlags = RED_FLAGS.filter((w) => body.includes(w));
  const cordContra = body.includes('手法的绝对禁忌');
  const caudaEmergency = body.includes('马尾综合征是急症');
  const imagingLimit = body.includes('影像只能解释与查体一致的部分');

  return { hanzi, sections, cites, citeCount: cites.length, mechanisms, patho, stages, stagesOrdered, steps, stepsOrdered, redFlags, cordContra, caudaEmergency, imagingLimit };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`机制六类：${a.mechanisms.join('、') || '—'}（${a.mechanisms.length}/6）`);
  console.log(`病机四线：${a.patho.join('、') || '—'}（${a.patho.length}/4）`);
  console.log('');
  console.log('分期（正文先后）：');
  for (const s of a.stages) console.log(`  ${s.key.padEnd(6, '　')} 第 ${String(s.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.stagesOrdered ? '次序成立' : '次序不成立'}`);
  console.log('');
  console.log('诊断四步（正文先后）：');
  for (const s of a.steps) console.log(`  ${s.key.padEnd(10, '　')} 第 ${String(s.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.stepsOrdered ? '次序成立' : '次序不成立'}`);
  console.log('');
  console.log(`红旗征：${a.redFlags.join('、') || '—'}（${a.redFlags.length}/7）`);
  console.log(`马尾综合征列为急症：${a.caudaEmergency ? '写着' : '未写'}`);
  console.log(`脊髓型是手法绝对禁忌：${a.cordContra ? '写着' : '未写'}`);
  console.log(`影像的边界：${a.imagingLimit ? '只能解释与查体一致的部分' : '未写'}`);
  console.log('');
  console.log('※ 筋伤是类别，不是诊断；没有定位与分级的诊断，会让该手术的错过时机。');
  console.log('※ 本章不含药物剂量、注射次数、固定与康复周数；实际方案以所在机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, MECHANISMS, PATHO, STAGES, STEPS, RED_FLAGS, read, analyze };
