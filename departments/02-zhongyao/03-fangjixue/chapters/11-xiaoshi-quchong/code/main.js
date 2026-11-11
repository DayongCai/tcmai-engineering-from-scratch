'use strict';
/**
 * 消食、驱虫与涌吐：五方四节的归属、药位、八法与抽取失真
 *
 *   node code/main.js
 *
 * 口径：
 *   · 方、节、药味、君臣佐使一律从 standards/fangji/formulas.json 现读现算；
 *   · 教材字数（8,504 + 4,854 = 13,358）从 底本.json 的 counts.hanzi 复算；
 *   · 八法归属直接取 formulas.json 的 bafa 层（按章/节名判定），不另判；
 *   · 君臣佐使是抽取层结果，本章把已知的两处失真（使全缺、健脾丸君被压缩）当数据标出来。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const FORMULAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/底本.json'), 'utf8'));

const CH_XIAO = '21';
const CH_QU = '22';
const ROLES = ['君', '臣', '佐', '使'];

const byChapter = (no) => FORMULAS.formulas.filter((f) => String(f.chapter) === String(no));
const XIAO = () => byChapter(CH_XIAO);
const QU = () => byChapter(CH_QU);
const herbsOf = (list) => list.flatMap((f) => f.composition.herbs.map((h) => h.name));
const uniq = (arr) => [...new Set(arr)];
const sections = (list) => uniq(list.map((f) => f.sec));
const slots = (list) => herbsOf(list).length;

/** 三法：消食（21 章）/ 驱虫（22.1）/ 涌吐（22.2） */
function threeFa() {
  const xiao = XIAO();
  const qu = QU();
  return [
    { fa: '消', chapter: CH_XIAO, list: xiao },
    { fa: '驱虫', chapter: CH_QU, list: qu.filter((f) => f.sec.startsWith('22.1')) },
    { fa: '涌吐', chapter: CH_QU, list: qu.filter((f) => f.sec.startsWith('22.2')) },
  ];
}

/** 方级摘要：药味数、君药（抽取层）、节、功用、八法归属 */
function digest(list) {
  return list.map((f) => ({
    name: f.name,
    sec: f.sec,
    herbs: f.composition.herbs.length,
    jun: (f.roles && f.roles['君'] || []).join('、') || '（未抽出）',
    gongyong: String(f.gongyong || '').replace(/。$/, ''),
    bafa: f.fa || '（不属八法）',
  }));
}

/** 君臣佐使覆盖 */
function roleCoverage(list) {
  return ROLES.map((role) => ({
    role,
    n: list.filter((f) => (f.roles && f.roles[role] || []).length > 0).length,
    total: list.length,
  }));
}

/** 两章共享药味 */
function sharedHerbs() {
  const b = new Set(herbsOf(QU()));
  return uniq(herbsOf(XIAO())).filter((h) => b.has(h)).sort();
}

/** 八法归属：从 bafa 层取「消」「吐」两法，并核对乌梅丸不在八法内 */
function bafaCheck() {
  const items = FORMULAS.bafa.items;
  const xiao = items.find((i) => i.fa === '消');
  const tu = items.find((i) => i.fa === '吐');
  const inBafa = new Set(items.flatMap((i) => i.names));
  return {
    xiao: { n: xiao.formulas, names: xiao.names },
    tu: { n: tu.formulas, names: tu.names },
    inBafa: [...inBafa],
    notInBafa: [...XIAO(), ...QU()].map((f) => f.name).filter((n) => !inBafa.has(n)),
    totalBafa: items.reduce((n, i) => n + i.formulas, 0),
  };
}

/** 抽取失真：健脾丸的「君」是否由「四味相合……共为君药」一句压成一味 */
function junDistortion() {
  const f = FORMULAS.formulas.find((x) => x.name === '健脾丸');
  const ev = (f.roleEvidence || []).find((e) => e.role === '君');
  return {
    formula: f.name,
    jun: (f.roles && f.roles['君'] || []).join('、'),
    herbCount: f.composition.herbs.length,
    evidence: ev ? ev.quote : '',
    quoteSaysFour: !!ev && ev.quote.includes('四味相合') && ev.quote.includes('共为君药'),
  };
}

