#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 9 章 内伤看不见伤口，骨病不总是外伤
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/09-neishang-gubing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把两类「看起来没事」的病放在一起：内伤（体征轻、进展快）与骨病（没有外伤也会断、会长东西）。
 * 脚本从正文里读出内伤三类、病机三线、腹部三规则、骨肿瘤五条预警、四个「不做」，以及交叉处的判据。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   内伤     气血伤 / 脏腑伤 / 经络伤
 *   病机     气机逆乱 / 瘀血内停 / 亡血与气脱，及大出血的例外
 *   腹部     反复查体 / 看全身 / 想到腹膜后
 *   肿瘤     五条预警 + 四个不做
 *   交叉     病理性骨折「先查病因，再谈固定」、卧床并发症群
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '内伤看不见伤口，骨病不总是外伤';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const KINDS = ['气血伤', '脏腑伤', '经络伤'];
const PATHO = ['气机逆乱', '瘀血内停', '亡血与气脱'];
const ABDOMEN = ['反复查体', '看全身', '想到腹膜后'];
const TUMOR_SIGNS = ['夜间痛', '局部可触及肿块', '体重下降', '病理性骨折', '生长痛'];
const DONT = ['不做按摩', '不做理疗', '不做切开引流', '不擅自穿刺'];
const BEDRIDDEN = ['肺炎', '压疮', '深静脉血栓', '泌尿系感染', '废用性骨质疏松'];

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
  // 病机三条主线在正文里是加粗项；瘀血内停在讲脏腑因果时先被提到，故按加粗定位
  const patho = PATHO.map((w) => ({ key: w, at: body.indexOf('**' + w + '**') }));
  const pathoOrdered = patho.every((p, i) => p.at >= 0 && (i === 0 || p.at > patho[i - 1].at));

  const abdomen = ABDOMEN.filter((w) => body.includes(w));
  const tumorSigns = TUMOR_SIGNS.filter((w) => body.includes(w));
  const dont = DONT.filter((w) => body.includes(w));
  const bedridden = BEDRIDDEN.filter((w) => body.includes(w));

  const bleedException = body.includes('大出血的病人不按三期走');
  const bleedOrder = body.includes('先固脱，后化瘀');
  const pathoFracture = body.includes('先查病因，再谈固定');
  const imagingLag = body.includes('影像滞后于临床');
  const coldAbscess = body.includes('冷脓肿');

  return { hanzi, sections, cites, citeCount: cites.length, kinds, patho, pathoOrdered, abdomen, tumorSigns, dont, bedridden, bleedException, bleedOrder, pathoFracture, imagingLag, coldAbscess };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`内伤三类：${a.kinds.join('、') || '—'}（${a.kinds.length}/3）`);
  console.log('病机三主线（正文先后）：');
  for (const p of a.patho) console.log(`  ${p.key.padEnd(6, '　')} 第 ${String(p.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.pathoOrdered ? '次序成立' : '次序不成立'}`);
  console.log(`  大出血的例外：${a.bleedException && a.bleedOrder ? '不按三期走，先固脱后化瘀' : '未写全'}`);
  console.log('');
  console.log(`腹部三规则：${a.abdomen.join('、') || '—'}（${a.abdomen.length}/3）`);
  console.log(`骨肿瘤预警：${a.tumorSigns.join('、') || '—'}（${a.tumorSigns.length}/5）`);
  console.log(`四个「不做」：${a.dont.join('、') || '—'}（${a.dont.length}/4）`);
  console.log('');
  console.log(`病理性骨折的处理：${a.pathoFracture ? '先查病因，再谈固定' : '未写'}`);
  console.log(`附骨疽的影像时差：${a.imagingLag ? '影像滞后于临床' : '未写'}`);
  console.log(`骨痨的局部体征：${a.coldAbscess ? '不红不热的冷脓肿' : '未写'}`);
  console.log(`卧床并发症：${a.bedridden.join('、') || '—'}（${a.bedridden.length}/5）`);
  console.log('');
  console.log('※ 内伤的漏诊率高，因为它看起来没事；能降低漏诊的不是更贵的设备，是反复查体。');
  console.log('※ 本章不含药物剂量、疗程与手术阈值；实际诊疗以所在机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, KINDS, PATHO, ABDOMEN, TUMOR_SIGNS, DONT, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
