'use strict';
/**
 * 第 6 章 · 消食药、驱虫药与止血药：有形之积与离经之血
 *
 *   node code/main.js
 *
 * 口径：
 *   - 规模与分布全部从 standards/zhongyao/{底本,drugs}.json 现算。
 *   - 「炮制词」在整条药的原文（来源段 + 功效段 + 用法段）里检索：生用 / 炒 / 炭。
 *     检索范围必须包含来源段，否则「地榆……炒炭止血」这类只写在性味段里的信息会漏掉。
 *   - 一味药同时出现「生用」与「炒或炭」，记为一对「双用法」——同一味药的两条力。
 *   - 「毒」只认原文「有毒 / 大毒 / 小毒」。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const STD = path.join(ROOT, 'standards', 'zhongyao');
const base = JSON.parse(fs.readFileSync(path.join(STD, '底本.json'), 'utf8'));
const drugs = JSON.parse(fs.readFileSync(path.join(STD, 'drugs.json'), 'utf8')).drugs;

const NOS = ['17', '18', '19'];
const LABEL = { 17: '消食', 18: '驱虫', 19: '止血' };
const QI_ORDER = ['大寒', '寒', '微寒', '凉', '平', '微温', '温', '热', '大热'];
const QI_SCORE = { 大寒: -4, 寒: -3, 微寒: -2, 凉: -1, 平: 0, 微温: 1, 温: 2, 热: 3, 大热: 4 };

const dw = (s) => [...String(s)].reduce((n, ch) => n + (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - dw(s)));
const num = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d));

function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(dw(h), ...rows.map((r) => dw(r[i]))));
  const line = (cells) => cells.map((c, i) => pad(c, w[i])).join('  ');
  console.log(line(headers));
  console.log(w.map((x) => '-'.repeat(x)).join('  '));
  for (const r of rows) console.log(line(r));
}

const scope = () => base.chapters.filter((c) => NOS.includes(String(c.no)));

function counts() {
  let secs = 0;
  let subs = 0;
  let paras = 0;
  let chars = 0;
  const byCh = {};
  for (const c of scope()) {
    const p = { secs: (c.secs || []).length, subs: 0, paras: 0, chars: c.counts.chars };
    for (const s of c.secs) {
      for (const u of s.subs) {
        p.subs += 1;
        p.paras += (u.paras || []).length;
      }
    }
    byCh[c.no] = p;
    secs += p.secs;
    subs += p.subs;
    paras += p.paras;
    chars += p.chars;
  }
  return { chapters: scope().length, secs, subs, paras, chars, byCh };
}

const group = (nos = NOS) => drugs.filter((d) => nos.includes(String(d.chapter)));
const fullText = (d) => [d.fields['来源与性味归经'], d.fields['功效与主治'], d.fields['用法用量与使用注意']].join(' ') + ' ' + (d.nature.raw || '');
const isToxic = (d) => /有毒|大毒|小毒/.test(fullText(d));

function qiDist(list) {
  const m = new Map();
  for (const d of list) m.set(d.nature.qi || '(空)', (m.get(d.nature.qi || '(空)') || 0) + 1);
  return m;
}

function qiScore(list) {
  const v = list.map((d) => QI_SCORE[d.nature.qi]).filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function guijingCount(list) {
  const m = new Map();
  for (const d of list) for (const g of d.nature.guijing) m.set(g, (m.get(g) || 0) + 1);
  return m;
}

/** 炮制词命中；kw 为单个词元（生用 / 炒 / 炭） */
const hasProc = (d, kw) => fullText(d).includes(kw);

/** 双用法：既有生用，又有炒或炭 */
const dualUse = (d) => hasProc(d, '生用') && (hasProc(d, '炒') || hasProc(d, '炭'));

function doseCap(d) {
  const m = String(d.fields['用法用量与使用注意']).match(/(\d+(?:\.\d+)?)\s*[-~～]\s*(\d+(?:\.\d+)?)\s*g/);
  return m ? parseFloat(m[2]) : null;
}

