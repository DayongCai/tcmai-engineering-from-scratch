#!/usr/bin/env node
'use strict';
/**
 * scripts/render_bingli_unit_notes.js [--check]
 *
 * 把 standards/bingli/unit-notes/<章>.json 渲染成每章 docs 里的一节：
 *   <!-- UNITNOTES:BEGIN … -->  ## 十二个小节：逐条落位  #### N.M.K 标题 + 一段  <!-- UNITNOTES:END -->
 *
 * 为什么用「生成」而不是让人手写进 docs：
 *   生理学的 unit-notes 是同一套结构（132 段、每段 ≥120 字、docs 与源逐字一致）。
 *   病理学要「粒度相同」，就必须由同一份源生成、被同一类门核；否则 21 章各写各的，
 *   长度和口径都会散，而散掉之后无法用数字说清「哪一章薄」。
 *
 * 幂等：有标记就替换标记之间；没有标记但已有「十二个小节」一节，就整节替换（05/06/07 是手写的，
 * 内容已抽进 unit-notes，渲染结果与手写一致，不会丢内容）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CH = path.join(ROOT, 'departments', '09-jichu', '10-bingli-xue', 'chapters');
const NOTES = path.join(ROOT, 'standards', 'bingli', 'unit-notes');
const BEGIN = '<!-- UNITNOTES:BEGIN 本节由 scripts/render_bingli_unit_notes.js 从 standards/bingli/unit-notes/ 生成，勿手改 -->';
const END = '<!-- UNITNOTES:END -->';
const HEADING = /^#{2,4}\s*(?:[一二三四五六七八九十]+、)?\s*十二个小节/;

function blockFor(ch, units) {
  if (units.length !== 12) throw new Error(`第 ${ch} 章 unit-notes 应为 12 段，实为 ${units.length}`);
  const L = [BEGIN, '', '## 十二个小节：逐条落位', '',
    `教材第 ${ch} 章 4 节 × 3 小节 = 12 个知识单元。这一节把它们逐一落位：每个单元一段，说清这一节在问什么、答案落在哪一层、与同章其它单元是什么关系。**没有被主题叙述点到的单元，在这里也必须有位置。**`, ''];
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
    const ch = j.chapter;
    const slug = fs.readdirSync(CH).find((d) => parseInt(d.slice(0, 2), 10) === ch);
    if (!slug) { console.log(`skip 第${ch}章（无章目录）`); continue; }
    const p = path.join(CH, slug, 'docs', 'zh.md');
    const raw = fs.readFileSync(p, 'utf8');
    const txt = raw.split(String.fromCharCode(13)).join('');
    const block = blockFor(ch, j.units);
    let next;
    if (txt.includes(BEGIN) && txt.includes(END)) {
      next = txt.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), () => block);
    } else {
      const lines = txt.split('\n');
      const start = lines.findIndex((l) => HEADING.test(l.trim()));
      if (start >= 0) {
        let end = lines.length;
        for (let i = start + 1; i < lines.length; i++) if (/^##\s/.test(lines[i])) { end = i; break; }
        next = [...lines.slice(0, start), block, '', ...lines.slice(end)].join('\n');
      } else {
        const anchor = txt.indexOf('## 代价与边界');
        if (anchor < 0) throw new Error(`${slug} 既无「十二个小节」一节，也无「## 代价与边界」`);
        next = txt.slice(0, anchor) + block + '\n\n' + txt.slice(anchor);
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
  const missing = 21 - files.length;
  if (missing > 0) console.log(`⚠ 仍有 ${missing} 章没有 unit-notes（逐条落位未覆盖）`);
}

if (require.main === module) main();
module.exports = { blockFor, BEGIN, END };
