#!/usr/bin/env node
'use strict';
/**
 * scripts/render_binglishengli_unit_notes.js [--check]
 *
 * 把 standards/binglishengli/unit-notes/<课程章>.json 渲染进该章 docs 的
 * 「## 教材小节：逐条落位」一节（UNITNOTES:BEGIN/END，幂等）。
 *
 * 与病理学/诊断学是同一层、同一套门。差别只有两处：
 *   1. 底本是**代用底本**《疾病学基础》——章号与课程章号不同位（课程第 3 章 = 底本第 5 章）；
 *   2. 每章的小节数不固定（3 / 6 / 9），且 3 章没有底本（缺稿，不写）。
 * 所以段数与章号都从 scripts/lib_binglishengli_map.js 现取，不在这里硬写。
 */
const fs = require('fs');
const path = require('path');
const M = require('./lib_binglishengli_map');

const ROOT = path.join(__dirname, '..');
const CH = path.join(ROOT, 'departments', '09-jichu', '11-bingli-shengli-xue', 'chapters');
const NOTES = path.join(ROOT, 'standards', 'binglishengli', 'unit-notes');
const BEGIN = '<!-- UNITNOTES:BEGIN 本节由 scripts/render_binglishengli_unit_notes.js 从 standards/binglishengli/unit-notes/ 生成，勿手改 -->';
const END = '<!-- UNITNOTES:END -->';
const HEADING = /^#{2,4}\s*(?:[一二三四五六七八九十]+、)?\s*教材小节[：:]\s*逐条落位/;

function blockFor(ch, units, sources) {
  const L = [BEGIN, '', '## 教材小节：逐条落位', '',
    `代用底本《${M.BOOK_NAME}》第 ${sources.join('、')} 章对应本章的 ${units.length} 个小节。这一节把它们逐一落位：每个小节一段，说清这一节在问什么、答案落在哪一层（环节 / 机制 / 代偿）、与相邻小节是什么关系。**没有被主题叙述点到的小节，在这里也必须有位置。**`, ''];
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
        const idx = lines.findIndex((l) => /^##\s*(?:[一二三四五六七八九十]+、)?\s*(代价与边界|边界|免责)/.test(l.trim()));
        if (idx < 0) throw new Error(`${slug} 既无「教材小节：逐条落位」，也找不到插入点（代价与边界 / 边界 / 免责）`);
        next = [...lines.slice(0, idx), block, '', ...lines.slice(idx)].join('\n');
      }
    }
    if (next !== txt) {
      changed += 1;
      if (check) console.log(`DRIFT ${slug}`);
      else { fs.writeFileSync(p, next, 'utf8'); console.log(`render ${slug}（${j.units.length} 段）`); }
    }
  }
  const writable = M.writableChapters().length;
  if (check) { console.log(changed ? `✗ ${changed} 章与 unit-notes 不一致` : `✓ ${files.length} 章逐条落位与 unit-notes 一致`); process.exit(changed ? 1 : 0); }
  else if (!changed) console.log('✓ 无需改动');
  if (files.length < writable) console.log(`⚠ 仍有 ${writable - files.length} 章没有 unit-notes`);
}

if (require.main === module) main();
module.exports = { blockFor, BEGIN, END };
