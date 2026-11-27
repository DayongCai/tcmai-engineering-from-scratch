#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 6 章 下肢骨折先算血，再算骨
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/06-guzhe-er/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的判据是优先级：血在骨之前，救命在保功能之前。脚本验证这条优先级真的写成句子，
 * 并把正文里几组「必须成套查」的条目读出来：骨盆四查、脊柱三柱、跟骨三查。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   优先级   血流动力学先于对线（两句判据的位置）
 *   髋部     股骨颈（囊内）/ 转子间（囊外）的对照
 *   骨盆     尿道与膀胱 / 直肠 / 阴道 / 神经
 *   脊柱     前柱 / 中柱 / 后柱，ASIA
 *   跟骨     高度与宽度 / 距下关节面 / 腰椎
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '下肢骨折先算血，再算骨';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const PELVIS = ['尿道与膀胱', '直肠', '阴道', '神经'];
const COLUMNS = ['前柱', '中柱', '后柱'];
const CALCANEUS = ['跟骨高度与宽度', '距下关节面', '腰椎'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (body, w) => body.split(w).length - 1;

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const priority = [
    { key: '血流动力学', at: body.indexOf('第一条永远是血流动力学') },
    { key: '对线', at: body.indexOf('第二条才是对线') },
  ];
  const bloodFirst = priority.every((p) => p.at >= 0) && priority[0].at < priority[1].at;

  const hipNeck = body.indexOf('**股骨颈骨折**是囊内骨折');
  const hipTroch = body.indexOf('**股骨转子间骨折**是囊外骨折');
  const hipContrast = hipNeck >= 0 && hipTroch >= 0 && hipNeck < hipTroch;

  const pelvis = PELVIS.filter((w) => body.includes(w));
  const columns = COLUMNS.filter((w) => body.includes(w));
  const asia = body.includes('ASIA');
  const calcaneus = CALCANEUS.filter((w) => body.includes(w));
  const kneeHip = body.includes('膝痛查髋，髋痛查膝');
  const femurBlood = body.includes('吞下大量血液') || body.includes('失血量大');
  const bloodLoss = { 失血: count(body, '失血'), 休克: count(body, '休克') };

  return { hanzi, sections, cites, citeCount: cites.length, priority, bloodFirst, hipNeck, hipTroch, hipContrast, pelvis, columns, asia, calcaneus, kneeHip, femurBlood, bloodLoss };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log('优先级：');
  for (const p of a.priority) console.log(`  ${p.key.padEnd(6, '　')} 第 ${String(p.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.bloodFirst ? '先算血，再算骨：次序成立' : '正文未把血排在骨之前'}`);
  console.log(`  股骨干失血提示：${a.femurBlood ? '一侧股骨干可吞下大量血液' : '未写'}`);
  console.log(`  失血一词 ${a.bloodLoss.失血} 次 · 休克一词 ${a.bloodLoss.休克} 次`);
  console.log('');
  console.log(`髋部两骨折对照：股骨颈（第 ${a.hipNeck + 1} 字，囊内） vs 转子间（第 ${a.hipTroch + 1} 字，囊外）`);
  console.log(`  → ${a.hipContrast ? '先讲囊内、再讲囊外，与正文一致' : '对照段落不成立'}`);
  console.log(`  「膝痛查髋，髋痛查膝」：${a.kneeHip ? '写着' : '未写'}`);
  console.log('');
  console.log(`骨盆四查：${a.pelvis.join('、') || '—'}（${a.pelvis.length}/4）`);
  console.log(`脊柱三柱：${a.columns.join('、') || '—'}（${a.columns.length}/3）`);
  console.log(`神经记录用 ASIA：${a.asia ? '写着' : '未写'}`);
  console.log('');
  console.log(`跟骨三查：${a.calcaneus.join('、') || '—'}（${a.calcaneus.length}/3）`);
  console.log('');
  console.log('※ 失血量的估算很粗，只能当预警；它的作用是提高警惕，不是算出输多少。');
  console.log('※ 本章不含药物剂量、输血阈值与手术时限；实际决策以所在机构规范与创伤救治流程为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, PELVIS, COLUMNS, CALCANEUS, read, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
