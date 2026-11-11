#!/usr/bin/env node
'use strict';
/**
 * scripts/render_zhenduan_unit_notes.js [--check]
 *
 * 把 standards/zhenduan/unit-notes/<课程章>.json 渲染成该章 docs 里的
 * 「## 教材小节：逐条落位」一节（带 UNITNOTES:BEGIN/END 标记，幂等）。
 *
 * 与病理学同一层、同一套门，差别只有一处：诊断学的「单元」就是底本小节，
 * 而课程 12 章与底本 14 章不是一一对应，所以映射写在 sources 字段里，
 * 每章的段数与段号各不相同（8 / 7 / 4 / 5 / 10 / 6 / 10 / 11 / 10 / 14 / 5 / 9）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CH = path.join(ROOT, 'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue', 'chapters');
const NOTES = path.join(ROOT, 'standards', 'zhenduan', 'unit-notes');
const BEGIN = '<!-- UNITNOTES:BEGIN 本节由 scripts/render_zhenduan_unit_notes.js 从 standards/zhenduan/unit-notes/ 生成，勿手改 -->';
const END = '<!-- UNITNOTES:END -->';
const HEADING = /^#{2,4}\s*(?:[一二三四五六七八九十]+、)?\s*教材小节[：:]\s*逐条落位/;

function blockFor(ch, units, sources) {
  const L = [BEGIN, '', '## 教材小节：逐条落位', '',
    `教材第 ${sources.join('、')} 章共 ${units.length} 个小节。这一节把它们逐一落位：每个小节一段，说清这一节在问什么、答案落在哪一层、与相邻小节是什么关系。**没有被主题叙述点到的小节，在这里也必须有位置。**`, ''];
  for (const u of units) L.push(`#### ${u.sub} ${u.title}`, '', String(u.note).trim(), '');
  L.push(END);
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const files = fs.existsSync(NOTES) ? fs.readdirSync(NOTES).filter((f) => /^\d\d\.json$/.test(f)).sort() : [];
  let changed = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(NOTES, f), 'utf8'));
    const slug = fs.readdirSync(CH).find((d) => parseInt(d.slice(0, 2), 10) === j.chapter);
    if (!slug) { console.log(`skip 第${j.chapter}章（无章目录）`); continue; }
    const p = path.join(CH, slug, 'docs', 'zh.md');
    const txt = fs.readFileSync(p, 'utf8').split(String.fromCharCode(13)).join('');
    const block = blockFor(j.chapter, j.units, j.sources);
    let next;
    if (txt.includes(BEGIN) && txt.includes(END)) {
      next = txt.replace(new RegExp(`${BEGIN.replace(/[[\]]/g, '.')}[\\s\\S]*?${END}`), () => block);
    } else {
      const lines = txt.split('\n');
      const start = lines.findIndex((l) => HEADING.test(l.trim()));
      if (start >= 0) {
        let end = lines.length;
        for (let i = start + 1; i < lines.length; i++) if (/^##\s/.test(lines[i])) { end = i; break; }
        next = [...lines.slice(0, start), block, '', ...lines.slice(end)].join('\n');
      } else {
        // 各章末节标题不统一（「## 五、代价与边界」「## 代价与边界」「## 边界」都出现过），
        // 所以按「代价与边界 / 边界 / 免责」这一组标题找插入点，插在它前面。
        const lines0 = txt.split('\n');
        const idx = lines0.findIndex((l) => /^##\s*(?:[一二三四五六七八九十]+、)?\s*(代价与边界|边界|免责)/.test(l.trim()));
        if (idx < 0) throw new Error(`${slug} 既无「教材小节：逐条落位」，也找不到插入点（代价与边界 / 边界 / 免责）`);
        next = [...lines0.slice(0, idx), block, '', ...lines0.slice(idx)].join('\n');
      }
    }
    if (next !== txt) {
      changed += 1;
      if (check) console.log(`DRIFT ${slug}`);
      else { fs.writeFileSync(p, next, 'utf8'); console.log(`render ${slug}（${j.units.length} 段）`); }
    }
  }
  if (check) { console.log(changed ? `✗ ${changed} 章与 unit-notes 不一致` : `✓ ${files.length} 章逐条落位与 unit-notes 一致`); process.exit(changed ? 1 : 0); }
  else if (!changed) console.log('✓ 无需改动');
  const missing = 12 - files.length;
  if (missing > 0) console.log(`⚠ 仍有 ${missing} 章没有 unit-notes`);
}

if (require.main === module) main();
module.exports = { blockFor, BEGIN, END };
