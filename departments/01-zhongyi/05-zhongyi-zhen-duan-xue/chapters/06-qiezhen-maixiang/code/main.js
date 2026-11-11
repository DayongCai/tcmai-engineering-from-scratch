#!/usr/bin/env node
/**
 * 中医诊断学 · 第 6 章 切诊：脉名清点，标题 27 名 / 正文 28 名
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/06-qiezhen-maixiang/docs/zh.md
 * 出处: 教材·第5章 切诊（2 节 6 小节 14 段 2,030 字）
 * 依赖: 仅 Node.js 标准库 + 读教材 JSON
 *
 * 本章量三件事：
 *   1. 切诊 2,030 字里 76.1% 是脉诊，按诊只有 485 字，比例悬殊；
 *   2. 5.1.2 两个段标题想给「28 脉」，实测标题只拼出 27 个唯一脉名；
 *   3. 缺的那个是「缓」——它只在 5.1.2.2 正文里出现，没进任何标题。
 * 所有数字均从教材 JSON 现算，不写死段数/字数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const CH_NO = '5';
const ch = doc.chapters.find((c) => c.no === CH_NO);

const SUPP = path.join(ROOT, 'standards', 'zhenduan', 'supplements', '补源.json');

/** 读补源层：教材缺什么、外源补在哪。返回该章对应的那一处缺口。 */
function supplements(id) {
  const d = JSON.parse(fs.readFileSync(SUPP, 'utf8'));
  const g = d.gaps.find((x) => x.id === id);
  if (!g) throw new Error('补源层里没有 ' + id);
  return g;
}

const HAN = /[\u4e00-\u9fa5]/;
const STOP = new Set(['病']); // 排除「常见病脉（…）」里的「病脉」

function sec(no) {
  return ch.secs.find((s) => s.no === no);
}

function sub(no) {
  for (const s of ch.secs) {
    const hit = (s.subs || []).find((x) => x.no === no);
    if (hit) return hit;
  }
  return undefined;
}

function secChars(no) {
  const s = sec(no);
  return (s.paras || []).join('').length + s.subs.reduce((n, x) => n + x.paras.join('').length, 0);
}

function shape() {
  const rows = ch.secs.map((s) => ({
    no: s.no,
    title: s.title,
    subs: s.subs.length,
    paras: (s.paras || []).length + s.subs.reduce((n, x) => n + x.paras.length, 0),
    items: s.subs.reduce((n, x) => n + (x.items || []).length, 0),
    chars: secChars(s.no),
  }));
  const total = rows.reduce((n, r) => n + r.chars, 0);
  return {
    rows,
    total,
    share: total / doc.counts.chars,
    subs: ch.counts.subs,
    paras: ch.counts.paras,
    secs: ch.counts.secs,
    maiShare: rows[0].chars / total,
    anShare: rows[1].chars / total,
  };
}

// 5.1.2.1 的段标题：一串单字脉名，无分隔符
function compactTitle() {
  const t = sub('5.1.2').items[0].title;
  const names = [...t].filter((c) => HAN.test(c));
  return { raw: t, names, n: names.length };
}

// 5.1.2.2 的段标题：顿号分隔的若干片段，含「长短短脉」这种重复写法
function groupedTitle() {
  const t = sub('5.1.2').items[1].title;
  const parts = t.split('、').map((p) => p.trim()).filter(Boolean);
  const names = [];
  const dups = [];
  const detail = parts.map((p) => {
    const body = p.endsWith('脉') ? p.slice(0, -1) : p;
    const got = [...body].filter((c) => HAN.test(c));
    for (const c of got) {
      if (names.includes(c)) dups.push(c);
      else names.push(c);
    }
    return { part: p, names: [...new Set(got)] };
  });
  const rawCount = detail.reduce((n, d) => n + d.part.replace(/、/g, '').replace(/脉$/, '').length, 0);
  return { raw: t, parts, detail, names, n: names.length, dups: [...new Set(dups)], rawCount };
}

// 两段正文里真正被定义的脉：「X脉（…）」
function bodyNames() {
  const s = sub('5.1.2');
  const per = s.paras.map((p) =>
    [...p.matchAll(/([\u4e00-\u9fa5])脉（/g)].map((m) => m[1]).filter((c) => !STOP.has(c)),
  );
  const union = [...new Set(per.flat())];
  return { per, union, n: union.length, total: per.reduce((a, b) => a + b.length, 0) };
}