function perChapter() {
  const out = {};
  for (const no of NOS) {
    const list = group([no]);
    const caps = list.map(doseCap).filter((x) => x != null);
    out[no] = {
      drugs: list.length,
      chars: base.chapters.find((c) => String(c.no) === no).counts.chars,
      secs: (base.chapters.find((c) => String(c.no) === no).secs || []).length,
      qi: qiScore(list),
      ku: list.filter((d) => d.nature.wei.some((w) => w.includes('苦'))).length,
      gan: list.filter((d) => d.nature.wei.includes('甘')).length,
      se: list.filter((d) => d.nature.wei.includes('涩')).length,
      toxic: list.filter(isToxic).length,
      sheng: list.filter((d) => hasProc(d, '生用')).length,
      chao: list.filter((d) => hasProc(d, '炒')).length,
      tan: list.filter((d) => hasProc(d, '炭')).length,
      dual: list.filter(dualUse).map((d) => d.name),
      capAvg: caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : null,
      capMin: caps.length ? Math.min(...caps) : null,
      capMax: caps.length ? Math.max(...caps) : null,
      topGui: [...guijingCount(list).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }
  return out;
}

function main() {
  const c = counts();
  console.log('== 第 6 章 · 消食药、驱虫药与止血药：有形之积与离经之血 ==');
  console.log(`教材章 ${NOS.join('+')}｜${c.chapters} 章 / ${c.secs} 节 / ${c.subs} 小节 / ${c.paras} 段 / ${c.chars} 字`);
  console.log(`药物单元 ${group().length} 味`);

  const pc = perChapter();
  console.log('\n[1] 三组的体量、体温与炮制密度');
  table(
    ['教材章', '组', '节', '药数', '字数', '热性均分', '苦', '甘', '涩', '毒性词', '生用', '炒', '炭', '归经前四'],
    NOS.map((no) => [
      no, LABEL[no], String(pc[no].secs), String(pc[no].drugs), String(pc[no].chars), num(pc[no].qi),
      `${pc[no].ku}/${pc[no].drugs}`, `${pc[no].gan}/${pc[no].drugs}`, `${pc[no].se}/${pc[no].drugs}`,
      String(pc[no].toxic), String(pc[no].sheng), String(pc[no].chao), String(pc[no].tan),
      pc[no].topGui.map(([g, n]) => `${g}${n}`).join('/'),
    ]),
  );

  console.log('\n[2] 四气分布（24 味）');
  const dist = qiDist(group());
  for (const q of QI_ORDER) {
    const n = dist.get(q) || 0;
    if (!n) continue;
    console.log(`  ${pad(q, 6)}${String(n).padStart(3)}  ${'█'.repeat(n)}`);
  }

  console.log('\n[3] 双用法：同一味药的两条力（既写「生用」又写「炒」「炭」）');
  const dual = group().filter(dualUse);
  table(
    ['药名', '教材章', '生用', '炒', '炭'],
    dual.map((d) => [d.name, d.chapter, hasProc(d, '生用') ? '✓' : '', hasProc(d, '炒') ? '✓' : '', hasProc(d, '炭') ? '✓' : '']),
  );
  console.log(`  共 ${dual.length} 味；占总药数 ${((dual.length / group().length) * 100).toFixed(0)}%。`);

  console.log('\n[4] 剂量窗口：两端差多少倍');
  const caps = group()
    .map((d) => ({ name: d.name, ch: d.chapter, cap: doseCap(d), toxic: isToxic(d) }))
    .filter((x) => x.cap != null)
    .sort((a, b) => a.cap - b.cap);
  table(['药名', '教材章', '剂量上限', '原文标毒性'], caps.slice(0, 4).map((x) => [x.name, x.ch, `${x.cap}g`, x.toxic ? '是' : '否']));
  console.log('  …');
  table(['药名', '教材章', '剂量上限', '原文标毒性'], caps.slice(-2).map((x) => [x.name, x.ch, `${x.cap}g`, x.toxic ? '是' : '否']));
  const ratio = caps[caps.length - 1].cap / caps[0].cap;
  console.log(`  最高上限 / 最低上限 = ${num(ratio, 0)} 倍（${caps[caps.length - 1].name} vs ${caps[0].name}）`);

  console.log('\n[5] 归经：消食在脾胃，驱虫在胃肠，止血在肝');
  for (const no of NOS) {
    const g = [...guijingCount(group([no])).entries()].sort((a, b) => b[1] - a[1]);
    console.log(`  ${LABEL[no]}：` + g.map(([x, n]) => `${x}${n}`).join(' · '));
  }

  console.log('\n[6] 止血药为什么最「苦」');
  const t19 = group(['19']);
  console.log(`  第 19 章 15 味中含苦 ${t19.filter((d) => d.nature.wei.some((w) => w.includes('苦'))).length} 味；`);
  console.log('  苦能泄能燥能坚，止血要「敛」要「降」，所以苦味在这一章是主色；而消食药靠甘平，含苦 0 味。');

  console.log('\n结论：消食治「有形之积」，驱虫治「虫」，止血治「离经之血」——三者都在处理「本该出去或本该留住的东西」。');
  console.log('      而炮制（生用 / 炒 / 炭）是把同一味药掰成两条力的开关：炒炭收敛，生用散瘀，方向相反。');
  console.log('教学边界：本章数据来自教材结构化整理，仅用于教学演示与检索，不构成用药依据。');
}

if (require.main === module) main();
module.exports = {
  base, drugs, NOS, QI_ORDER, QI_SCORE, scope, counts, group, fullText, isToxic,
  qiDist, qiScore, guijingCount, hasProc, dualUse, doseCap, perChapter, main,
};
