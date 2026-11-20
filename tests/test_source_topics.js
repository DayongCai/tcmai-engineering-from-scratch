#!/usr/bin/env node
/**
 * tests/test_source_topics.js —— 「外源专题」三道课的引用门（护理研究 / 口腔修复 / 口腔正畸）
 *
 * 这三门的状态相同：**有外源条文、无教材稿（0 章）**。药事那门把专题放在教材 `附录A`，
 * 这三门没有章可依附，专题落在 `standards/<slug>/专题-*.md`。位置不同，门是同一套：
 *
 *   ① 登记自洽：counts.verified == clauses 且 unverified == 0（没通过逐字校勘的不许被引用）
 *   ② 引用可核：专题里每个「外源·<shortTitle> 第N条」都能在登记里找到同来源同条号、且 verified
 *   ③ 摘句逐字：`> 「…」（外源·…）` 的引文（`……` 按段切）归一后必须是该条原文的子串
 *   ④ 不许中译当引文：原文无汉字的条（英文 PRISMA / WHO），引文不得含汉字
 */
'use strict';
const fs = require('fs');
const path = require('path');

// 教材章：自动发现各课目录下所有章文件 —— 章的引用也要过同一道门
// （教材比专题更容易「凭印象引条号」，所以不手写清单，新增章自动纳入）
const BOOKS = [
  { dir: 'standards/kouqiang-xiufu', kb: 'textbooks/08-wuguan/12-kouqiang-xiufu-xue', label: '口腔修复学' },
  { dir: 'standards/kouqiang-zhengji', kb: 'textbooks/08-wuguan/13-kouqiang-zhengji-xue', label: '口腔正畸学' },
  { dir: 'standards/huli-yanjiu-zhengxun', kb: 'textbooks/05-huli/15-huli-yanjiu-zhengxun', label: '护理研究循证' },
  // 跨库借用：本课自己的外源只有 4 份 WHO 指南，注册与药物警戒条文在药事库（已单独过 test_yaoshi_guanli_supplement）
  { dir: 'standards/zhongyao-xinyao', kb: 'textbooks/02-zhongyao/15-zhongyao-xinyao-yanfa', label: '中药新药研发',
    borrow: ['standards/yaoshi-guanli'] },
  { dir: 'standards/zhongyao-du-li', kb: 'textbooks/02-zhongyao/21-zhongyao-du-li-xue', label: '中药毒理学' },
  { dir: 'standards/jiankang-pinggu', kb: 'textbooks/05-huli/03-jiankang-pinggu', label: '健康评估' },
];
const bookChapters = [];
for (const b of BOOKS) {
  if (!fs.existsSync(b.kb)) continue;
  for (const f of fs.readdirSync(b.kb).filter((x) => /^\d+-第\d+章.*\.md$/.test(x))
    .sort((a, c) => parseInt(a, 10) - parseInt(c, 10))) {
    bookChapters.push({
      dir: b.dir,
      borrow: b.borrow || [],
      doc: `../../${b.kb}/${f}`,
      name: b.label + '·' + f.replace(/^\d+-/, '').replace(/\.md$/, ''),
      kind: 'chapter',
    });
  }
}

const T = [
  { dir: 'standards/huli-yanjiu-zhengxun', doc: '专题-循证报告核查.md', name: '护理研究循证', kind: 'topic' },
  { dir: 'standards/kouqiang-xiufu', doc: '专题-修复操作流程.md', name: '口腔修复学', kind: 'topic' },
  { dir: 'standards/kouqiang-zhengji', doc: '专题-正畸操作路径.md', name: '口腔正畸学', kind: 'topic' },
  ...bookChapters,
];

const JUNK = /- ?\d{1,3} ?-|国家市场监督管理总局发布|国家市场监督管理总局规章|卫生部发布/g;
const norm = (s) => String(s).replace(/\s+/g, '');
const clean = (s) => String(s).replace(JUNK, '');
const CJK = /[\u4e00-\u9fa5]/;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok - ' + m); } else { fail++; console.log('not ok - ' + m); } };

