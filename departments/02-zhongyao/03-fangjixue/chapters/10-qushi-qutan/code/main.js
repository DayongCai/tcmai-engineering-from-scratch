'use strict';
/**
 * 祛湿剂与祛痰剂：16 首方的类归属、药味重叠、君臣佐使覆盖
 *
 *   node code/main.js
 *
 * 口径：
 *   · 方、节、药味一律从 standards/fangji/formulas.json 现读现算，不手打数字；
 *   · 教材字数（21,612 + 14,605 = 36,217）从 底本.json 的 counts.hanzi 复算；
 *   · 共享药味按归并后的药名统计（炙甘草→甘草等），与教材原文用字不完全一致；
 *   · 君臣佐使是抽取层的结果，覆盖率低≠方中无此角色。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const FORMULAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/底本.json'), 'utf8'));

const SHI = '19'; // 教材第19章 祛湿剂
const TAN = '20'; // 教材第20章 祛痰剂
const ROLES = ['君', '臣', '佐', '使'];

const byChapter = (no) => FORMULAS.formulas.filter((f) => String(f.chapter) === String(no));
const herbsOf = (list) => list.flatMap((f) => f.composition.herbs.map((h) => h.name));
const uniq = (arr) => [...new Set(arr)];
const sections = (list) => uniq(list.map((f) => f.sec));
const slots = (list) => herbsOf(list).length;
const distinctHerbs = (list) => uniq(herbsOf(list)).length;

/** 药味频次（同一方内重复出现的药只计一次） */
function herbFreq(list) {
  const m = new Map();
  for (const f of list) for (const h of uniq(f.composition.herbs.map((x) => x.name))) m.set(h, (m.get(h) || 0) + 1);
  return [...m.entries()].map(([herb, n]) => ({ herb, n })).sort((a, b) => b.n - a.n || a.herb.localeCompare(b.herb));
}

/** 两类方共享的药味 */
function sharedHerbs(a, b) {
  const setB = new Set(herbsOf(b));
  return uniq(herbsOf(a)).filter((h) => setB.has(h)).sort();
}

/** 教材字数：按章号从底本复算 */
function textbookChars(nos) {
  return nos.reduce((n, no) => n + BASE.chapters.find((c) => c.no === String(no)).counts.hanzi, 0);
}

/** 君臣佐使覆盖：有该角色抽取结果的方数 */
function roleCoverage(list) {
  return ROLES.map((role) => ({
    role,
    n: list.filter((f) => (f.roles && f.roles[role] || []).length > 0).length,
    total: list.length,
  }));
}

/** 节的归类表 */
function sectionTable(list) {
  return sections(list).map((sec) => ({
    sec,
    n: list.filter((f) => f.sec === sec).length,
    names: list.filter((f) => f.sec === sec).map((f) => f.name),
  }));
}

/** 规模自检：数都要能对上，对不上就抛错 */
function selfCheck() {
  const shi = byChapter(SHI);
  const tan = byChapter(TAN);
  const chars = textbookChars([SHI, TAN]);
  const checks = [
    { name: '祛湿 9 首', ok: shi.length === 9, got: shi.length },
    { name: '祛痰 7 首', ok: tan.length === 7, got: tan.length },
    { name: '合计 16 首', ok: shi.length + tan.length === 16, got: shi.length + tan.length },
    { name: '节数 5+4=9', ok: sections(shi).length + sections(tan).length === 9, got: sections(shi).length + sections(tan).length },
    { name: '药位 65+42=107', ok: slots(shi) + slots(tan) === 107, got: slots(shi) + slots(tan) },
    { name: '教材字数 36217', ok: chars === 36217, got: chars },
    { name: '共享药 8 味', ok: sharedHerbs(shi, tan).length === 8, got: sharedHerbs(shi, tan).length },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const shi = byChapter(SHI);
  const tan = byChapter(TAN);
  const charsShi = textbookChars([SHI]);
  const charsTan = textbookChars([TAN]);

  console.log('═══ 祛湿剂与祛痰剂 ═══');
  console.log(`教材第19章 ${shi.length} 首 / ${sections(shi).length} 节 · 第20章 ${tan.length} 首 / ${sections(tan).length} 节 · 合计 ${shi.length + tan.length} 首 / ${sections(shi).length + sections(tan).length} 节`);
  console.log(`教材字数 ${charsShi.toLocaleString('en-US')} + ${charsTan.toLocaleString('en-US')} = ${textbookChars([SHI, TAN]).toLocaleString('en-US')}`);
  console.log(`药位 ${slots(shi)} + ${slots(tan)} = ${slots(shi) + slots(tan)} · 去重 ${distinctHerbs(shi)} + ${distinctHerbs(tan)}`);

  console.log('\n祛湿五节（按病位与寒热切）：');
  for (const s of sectionTable(shi)) console.log(`  ${s.sec}（${s.n}）${s.names.join('、')}`);

  console.log('\n祛痰四节（按痰的性质切）：');
  for (const s of sectionTable(tan)) console.log(`  ${s.sec}（${s.n}）${s.names.join('、')}`);

  console.log('\n共享药味 ' + sharedHerbs(shi, tan).length + '：' + sharedHerbs(shi, tan).join(' '));
  console.log('  祛湿方频次前 6：' + herbFreq(shi).slice(0, 6).map((x) => `${x.herb}${x.n}`).join(' '));
  console.log('  祛痰方频次前 6：' + herbFreq(tan).slice(0, 6).map((x) => `${x.herb}${x.n}`).join(' '));

  console.log('\n君臣佐使覆盖（有抽取结果的方数 / 总方数）：');
  for (const box of [['祛湿', shi], ['祛痰', tan]]) {
    console.log(`  ${box[0]}：` + roleCoverage(box[1]).map((r) => `${r.role} ${r.n}/${r.total}`).join(' · '));
  }

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：共享药是底盘，方向由各节主力药决定；覆盖率为空处是抽取留白，不是方中无此角色。');
  console.log('教学边界：本章只做类归属与药味统计，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  SHI, TAN, ROLES, byChapter, herbsOf, uniq, sections, slots, distinctHerbs,
  herbFreq, sharedHerbs, textbookChars, roleCoverage, sectionTable, selfCheck, FORMULAS, BASE,
};
