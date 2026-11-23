#!/usr/bin/env node
/**
 * 中医体质学 · 各章共用的证候库读数
 * 数据: standards/zhenghou/证候库.json、standards/tizhi/体质库.json、standards/tizhi/源-证候映射.json
 * 依赖: 仅 Node.js 标准库
 *
 * 证候按病性族归入九质；每一质统计证候数、去重病名数、跨两科证候数与科属分布。
 * 各章只在本模块的结果上做自己的算术，不重复读文件，也不手打任何总数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou', '证候库.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('找不到 standards/zhenghou/证候库.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function load() {
  const z = readJson('standards/zhenghou/证候库.json');
  const t = readJson('standards/tizhi/体质库.json');
  const map = readJson('standards/tizhi/源-证候映射.json').map;
  const rows = new Map();
  for (const ty of t.types) {
    rows.set(ty.type, { type: ty.type, families: ty.families.slice(), zheng: [], diseases: new Set(), cross2: 0, courses: {} });
  }
  for (const x of z.zheng) {
    const type = (map[x.family] || {}).type || '未归类';
    if (!rows.has(type)) rows.set(type, { type, families: [], zheng: [], diseases: new Set(), cross2: 0, courses: {} });
    const r = rows.get(type);
    r.zheng.push(x);
    for (const d of x.diseases) r.diseases.add(d);
    if (x.courseCount >= 2) r.cross2 += 1;
    for (const c of x.courses) r.courses[c] = (r.courses[c] || 0) + 1;
  }
  const list = [...rows.values()].map((r) => ({
    type: r.type,
    families: r.families,
    zhengCount: r.zheng.length,
    diseaseCount: r.diseases.size,
    cross2: r.cross2,
    courses: r.courses,
  }));
  return { zheng: z.zheng, types: t.types, map, rows: list };
}

const uniqueDiseases = (zheng) => new Set(zheng.flatMap((x) => x.diseases)).size;

function analyze() {
  const c = load();
  const total = c.zheng.length;
  const pairs = c.zheng.reduce((a, x) => a + x.diseaseCount, 0);
  const diseases = uniqueDiseases(c.zheng);
  const rows = [...c.rows].sort((a, b) => b.zhengCount - a.zhengCount || a.type.localeCompare(b.type, 'zh'));
  const crossSum = rows.reduce((a, r) => a + r.cross2, 0);
  const coverageSum = rows.reduce((a, r) => a + r.diseaseCount, 0);
  const top = rows[0];
  const pinghe = rows.find((r) => r.type === '平和质');
  return { total, pairs, diseases, rows, crossSum, coverageSum, top, pinghe, share: top.zhengCount / total, corpus: c };
}

module.exports = { ROOT, readJson, load, analyze, uniqueDiseases };
