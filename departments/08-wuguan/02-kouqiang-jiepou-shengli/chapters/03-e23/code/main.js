#!/usr/bin/env node
/**
 * 口腔解剖生理 · 第 3 章 上颌是一层薄壳，下颌是一条管子
 * 课程: departments/08-wuguan/02-kouqiang-jiepou-shengli/chapters/03-e23/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两块骨的零件全部从正文现算：上颌四突、三条支柱、下颌四处薄弱区与四对咀嚼肌，
 * 每一件先找到原词，再核它在正文里的出场次序与归属。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const SLUG = '03-e23';

const PROCESSES = ['额突', '颧突', '腭突', '牙槽突'];
const PILLARS = ['鼻上颌支柱', '颧上颌支柱', '翼上颌支柱'];
const WEAK = ['颏正中联合', '颏孔区', '下颌角', '髁突颈'];
const WEAK_ORDER = ['**颏正中联合。**', '**颏孔区。**', '**下颌角。**', '**髁突颈。**'];
const MUSCLES = ['咬肌', '颞肌', '翼内肌', '翼外肌'];
const MUSCLE_ORDER = ['颧弓下缘与内面', '颞窝', '翼突窝', '翼突外侧板外面'];
const CLAIMS = ['每一突都通着一个腔或间隙', '打在中间', '滑行的是对侧', '肌把髁突定位在关节里'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function ordering(doc, terms) {
  let last = -1;
  for (const t of terms) {
    const i = doc.indexOf(t);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

function audit(doc = readDoc()) {
  const processes = PROCESSES.filter((t) => present(doc, t));
  const pillars = PILLARS.filter((t) => present(doc, t));
  const weak = WEAK.filter((t) => present(doc, t));
  const muscles = MUSCLES.filter((t) => present(doc, t));
  const claims = CLAIMS.filter((t) => present(doc, t));
  const missing = [...PROCESSES, ...PILLARS, ...WEAK, ...MUSCLES, ...CLAIMS].filter((t) => !present(doc, t));
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    processes,
    pillars,
    weak,
    muscles,
    claims,
    missing,
    orderOk: ordering(doc, PROCESSES) && ordering(doc, WEAK_ORDER) && ordering(doc, MUSCLE_ORDER),
  };
}

function main() {
  const a = audit();
  console.log(`口腔解剖生理 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`上颌四突：${a.processes.join('、')}`);
  console.log(`三条支柱：${a.pillars.join('、')}`);
  console.log(`下颌四处薄弱区：${a.weak.join('、')}`);
  console.log(`四对咀嚼肌：${a.muscles.join('、')}`);
  console.log('');
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`关键判断在正文中的原句：${a.claims.length}／${CLAIMS.length}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：零件与次序均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, PROCESSES, PILLARS, WEAK, MUSCLES, CLAIMS, readDoc, sections, audit };
