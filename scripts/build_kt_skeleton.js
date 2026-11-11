#!/usr/bin/env node
/**
 * scripts/build_kt_skeleton.js —— 把「五级骨架」落成机器可读的 L0–L3 四层文件（M1 阶段产物）
 *
 * 事实源：standards/knowledge-tree/tree-schema.json（须/根/域的定义）与 curriculum.json（本库院系/学科/章数）。
 * 只读，不写回任何课程目录；输出 standards/knowledge-tree/skeleton/{L0,L1,L2,L3}.json 与 mapping.json。
 *
 * 用法：
 *   node scripts/build_kt_skeleton.js           生成
 *   node scripts/build_kt_skeleton.js --check   只对账（L3 枝数 = 学科数、L2 干数 = 院系数）
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, loadCurriculum } = require('./lib');

const CHECK = process.argv.includes('--check');
const KT = path.join(ROOT, 'standards', 'knowledge-tree');
const OUT = path.join(KT, 'skeleton');
const schema = JSON.parse(fs.readFileSync(path.join(KT, 'tree-schema.json'), 'utf8'));
const cur = loadCurriculum();

const L0 = schema.levels.find((l) => l.level === 0);
const L1 = schema.levels.find((l) => l.level === 1);

// 源骨架 8 域 ↔ 本库 9 院系：显式对照（差异必须写出来，不许静默对齐）
const DOMAIN_MAP = [
  { src: 'D01 中医学院', dept: '01-zhongyi', note: '一一对应' },
  { src: 'D02 中药学院', dept: '02-zhongyao', note: '一一对应' },
  { src: 'D03 针灸学院', dept: '03-zhenjiu', note: '一一对应' },
  { src: 'D04 推拿学院', dept: '03-zhenjiu', note: '源独立成院；本库推拿 5 门并入针灸系，枝数合并计算' },
  { src: 'D05 骨伤学院', dept: '04-gushang', note: '一一对应' },
  { src: 'D06 五官口腔学院', dept: '08-wuguan', note: '一一对应' },
  { src: 'D07 中医智能学院', dept: '07-zhineng', note: '一一对应' },
  { src: 'D08 中医管理学院', dept: '06-guanli', note: '一一对应' },
  { src: '（源无对应）', dept: '05-huli', note: '本库新增：护理学院 27 门，源骨架无此域，挂 L2 新干 D09' },
  { src: '（源无对应）', dept: '09-jichu', note: '本库新增：基础医学院 17 门，源骨架无此域，挂 L2 新干 D10' },
];

const depts = cur.departments.map((d, i) => ({
  code: `D${String(i + 1).padStart(2, '0')}`,
  slug: d.slug,
  subjects: d.subjects.length,
  chapters: d.subjects.reduce((a, s) => a + (s.chapters || 0), 0),
  branches: d.subjects.map((s) => {
    const slug = s.slug;
    let units = 0;
    let hanzi = 0;
    // standards 目录不带序号（jiqi-xuexi），学科 slug 带序号（16-jiqi-xuexi）：两种都要试
    const bare = slug.replace(/^\d{2}-/, '');
    const p = [path.join(ROOT, 'standards', slug, 'units.json'), path.join(ROOT, 'standards', bare, 'units.json')]
      .find((x) => fs.existsSync(x));
    if (p) {
      try {
        const U = JSON.parse(fs.readFileSync(p, 'utf8'));
        units = (U.units || []).length;
        hanzi = (U.counts && U.counts.hanzi) || 0;
      } catch { /* 解析失败按 0 记，不猜 */ }
    }
    return { id: `${d.slug}/${slug}`, slug, title: s.title || slug, chapters: s.chapters || 0, units, hanzi };
  }),
}));

const branchCount = depts.reduce((a, d) => a + d.branches.length, 0);
const stemCount = depts.length;

if (CHECK) {
  let bad = 0;
  if (stemCount !== 9) { console.error(`✗ L2 干数 ${stemCount} ≠ 本库院系数 9`); bad += 1; }
  const curSubjects = (cur.counts && cur.counts.subjects) || depts.reduce((a, d) => a + d.subjects, 0);
  if (branchCount !== curSubjects) { console.error(`✗ L3 枝数 ${branchCount} ≠ 学科数 ${curSubjects}`); bad += 1; }
  const noUnits = depts.flatMap((d) => d.branches).filter((b) => b.units === 0);
  if (noUnits.length) console.log(`· 提示：${noUnits.length} 个学科尚无 units.json（枝在、叶空）`);
  console.log(bad ? `✗ 骨架对账失败 ${bad} 项` : `✓ 骨架对账通过：L0 ${L0.count} · L1 ${L1.count} · L2 ${stemCount} · L3 ${branchCount}`);
  process.exit(bad ? 1 : 0);
}

fs.mkdirSync(OUT, { recursive: true });
const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 1) + '\n', 'utf8');

write('L0-need.json', {
  note: 'L0 须（哲学根基）：不从属于任何学科，却滋养全部学科。源骨架定义，本文件只落盘不新造。',
  source: 'standards/knowledge-tree/tree-schema.json#levels[0]',
  items: L0.items.map((name, i) => ({ id: `L0.${i + 1}`, name })),
});
write('L1-root.json', {
  note: 'L1 根（核心公理）：四条，对每个院系域各发一条 spine 边。',
  source: 'standards/knowledge-tree/tree-schema.json#levels[1]',
  items: L1.items.map((name, i) => ({ id: `L1.${i + 1}`, name })),
});
write('L2-domain.json', {
  note: 'L2 干（院系域）：本库 9 院系；与源 8 域的差异见 mapping.json，不许静默对齐。',
  count: stemCount,
  items: depts.map((d) => ({ id: d.code, dept: d.slug, subjects: d.subjects, chapters: d.chapters })),
});
write('L3-branch.json', {
  note: 'L3 枝（学科）：一门课 = 一枝；units/hanzi 来自 standards/<subject>/units.json（枝的证据密度）。',
  count: branchCount,
  items: depts.flatMap((d) => d.branches.map((b) => ({ ...b, stem: d.code }))),
});
write('mapping.json', {
  note: '源骨架 8 域 ↔ 本库 9 院系对照；本库多出的护理/基础两域标为 D09/D10（源无对应）。',
  rows: DOMAIN_MAP,
  diff: {
    srcDomains: 8,
    srcBranches: 120,
    localDepts: stemCount,
    localBranches: branchCount,
    extraLocal: branchCount - 120,
  },
});
console.log(`✓ 骨架落盘：L0 ${L0.count} · L1 ${L1.count} · L2 ${stemCount} · L3 ${branchCount} → ${path.relative(ROOT, OUT)}`);
console.log(`  源 8 域 120 枝 vs 本库 9 域 ${branchCount} 枝：差额 ${branchCount - 120}（mapping.json 已记录差异）`);