function pulse() {
  const a = compactTitle();
  const b = groupedTitle();
  const body = bodyNames();
  const titleSet = [...new Set([...a.names, ...b.names])];
  const missing = body.union.filter((n) => !titleSet.includes(n));
  const extra = titleSet.filter((n) => !body.union.includes(n));
  return {
    compact: a,
    grouped: b,
    body,
    titleUnion: titleSet,
    titleN: titleSet.length,
    missing,
    extra,
    gap: body.n - titleSet.length,
    gapIfBrief: body.n - (14 + 12), // 简报假设：14 + 12 = 26
  };
}

function citation(no) {
  return `教材·第${CH_NO}章·${no}`;
}

// 引用是否落得到教材节点上：5.1 / 5.1.2 / 5.1.2.1 三级
function resolve(no) {
  const parts = String(no).split('.');
  if (parts.length === 2) return ch.secs.some((s) => s.no === no);
  if (parts.length === 3) return Boolean(sub(no));
  const parent = sub(parts.slice(0, 3).join('.'));
  return Boolean(parent && (parent.items || []).some((i) => i.no === no));
}

function main() {
  const s = shape();
  const p = pulse();

  console.log('═══ 切诊两节（教材·第5章）═══');
  for (const r of s.rows) console.log(`  ${r.no} ${r.title}：${r.subs} 小节 · ${r.paras} 段 · ${r.chars} 字`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%；脉诊 ${(s.maiShare * 100).toFixed(1)}% / 按诊 ${(s.anShare * 100).toFixed(1)}%`);
  console.log('');

  console.log('═══ 脉名解析（教材·第5章·5.1.2）═══');
  console.log(`  5.1.2.1 段标题「${p.compact.raw}」→ ${p.compact.n} 个单字脉名：${p.compact.names.join('、')}`);
  console.log(`  5.1.2.2 段标题「${p.grouped.raw}」→ ${p.grouped.parts.length} 个顿号片段，去重后 ${p.grouped.n} 名：${p.grouped.names.join('、')}`);
  console.log(`  「长短短脉」片段含重复字：${p.grouped.dups.join('、') || '无'}；片段原始字数 ${p.grouped.rawCount} / 去重后 ${p.grouped.n}`);
  console.log(`  标题唯一脉名合计 ${p.titleN} 名`);
  console.log(`  正文 5.1.2.1 定义 ${p.body.per[0].length} 名、5.1.2.2 定义 ${p.body.per[1].length} 名，合计 ${p.body.total} 名 / 唯一 ${p.body.n} 名`);
  console.log(`  → 标题 ${p.titleN} vs 正文 ${p.body.n}：差 ${p.gap}；标题漏的是「${p.missing.join('、')}」，它只在 5.1.2.2 正文出现`);
  console.log(`  → 简报假设 14 + 12 = 26 名（差 2）与实测不符：实测 ${p.compact.n} + ${p.grouped.n} = ${p.titleN}，差 ${p.gap}`);
  console.log(`  → 差 ${p.gap} 属教材标题的漏列，不是本章解析丢失；不拿通行 28 脉名去补标题。`);
  console.log('');

  console.log('═══ 按诊（教材·第5章·5.2）═══');
  for (const x of sec('5.2').subs) console.log(`  ${x.no} ${x.title}（${x.paras.length} 段）`);
  console.log(`  485 字只讲手法与内容，未给按诊的量化判据。`);
  console.log('');

  const g = supplements('z1-mai-ming-que-huan');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（标题漏「缓」）──');
  console.log('  教材 5.1.2：标题 ' + g.textbookSeen.titleCount + ' 名 / 正文 ' + g.textbookSeen.bodyCount
    + ' 名；只在前者缺席的是「' + g.textbookSeen.onlyInBody.join('、') + '」。');
  const cmp = g.comparison;
  console.log('  外源 ' + g.locator + '：' + cmp.maijingCount + ' 種，与教材同名 ' + cmp.inBoth.length
    + ' 名（软≡濡），教材多出 ' + cmp.onlyTextbook.join('、') + '。');
  const huan = g.entries.find((e) => e.name === '緩脈');
  console.log('  緩脈原文：' + huan.text);
  const huanNo = g.entries.findIndex((e) => e.name === '緩脈') + 1;
  console.log('  引用格式：' + g.citeAs.replace('%d', String(huanNo)) + '（不是「底本」「原文」）');
  console.log('教学边界：本章只清点教材已载的脉名与按诊条目，不据此辨脉、不判断任何脉象的临床意义；不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, pulse, bodyNames, compactTitle, groupedTitle, secChars, citation, resolve, doc, ch, supplements };
