#!/usr/bin/env node
'use strict';
/**
 * 给每章插一节「教材十二个小节：逐条正文」（幂等）
 *
 * 为什么要有这一节：
 *   教材每章恰好 12 个小节，课程正文按 4–6 个主题合并着讲。合并读得下去，但没被合并
 *   的小节在正文里就没有痕迹——读者看不到缺口，只看到「这章写完了」。
 *   第一次量：132 个单元只有 87 个被正文点到（第 9 章 12 个只提 4 个）。
 *
 * 内容来源：standards/shengli/unit-notes/<章>.json（一节一段，人工写，落结构层与调节链）
 * 一节一段而不是一张一句话的表：一句话只够「索引」，一段才叫「正文」。
 * 每段都守同一条边界——只写类别与关系，不写数值与单位，不作正常与异常判定。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHDIR = path.join(ROOT, 'departments/09-jichu/06-shengli-xue/chapters');
const NOTEDIR = path.join(ROOT, 'standards/shengli/unit-notes');
const BEGIN = '<!-- UNITMAP:BEGIN 本节由 scripts/build_unit_map_section.js 生成，勿手改 -->';
const END = '<!-- UNITMAP:END -->';

/** 读全部 unit-notes，返回 { 章号: [ {sub,title,note}, ... ] } */
function loadNotes() {
  const out = {};
  for (const f of fs.readdirSync(NOTEDIR).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(NOTEDIR, f), 'utf8'));
    out[j.chapter] = j.units;
  }
  return out;
}

function blockFor(chapter, units) {
  if (!units || units.length !== 12) throw new Error(`第 ${chapter} 章注释应为 12 段，实为 ${units ? units.length : 0}`);
  const L = [BEGIN, '', `### ${chapter}-8 教材十二个小节：逐条正文`, '',
    `教材第 ${chapter} 章有 12 个小节，正文按 4–6 个主题合并着讲。这一节把 12 个小节逐一摊开：每节一段，说清这一节在问什么、答案落在哪一层结构、与同章其它小节是什么关系。**没有并进主题的小节，在这里也必须有位置。**`, ''];
  for (const u of units) {
    L.push(`#### ${u.sub} ${u.title}`, '', u.note.trim(), '');
  }
  L.push(END);
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const notes = loadNotes();
  let drift = 0, wrote = 0;
  for (const ch of Object.keys(notes).map(Number).sort((a, b) => a - b)) {
    const slug = fs.readdirSync(CHDIR).find((d) => parseInt(d.slice(0, 2), 10) === ch);
    if (!slug) { console.log(`skip 第${ch}章（无章目录）`); continue; }
    const f = path.join(CHDIR, slug, 'docs/zh.md');
    const txt = fs.readFileSync(f, 'utf8').split(String.fromCharCode(13)).join('');
    const block = blockFor(ch, notes[ch]);
    let next;
    if (txt.includes(BEGIN) && txt.includes(END)) {
      next = txt.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), () => block);
    } else {
      const anchor = '## 代价与边界';
      if (!txt.includes(anchor)) throw new Error(`${slug} 找不到「## 代价与边界」`);
      next = txt.replace(anchor, block + '\n\n' + anchor);
    }
    if (next !== txt) {
      drift++;
      if (check) console.log(`DRIFT ${slug}`);
      else { fs.writeFileSync(f, next, 'utf8'); wrote++; console.log(`map ${slug}（${notes[ch].length} 段）`); }
    }
  }
  if (check) { console.log(drift ? `✗ ${drift} 章与 unit-notes 不一致` : `✓ ${Object.keys(notes).length} 章逐条正文与 unit-notes 一致`); process.exit(drift ? 1 : 0); }
  else if (!wrote) console.log('✓ 无需改动（已一致）');
}

if (require.main === module) main();
module.exports = { blockFor, loadNotes, BEGIN, END };
