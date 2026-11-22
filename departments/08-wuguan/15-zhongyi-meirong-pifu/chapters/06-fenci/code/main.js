#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 6 章 粉刺：会不会留疤，多半取决于谁在挤它
 * 正文: chapters/06-fenci/docs/zh.md
 * 做法: 从正文解析五种皮损、三档证型对应与外治三样，按形态深度排序，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '粉刺：会不会留疤，多半取决于谁在挤它';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

function leads(body) {
  return [...body.matchAll(/^\*\*([^*]+)\*\*/gm)]
    .map((m) => m[1].replace(/^其[一二三四五六七八九][，、]\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

/** 「粉刺的皮损有五种：……」一句里列举的形态 */
function lesionForms(text) {
  const line = (text.match(/粉刺的皮损有[^。]*。/) || [''])[0];
  return line
    .replace(/^[^：]*：/, '')
    .replace(/（[^）]*）/g, '')
    .replace(/。$/, '')
    .split('、')
    .map((s) => s.trim())
    .filter(Boolean);
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const find = (kw) => secs.find((s) => s.title.includes(kw));
  const forms = lesionForms(text);
  const depthSec = find('形态就是病的深浅');
  const tiers = depthSec ? leads(depthSec.body).slice(-3) : [];
  const outSec = find('外治：三样东西');
  const outside = outSec ? leads(outSec.body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    forms,
    tiers,
    outside,
    // 判据：形态对应解剖深度，浅的留色沉，深的留疤
    depthRule: text.includes('解剖深度') && text.includes('浅的留色沉，深的留疤'),
    squeeze: count(text, '挤压'),
    scar: count(text, '瘢痕'),
    hormone: count(text, '激素')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 6 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`皮损形态 ${a.forms.length} 种（由浅到深）：${a.forms.join(' → ')}`);
  console.log(`三档证型对应：${a.tiers.join('、')}`);
  console.log(`外治 ${a.outside.length} 样：${a.outside.join(' / ')}`);
  console.log(`形态即深度：${a.depthRule ? '成立' : '不成立'}`);
  console.log('');
  console.log(`关键词频次：挤压 ${a.squeeze} · 瘢痕 ${a.scar} · 激素 ${a.hormone}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，有创操作与系统用药以执业规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, leads, count, lesionForms, analyze };