/** 教材字数：按章号从底本复算 */
function textbookChars(nos) {
  return nos.reduce((n, no) => n + BASE.chapters.find((c) => c.no === String(no)).counts.hanzi, 0);
}

/** 规模自检 */
function selfCheck() {
  const xiao = XIAO();
  const qu = QU();
  const checks = [
    { name: '消食 3 首', ok: xiao.length === 3, got: xiao.length },
    { name: '驱虫+涌吐 2 首', ok: qu.length === 2, got: qu.length },
    { name: '节数 2+2=4', ok: sections(xiao).length + sections(qu).length === 4, got: sections(xiao).length + sections(qu).length },
    { name: '药位 28+12=40', ok: slots(xiao) + slots(qu) === 40, got: slots(xiao) + slots(qu) },
    { name: '教材字数 13358', ok: textbookChars([CH_XIAO, CH_QU]) === 13358, got: textbookChars([CH_XIAO, CH_QU]) },
    { name: '共享药 2 味', ok: sharedHerbs().length === 2, got: sharedHerbs().length },
    { name: '八法 消3+吐1=4', ok: bafaCheck().xiao.n + bafaCheck().tu.n === 4, got: bafaCheck().xiao.n + bafaCheck().tu.n },
    { name: '乌梅丸不属八法', ok: bafaCheck().notInBafa.includes('乌梅丸'), got: bafaCheck().notInBafa.join('、') },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const xiao = XIAO();
  const qu = QU();
  console.log('═══ 消食、驱虫与涌吐 ═══');
  console.log(`教材第21章 ${xiao.length} 首 / ${sections(xiao).length} 节 · 第22章 ${qu.length} 首 / ${sections(qu).length} 节 · 合计 ${xiao.length + qu.length} 首 / ${sections(xiao).length + sections(qu).length} 节`);
  console.log(`教材字数 ${textbookChars([CH_XIAO]).toLocaleString('en-US')} + ${textbookChars([CH_QU]).toLocaleString('en-US')} = ${textbookChars([CH_XIAO, CH_QU]).toLocaleString('en-US')}`);
  console.log(`药位 ${slots(xiao)} + ${slots(qu)} = ${slots(xiao) + slots(qu)} · 去重 ${uniq(herbsOf(xiao)).length} + ${uniq(herbsOf(qu)).length} · 共享 ${sharedHerbs().length}：${sharedHerbs().join(' ')}`);

  console.log('\n三法对照：');
  for (const t of threeFa()) {
    for (const d of digest(t.list)) {
      console.log(`  ${t.fa}｜${d.sec}｜${d.name}（${d.herbs} 味）君：${d.jun}｜${d.gongyong}`);
    }
  }

  const b = bafaCheck();
  console.log(`\n八法归属：消 ${b.xiao.n} 首（${b.xiao.names.join('、')}）· 吐 ${b.tu.n} 首（${b.tu.names.join('、')}）· 不属八法 ${b.notInBafa.length} 首（${b.notInBafa.join('、')}）`);
  console.log(`  全书归八法 ${b.totalBafa} 首`);

  console.log('\n君臣佐使覆盖（有抽取结果的方数 / 总方数）：');
  console.log('  ' + roleCoverage([...xiao, ...qu]).map((r) => `${r.role} ${r.n}/${r.total}`).join(' · '));

  const d = junDistortion();
  console.log(`\n抽取失真：${d.formula} 共 ${d.herbCount} 味，抽取层君药只留「${d.jun}」；`);
  console.log(`  证据句：“${d.evidence}”`);
  console.log(`  证据句说四味共为君药：${d.quoteSaysFour ? '是' : '否'} —— 故「${d.jun}」不可当作本方唯一君药。`);

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：方少而各在一端；使药 0/5 与健脾丸君药压成一味，都是抽取留白，不是教材结论。');
  console.log('教学边界：本章只做归类、药位与八法统计，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  CH_XIAO, CH_QU, ROLES, byChapter, XIAO, QU, herbsOf, uniq, sections, slots,
  threeFa, digest, roleCoverage, sharedHerbs, bafaCheck, junDistortion, textbookChars, selfCheck, FORMULAS, BASE,
};
