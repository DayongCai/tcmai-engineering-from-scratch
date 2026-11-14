#!/usr/bin/env node
/**
 * scripts/zhenghou_query.js —— 「疾病证候单元」检索器（辞典的数据层入口）
 *
 *   node scripts/zhenghou_query.js M01-L01-Z01              按全码取一条证 + 全部候
 *   node scripts/zhenghou_query.js 肺卫风寒                 按证名 / 候名模糊查
 *   node scripts/zhenghou_query.js --wei 肺卫 --tai 失宣     按张量坐标取候选
 *   node scripts/zhenghou_query.js --men M06 --top          看某一门的结构摘要
 *   node scripts/zhenghou_query.js --stat                   全书计数（与结构.json 对账）
 *
 * 为什么单独一个脚本而不是塞进 build_zhenghou_cidian.py：
 *   生成器负责「写」，检索器负责「读」。合成一个脚本的后果是 —— 每次查询都会
 *   重新解析目录、重算张量，且查询逻辑会被生成逻辑的改动牵连。分开后，
 *   这个文件就是 APP 侧要复制的那个文件：只读 JSON，无第三方依赖。
 *
 * 排序规则（模糊查）：全码命中 > 证名完全相同 > 证名包含 > 候名包含。
 * 同分者按候数降序 —— 候多的证通常是这本书里展开得更细的那一条。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');

function load() {
  const struct = JSON.parse(fs.readFileSync(path.join(STD, '结构.json'), 'utf8'));
  const tensor = JSON.parse(fs.readFileSync(path.join(STD, '张量.json'), 'utf8'));
  return { struct, tensor };
}

function eachZheng(struct, fn) {
  for (const m of struct.men) for (const l of m.lei) for (const z of l.zhengList) fn(z, l, m);
}

function flat(struct) {
  const out = [];
  eachZheng(struct, (z, l, m) => out.push({ z, l, m }));
  return out;
}

function show(rec) {
  const { z, l, m } = rec;
  console.log(`\n=== ${z.full}  ${z.zh}（${z.houList.length} 候）===`);
  console.log(`门 ${m.code} ${m.zh}门 · 类 ${l.code} ${l.zh}证类 · 书内原码 ${z.code} · 目录页 ${z.page}`);
  console.log(`坐标：位＝${z.wei}（${(z.weiParts || []).join('·')}）｜性＝${l.zh}`);
  console.log('候：');
  for (const h of z.houList) {
    console.log(`  ${h.full}  ${h.zh}   位=${h.wei} 态=${h.tai}`);
  }
}

function search(struct, q) {
  const hits = [];
  for (const rec of flat(struct)) {
    const { z, l } = rec;
    if (z.full === q || z.code === q) { hits.push({ rec, score: 1000 }); continue; }
    if (z.zh === q) { hits.push({ rec, score: 900 }); continue; }
    if (z.zh.includes(q)) { hits.push({ rec, score: 700 }); continue; }
    if ((z.wei || '').includes(q) && q.length >= 2) { hits.push({ rec, score: 500 }); continue; }
    const h = z.houList.find((x) => x.zh === q || x.zh.includes(q));
    if (h) hits.push({ rec, score: 400, hou: h });
    else if (l.zh === q) hits.push({ rec, score: 300 });
  }
  hits.sort((a, b) => b.score - a.score || b.rec.z.houList.length - a.rec.z.houList.length);
  return hits;
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    console.log('用法：node scripts/zhenghou_query.js <全码|证名|候名> | --wei <位> --tai <态> | --men <门码> | --stat');
    process.exit(1);
  }
  const { struct, tensor } = load();

  if (argv.includes('--stat')) {
    const c = struct.counts;
    console.log('门 %d · 类 %d · 证 %d（码 %d）· 候 %d（码 %d / 候号 %d）· 张量非零格 %d',
      c.men, c.lei, c.zhengInstances, c.zhengCodes, c.houInstances, c.houCodes, c.houNumbers, c.tensorCells);
    console.log('校对差异 %d 条；见 standards/zhenghou-cidian/缺口登记.json', (struct['校对'] || {})['差异'].length);
    console.log('（本输出为数据统计，不含诊疗结论。）');
    return;
  }

  const menIdx = argv.indexOf('--men');
  if (menIdx >= 0) {
    const code = argv[menIdx + 1];
    const m = struct.men.find((x) => x.code === code || x.zh === code);
    if (!m) { console.log('没有这个门：' + code); process.exit(2); }
    const hou = m.lei.reduce((a, l) => a + l.zhengList.reduce((b, z) => b + z.houList.length, 0), 0);
    console.log(`${m.code} ${m.zh}门（${m.book}）· ${m.lei.length} 类 · ` +
      `${m.lei.reduce((a, l) => a + l.zhengList.length, 0)} 证 · ${hou} 候`);
    for (const l of m.lei) {
      console.log(`  ${l.code} ${l.zh}证类 · ${l.zhengList.length} 证 · ` +
        `${l.zhengList.reduce((a, z) => a + z.houList.length, 0)} 候`);
      for (const z of l.zhengList) console.log(`      ${z.full} ${z.zh}（${z.houList.length} 候）`);
    }
    return;
  }

  const weiIdx = argv.indexOf('--wei');
  const taiIdx = argv.indexOf('--tai');
  if (weiIdx >= 0 || taiIdx >= 0) {
    const w = weiIdx >= 0 ? argv[weiIdx + 1] : null;
    const t = taiIdx >= 0 ? argv[taiIdx + 1] : null;
    const out = [];
    for (const rec of flat(struct)) {
      const hs = rec.z.houList.filter((h) => (!w || h.wei === w) && (!t || h.tai === t));
      if (hs.length) out.push({ rec, hs });
    }
    out.sort((a, b) => b.hs.length - a.hs.length);
    if (!out.length) {
      console.log('没有命中：位=%s 态=%s（词表见 textbooks/.../附录A-位性态总表.md）', w, t);
      process.exit(2);
    }
    console.log(`位=${w || '*'} 态=${t || '*'} → ${out.length} 条证候，按命中候数降序：`);
    for (const { rec, hs } of out.slice(0, 20)) {
      console.log(`  ${rec.z.full} ${rec.z.zh}  命中 ${hs.length} 候：${hs.slice(0, 4).map((h) => h.zh).join('、')}`);
    }
    if (out.length > 20) console.log(`  … 另 ${out.length - 20} 条`);
    console.log('（候选是检索结果，不是诊断。张量切片见 standards/zhenghou-cidian/张量.json）');
    return;
  }

  const q = argv[0];
  const hits = search(struct, q);
  if (!hits.length) {
    console.log('没有命中：' + q);
    console.log('试试全码（M01-L01-Z01）、证名（肺卫风寒证）、候名（卫气失宣候），或 --stat 看规模。');
    process.exit(2);
  }
  const exact = hits[0];
  if (exact.score >= 900) {
    show(exact.rec);
    if (exact.hou) console.log(`\n（命中候：${exact.hou.full} ${exact.hou.zh}）`);
    return;
  }
  console.log(`「${q}」候选 ${hits.length} 条（按匹配强度，再按候数）：`);
  for (const h of hits.slice(0, 15)) {
    console.log(`  [${h.score}] ${h.rec.z.full} ${h.rec.z.zh} · ${h.rec.l.code}${h.rec.l.zh} · ${h.rec.z.houList.length} 候`);
  }
  console.log('（取第一条详情：node scripts/zhenghou_query.js <全码>）');
  void tensor;
}

if (require.main === module) main();

module.exports = { load, flat, search };
