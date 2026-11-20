#!/usr/bin/env node
/**
 * 中医证候学 · 第 14 章 寒证门（M02）：本章统计口径
 * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/14-m02-han-men/docs/zh.md
 * 数据: standards/zhenghou-cidian/结构.json（本书目录 2268 条 → 12 门 / 45 类 / 291 证 / 1866 候条目）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本门的类/证/候、候位与态的分布、每证平均候数、占全书候数的比例。
 * 不写死任何一个计数 —— 底本一变，本章的表就跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou-cidian', '结构.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenghou-cidian/结构.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const LIB = path.join(ROOT, 'standards', 'zhenghou-cidian', '结构.json');
const MEN = 'M02';

const load = () => JSON.parse(fs.readFileSync(LIB, 'utf8'));

function menOf(lib) {
  const m = lib.men.find((x) => x.code === MEN);
  if (!m) throw new Error('结构.json 里没有门 ' + MEN);
  return m;
}

function chapters(m) {
  return m.lei.flatMap((l) => l.zhengList.map((z) => ({ lei: l, zheng: z })));
}

function hous(m) {
  return m.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList));
}

function tally(list, key) {
  const map = new Map();
  for (const x of list) map.set(x[key], (map.get(x[key]) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function stats(lib) {
  const m = menOf(lib);
  const zs = chapters(m);
  const hs = hous(m);
  const all = lib.men.flatMap((x) => x.lei.flatMap((l) => l.zhengList.flatMap((z) => z.houList)));
  return {
    men: m,
    lei: m.lei.length,
    zheng: zs.length,
    hou: hs.length,
    perZheng: zs.length ? hs.length / zs.length : 0,
    wei: tally(hs, 'wei'),
    tai: tally(hs, 'tai'),
    share: all.length ? hs.length / all.length : 0,
    allHou: all.length,
  };
}

function main() {
  const lib = load();
  const s = stats(lib);
  const x = s.men;
  console.log('═══ 《中医证候学》· ' + '寒证门' + '（' + MEN + '）═══');
  console.log('书内位置  : ' + x.book + '（目录页 ' + x.page + '）');
  console.log('规模      : ' + s.lei + ' 类 · ' + s.zheng + ' 证 · ' + s.hou + ' 候');
  console.log('每证候数  : ' + s.perZheng.toFixed(1));
  console.log('占全书候数: ' + (s.share * 100).toFixed(1) + '%（全书 ' + s.allHou + ' 条候条目）');
  console.log('');
  console.log('类目：');
  for (const l of x.lei) {
    const h = l.zhengList.reduce((a, z) => a + z.houList.length, 0);
    console.log('  ' + l.code + ' ' + l.zh + '证类 · ' + l.zhengList.length + ' 证 ' + h + ' 候');
  }
  console.log('');
  console.log('候位 top5：' + s.wei.slice(0, 5).map(([k, v]) => k + '×' + v).join('  '));
  console.log('态   top5：' + s.tai.slice(0, 5).map(([k, v]) => k + '×' + v).join('  '));
  console.log('');
  console.log('本输出为教学样例，不构成诊疗建议；证候判定须由执业中医师结合四诊完成。');
}

if (require.main === module) main();

module.exports = { load, menOf, chapters, hous, tally, stats, MEN };
