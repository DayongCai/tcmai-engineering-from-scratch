#!/usr/bin/env node
/**
 * 中医证候学 · 第 12 章 鉴别、演变与量化：本章统计口径
 * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/12-jianbie-yanbian-lianghua/docs/zh.md
 * 数据: standards/zhenghou/证候库.json（跨课程派生底本：外科/儿科/妇科 900 单元 → 132 个证候）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章负责的证候族（["气虚", "阳虚", "血虚", "阴虚", "血热", "血瘀", "湿热", "痰湿", "热毒", "气滞", "风寒", "风热", "正虚邪恋", "其他"]）各自的证候数、跨课数、病证数、代表方。
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
  throw new Error('没找到 standards/zhenghou/证候库.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const LIB = path.join(ROOT, 'standards', 'zhenghou', '证候库.json');
const CHAPTER = '12';
const FAMILIES = ["气虚", "阳虚", "血虚", "阴虚", "血热", "血瘀", "湿热", "痰湿", "热毒", "气滞", "风寒", "风热", "正虚邪恋", "其他"];

const load = () => JSON.parse(fs.readFileSync(LIB, 'utf8'));

function chapterZheng(lib) {
  return lib.zheng.filter((z) => FAMILIES.includes(z.family));
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function shape(list) {
  return {
    zheng: list.length,
    cross2: list.filter((z) => z.courseCount >= 2).length,
    diseases: sum(list.map((z) => z.diseaseCount)),
    fangs: sum(list.map((z) => z.fang.length)),
    positions: list.reduce((acc, z) => {
      for (const p of z.positions) acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {}),
  };
}

function byFamily(list) {
  const out = {};
  for (const z of list) out[z.family] = (out[z.family] || 0) + 1;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

function topZheng(list, n = 5) {
  return [...list].sort((a, b) => b.diseaseCount - a.diseaseCount || a.name.localeCompare(b.name, 'zh')).slice(0, n);
}

module.exports = { CHAPTER, FAMILIES, load, chapterZheng, shape, byFamily, topZheng, sum };

if (require.main === module) {
  const lib = load();
  const list = chapterZheng(lib);
  const s = shape(list);

  console.log('═══ 中医证候学 · 第 12 章 鉴别、演变与量化 ═══');
  console.log(`全库 ${lib.counts.zheng} 证候 · 本章 ${s.zheng} 证候（跨 2 门课 ${s.cross2}）`);
  console.log(`病证覆盖 ${s.diseases} 次 · 代表方 ${s.fangs} 条`);
  console.log('\n按族：');
  for (const [f, n] of byFamily(list)) console.log(`  ${f}\t${n}`);
  console.log('\n病位分布：');
  for (const [p, n] of Object.entries(s.positions).sort((a, b) => b[1] - a[1])) console.log(`  ${p}\t${n}`);
  console.log('\n病证数最多的证候：');
  for (const z of topZheng(list)) console.log(`  ${z.name}\t病 ${z.diseaseCount}\t课 ${z.courseCount}\t方 ${z.fang.slice(0, 2).join('、') || '—'}`);
}

// 教学样例声明：契约要求每章输出含临床边界声明（tests/test_chapter_code.js）
if (require.main === module) {
  console.log('\n※ 教学样例：数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
