#!/usr/bin/env node
/**
 * tests/test_rewrite_blocks.js —— 「源正文层 + 判断层」两段式的门
 *
 * 对象：带 standards/<slug>/rewrite-plan.json 的课。这些课的教材章由
 * `import_textbooks.js` 从底本工作簿生成（正文逐字、文件里写着「请勿手改」），
 * 判断层（N.1–N.5）按 `textbooks/README.md` 的约定追加在文末
 * `<!-- REWRITE:BEGIN/END -->` 块里。
 *
 * 逐项核（任一不过退 1）：
 *   [1] 每章文件存在（NN-第N章-*.md），章号与 plan 一致；
 *   [2] 块在文末（块结束标记之后只剩空白）；
 *   [3] 块内八节齐（N.1–N.5 + 思考题 + 延伸阅读）；
 *   [4] 免责句落在 N.5 之后、思考题之前；
 *   [5] N.2 / N.5 各 ≥200 汉字（不许占位）；
 *   [6] 与 apply_rewrite_block.py 重算一致（幂等，防手改漂移）；
 *   [7] 正文未被改动：块前内容必须仍以 import_textbooks 的两行尾注结尾。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

let pass = 0;
const bad = [];
const ok = (cond, msg) => {
  if (cond) { pass += 1; console.log('  ok - ' + msg); } else { bad.push(msg); console.log('  not ok - ' + msg); }
};

const STD = path.join(ROOT, 'standards');
const all = fs.readdirSync(STD).filter((d) => fs.existsSync(path.join(STD, d, 'rewrite-plan.json')) && !d.startsWith('_probe'));
// 草稿（status=draft，N.2/N.5 未写满）不进门：它们还没注入，缺块是正常的。
// 但「complete 却没块」必须报——那说明注入失败。
const drafts = all.filter((d) => readJson(`standards/${d}/rewrite-plan.json`).status === 'draft');
const courses = all.filter((d) => !drafts.includes(d));

// 教材章由生成器整篇产出、而非 import_textbooks 导入的科目，见 data/textbook-generators.json
// （同一份表 apply_rewrite_block.py 也读）。两类区别：
//   rewriteBlocks=false → 整篇由生成器重算，没有 REWRITE 块，本文件整门跳过；
//   rewriteBlocks=true  → 块照旧，但正文由生成器产出，不带「请勿手改」尾注，
//                         [7] 改由该生成器自己的 --check 保证（见 check 链）。
const GENS = (() => {
  const p = path.join(ROOT, 'data', 'textbook-generators.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).subjects || {} : {};
})();
console.log(`\n源正文层 + 判断层（已注入 ${courses.length} 门；草稿 ${drafts.length} 门不入门）\n`);

const SECTIONS = ['## N.1 概念与出处', '## N.2 为什么可以这样翻译', '## N.3 这个翻译丢掉了什么',
  '## N.4 与相邻学科的接口', '## N.5 争议与本项目立场', '## 思考题', '## 延伸阅读'];

for (const slug of courses) {
  const cfg = readJson(`standards/${slug}/rewrite-plan.json`);
  const subj = cfg.subject || slug;
  const gen = GENS[subj];
  if (gen && gen.rewriteBlocks === false) {
    console.log(`  skip - [${slug}] 整篇由 ${gen.generator} 生成，不注入 REWRITE 块（见 data/textbook-generators.json）`);
    continue;
  }
  const dir = path.join(ROOT, 'textbooks', cfg.dept, subj);
  const errs = [];
  let blocks = 0;

  for (const ch of cfg.chapters) {
    const n = ch.n;
    const file = fs.readdirSync(dir).find((f) => {
      const m = f.match(/^\d+-第(\d+)章-.+\.md$/);
      return m && Number(m[1]) === n;
    });
    if (!file) { errs.push(`第 ${n} 章：找不到章文件`); continue; }
    const t = fs.readFileSync(path.join(dir, file), 'utf8');
    const iB = t.indexOf('<!-- REWRITE:BEGIN -->');
    const iE = t.indexOf('<!-- REWRITE:END -->');
    if (iB < 0 || iE < 0) { errs.push(`第 ${n} 章：没有 REWRITE 块`); continue; }
    blocks += 1;
    if (t.slice(iE + '<!-- REWRITE:END -->'.length).trim() !== '') errs.push(`第 ${n} 章：块之后还有内容（不在文末）`);
    const block = t.slice(iB, iE);
    for (const s of SECTIONS) if (!block.includes(s)) errs.push(`第 ${n} 章：块内缺「${s}」`);
    const i5 = block.indexOf('## N.5');
    const iq = block.indexOf('## 思考题');
    if (i5 < 0 || iq < 0 || !block.slice(i5, iq).includes('不构成诊断或治疗建议')) {
      errs.push(`第 ${n} 章：免责句不在 N.5 与思考题之间`);
    }
    for (const k of ['n2', 'n5']) {
      if (hanzi(ch[k]) < 200) errs.push(`第 ${n} 章：plan.${k} 只有 ${hanzi(ch[k])} 汉字`);
    }
    // [7] 正文尾注仍在：块前内容必须含 import_textbooks 的「请勿手改」提示。
    // 正文由脚本生成器产出的科目（rewriteBlocks=true，如 08-jingui-yaolue）没有这条尾注，
    // 其正文完整性由生成器自己的 --check 保证，这里只核块本身。
    const body = t.slice(0, iB);
    if (!(gen && gen.rewriteBlocks) && !body.includes('请勿手改')) {
      errs.push(`第 ${n} 章：块前正文缺 import_textbooks 尾注（正文被改过？）`);
    }
  }

  ok(!errs.length, `[${slug}] ${blocks}/${cfg.chapters.length} 章：块在文末、八节齐、免责位置正确、N.2/N.5 ≥200 汉字、正文尾注完好${errs.length ? '；' + errs[0] : ''}`);

  const r = spawnSync('python', ['scripts/apply_rewrite_block.py', '--slug', slug, '--check'],
    { cwd: ROOT, encoding: 'utf8' });
  ok(r.status === 0, `[${slug}] 与 apply_rewrite_block.py 重算一致（${((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-1)[0] || 'exit ' + r.status}）`);
}

console.log(`\n# pass ${pass}\n# fail ${bad.length}`);
process.exit(bad.length ? 1 : 0);
