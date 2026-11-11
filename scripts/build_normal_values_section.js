#!/usr/bin/env node
'use strict';
/**
 * 把「本章涉及的中国成人参考值」注入每章 docs/zh.md（幂等，重跑只替换标记区间）
 *
 * 为什么值只出现在这一块：
 *   教材《生理学》底本 valueLike = 0（一个字不给值），所以课程正文里凡出现「数字＋单位」
 *   都必须是外部权威来源。把它收进一块机器生成的表格，正好让「哪些数字有出处」一眼可查，
 *   也让门只扫正文、不扫生成块——否则每次生成都要跟门打架。
 *
 * 用法：
 *   node scripts/build_normal_values_section.js            写入全部章
 *   node scripts/build_normal_values_section.js --check    只比对（漂移返回 1）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB = path.join(ROOT, 'standards/shengli/normal-values/normal-values.json');
const CHDIR = path.join(ROOT, 'departments/09-jichu/06-shengli-xue/chapters');

const BEGIN = '<!-- NV:BEGIN 本节由 scripts/build_normal_values_section.js 生成，勿手改 -->';
const END = '<!-- NV:END -->';

const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
const S = db.sources;

const shortSrc = (id) => {
  const s = S[id];
  return `${s.number}·${s.locator}`;
};

function blockFor(ch) {
  const rows = db.entries.filter((e) => e.chapters.includes(ch));
  const pend = db.pending.filter((p) => p.chapters.includes(ch));
  const L = [BEGIN, '', '## 附：本章涉及的中国成人参考值（数据层）', ''];
  if (!rows.length) {
    L.push('本章没有可挂靠的中国成人参考值条目——不是漏了，是这一章讲的是类别与关系，不吃数值。');
  } else {
    L.push(`> 值不来自教材（教材原文一个字不给值），全部取自 \`standards/shengli/normal-values/normal-values.json\`，每条可回查本机留档 PDF 与表号。正文里引用写 \`[[nv:<id>]]\`。`);
    L.push('');
    L.push('| id | 项目 | 参考值 | 单位 | 分组 | 来源 |');
    L.push('|---|---|---|---|---|---|');
    for (const e of rows) {
      L.push(`| \`${e.id}\` | ${e.item} | ${e.value} | ${e.unit} | ${e.group} | ${shortSrc(e.source)} |`);
    }
  }
  if (pend.length) {
    L.push('');
    L.push('**本章仍缺的（未取到可核验来源，暂不收入）**：' + pend.map((p) => `${p.item}（需 ${p.need}）`).join('；'));
  }
  L.push('', END);
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const dirs = fs.readdirSync(CHDIR).filter((d) => /^\d\d-/.test(d)).sort();
  let drift = 0;
  for (const d of dirs) {
    const ch = parseInt(d.slice(0, 2), 10);
    const f = path.join(CHDIR, d, 'docs/zh.md');
    if (!fs.existsSync(f)) { console.log(`skip ${d}（无 docs/zh.md）`); continue; }
    let txt = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    const block = blockFor(ch);
    let next;
    if (txt.includes(BEGIN) && txt.includes(END)) {
      next = txt.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), () => block);
    } else {
      next = txt.trimEnd() + '\n\n' + block + '\n';
    }
    if (next !== txt) {
      drift++;
      if (check) console.log(`DRIFT ${d}`);
      else { fs.writeFileSync(f, next, 'utf8'); console.log(`write ${d}（${db.entries.filter((e) => e.chapters.includes(ch)).length} 条）`); }
    }
  }
  if (check) {
    console.log(drift ? `✗ ${drift} 章与数据层不一致` : '✓ 11 章参考值块与数据层一致');
    process.exit(drift ? 1 : 0);
  }
}

if (require.main === module) main();
module.exports = { blockFor, BEGIN, END };