for (const t of T) {
  const regPath = path.join(t.dir, '补源登记.json');
  const srcPath = path.join(t.dir, '外源条文.json');
  const docPath = path.join(t.dir, t.doc);
  for (const p of [regPath, srcPath, docPath]) {
    if (!fs.existsSync(p)) { ok(false, `${t.name}：缺 ${p}`); }
  }
  if (![regPath, srcPath, docPath].every((p) => fs.existsSync(p))) continue;

  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const doc = fs.readFileSync(docPath, 'utf8');

  // ① 登记自洽
  const n = reg.clauses.length;
  const bad = reg.clauses.filter((c) => !c.verified);
  ok(reg.counts.verified === n && reg.counts.unverified === 0 && bad.length === 0,
    `${t.name}：登记自洽（${reg.counts.verified}/${n} 逐字可查，未通过 ${reg.counts.unverified}）`);

  // (source, clause) → 原文；verified 键集（含跨库借用的条库）
  const byKey = new Map();
  const shortOf = new Map();
  const verifiedKeys = new Set();
  for (const [k, v] of Object.entries(src.sources)) {
    shortOf.set(k, v.shortTitle || v.title || k);
  }
  for (const c of src.clauses) byKey.set(`${c.source}::${c.clause}`, c.原文 || '');
  for (const c of reg.clauses) if (c.verified) verifiedKeys.add(`${c.source}::${c.clause}`);

  // 跨库借用：本课未入库的条（如注册分类、药物警戒）从别的条库借；借来的一样要过「登记自洽」
  for (const bd of (t.borrow || [])) {
    const bsrcPath = path.join(bd, '外源条文.json');
    const bregPath = path.join(bd, '补源登记.json');
    if (![bsrcPath, bregPath].every((x) => fs.existsSync(x))) { ok(false, `${t.name}：借条库缺 ${bd}`); continue; }
    const bs = JSON.parse(fs.readFileSync(bsrcPath, 'utf8'));
    const br = JSON.parse(fs.readFileSync(bregPath, 'utf8'));
    const bbad = br.clauses.filter((c) => !c.verified);
    ok(br.counts.verified === br.clauses.length && br.counts.unverified === 0 && bbad.length === 0,
      `${t.name}：借条库 ${bd} 登记自洽（${br.counts.verified}/${br.clauses.length}）`);
    for (const [k, v] of Object.entries(bs.sources)) shortOf.set(k, v.shortTitle || v.title || k);
    for (const c of bs.clauses) byKey.set(`${c.source}::${c.clause}`, c.原文 || '');
    for (const c of br.clauses) {
      const k = `${c.source}::${c.clause}`;
      // 登记里的条可能没有「原文」字段 —— 不许用它把外源条文.json 的原文覆盖成空串
      if (!byKey.has(k)) byKey.set(k, c.原文 || '');
      if (c.verified) verifiedKeys.add(k);
    }
  }

  // ② 引用可核 —— 条号两种写法：`第N条`（法规/指南）与 `〔文本锚点〕`（按小标题切条的条库）
  const cites = [...doc.matchAll(/外源·([^第\n，。；〔〕]{4,60}?)\s*(?:(第[\d.一二三四五六七八九十百]+条)|〔([^〔〕\n]{2,40})〕)/g)];
  const unresolved = [];
  for (const m of cites) {
    const title = m[1].trim();
    const clause = (m[2] || m[3] || '').trim();
    const hit = [...shortOf.entries()].find(([, s]) => s === title || s.includes(title) || title.includes(s));
    if (!hit) { unresolved.push(`未知来源「${title}」`); continue; }
    const key = `${hit[0]}::${clause}`;
    if (!byKey.has(key)) unresolved.push(`${title} ${clause} 不在登记`);
    else if (!verifiedKeys.has(key)) unresolved.push(`${title} ${clause} 未通过校勘`);
  }
  ok(unresolved.length === 0,
    `${t.name}：${cites.length} 处「外源·… 第N条」全部可核${unresolved.length ? ' —— ' + unresolved.slice(0, 2).join('；') : ''}`);

  // ③④ 摘句逐字 + 不许中译当引文
  const quotes = [...doc.matchAll(/^>\s*「([^「]*?)」\s*（(外源·([^第\n）〔〕]+?)\s*(?:(第[\d.一二三四五六七八九十百]+条)|〔([^〔〕\n]{2,40})〕))）/gm)];
  const qbad = [];
  for (const m of quotes) {
    const quote = m[1], title = m[3].trim(), clause = (m[4] || m[5] || '').trim();
    const hit = [...shortOf.entries()].find(([, s]) => s === title || s.includes(title) || title.includes(s));
    if (!hit) { qbad.push(`引文来源「${title}」未知`); continue; }
    const orig = byKey.get(`${hit[0]}::${clause}`) || '';
    if (CJK.test(quote) && !CJK.test(orig)) { qbad.push(`${title} ${clause}：英文原文却用中译当引文`); continue; }
    const parts = quote.split('……').map(norm).filter(Boolean);
    const miss = parts.filter((p) => !norm(clean(orig)).includes(p));
    if (miss.length) qbad.push(`${title} ${clause} 引文未逐字命中：${miss[0].slice(0, 24)}`);
  }
  ok(qbad.length === 0,
    `${t.name}：${quotes.length} 段摘句逐字命中${qbad.length ? ' —— ' + qbad.slice(0, 2).join('；') : ''}`);

  // 版本与免责：专题必须声明不与底本混统计
  const declOk = t.kind === 'chapter'
    ? (/撰写层|源正文层/.test(doc) && /不构成/.test(doc))
    : (/不计入/.test(doc) && /不替代|不构成/.test(doc));
  ok(declOk, t.kind === 'chapter'
    ? (t.name + '：章首声明了层次，且有免责')
    : (t.name + '：专题有「不与底本混统计」与免责声明'));
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
process.exit(fail ? 1 : 0);
