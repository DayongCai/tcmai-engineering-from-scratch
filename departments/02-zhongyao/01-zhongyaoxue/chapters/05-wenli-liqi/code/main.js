'use strict';
/**
 * 第 5 章 · 温里药与理气药：寒与滞，两条互相垂直的轴
 *
 *   node code/main.js
 *
 * 口径：
 *   - 规模、分布、均分全部从 standards/zhongyao/{底本,drugs}.json 现算，不写死计数。
 *   - 「热性分」是有序标度：大寒 -4 … 平 0 … 大热 +4。
 *   - 「纵向轴」= 归肾、心的频次 / 药数（往下、往里的温）；「横向轴」= 归肝、肺的频次 / 药数
 *     （往外、往上的行）。这只是把归经频次换个分母看，不是临床权重。
 *   - 「毒」只认原文的「有毒 / 大毒 / 小毒」；丁香的归经原文残缺，留空。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const STD = path.join(ROOT, 'standards', 'zhongyao');
const base = JSON.parse(fs.readFileSync(path.join(STD, '底本.json'), 'utf8'));
const drugs = JSON.parse(fs.readFileSync(path.join(STD, 'drugs.json'), 'utf8')).drugs;

const NOS = ['15', '16'];
const LABEL = { 15: '温里', 16: '理气' };
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
const fullText = (d) => Object.values(d.fields).join(' ') + ' ' + (d.nature.raw || '');
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

/** 纵向轴（肾、心）与横向轴（肝、肺）的「每药平均命中经络数」 */
function axes(list) {
  const g = guijingCount(list);
  const n = list.length || 1;
  const v = ((g.get('肾') || 0) + (g.get('心') || 0)) / n;
  const h = ((g.get('肝') || 0) + (g.get('肺') || 0)) / n;
  return { v, h, n };
}

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
      qi: qiScore(list),
      xin: list.filter((d) => d.nature.wei.includes('辛')).length,
      ku: list.filter((d) => d.nature.wei.some((w) => w.includes('苦'))).length,
      gan: list.filter((d) => d.nature.wei.includes('甘')).length,
      toxic: list.filter(isToxic).length,
      capAvg: caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : null,
      capMax: caps.length ? Math.max(...caps) : null,
      topGui: [...guijingCount(list).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      ...axes(list),
    };
  }
  return out;
}

function main() {
  const c = counts();
  console.log('== 第 5 章 · 温里药与理气药：寒与滞，两条互相垂直的轴 ==');
  console.log(`教材章 ${NOS.join('+')}｜${c.chapters} 章 / ${c.secs} 节 / ${c.subs} 小节 / ${c.paras} 段 / ${c.chars} 字`);
  console.log(`药物单元 ${group().length} 味`);

  const pc = perChapter();
  console.log('\n[1] 两组的体量与体温');
  table(
    ['教材章', '组', '药数', '字数', '热性均分', '辛', '苦', '甘', '毒性词', '剂量上限均值', '归经前四'],
    NOS.map((no) => [
      no, LABEL[no], String(pc[no].drugs), String(pc[no].chars), num(pc[no].qi),
      `${pc[no].xin}/${pc[no].drugs}`, `${pc[no].ku}/${pc[no].drugs}`, `${pc[no].gan}/${pc[no].drugs}`,
      String(pc[no].toxic), num(pc[no].capAvg, 1) + 'g',
      pc[no].topGui.map(([g, n]) => `${g}${n}`).join('/'),
    ]),
  );

  console.log('\n[2] 四气分布（19 味）');
  const dist = qiDist(group());
  for (const q of QI_ORDER) {
    const n = dist.get(q) || 0;
    if (!n) continue;
    console.log(`  ${pad(q, 6)}${String(n).padStart(3)}  ${'█'.repeat(n)}`);
  }

  console.log('\n[3] 两条轴：温里往下走，理气往外走');
  table(
    ['教材章', '组', '纵向轴(肾+心)/药', '横向轴(肝+肺)/药', '差值(纵−横)'],
    NOS.map((no) => [
      no, LABEL[no], num(pc[no].v), num(pc[no].h), num(pc[no].v - pc[no].h),
    ]),
  );
  console.log('  说明：纵向轴高＝药力更多落在下焦与心；横向轴高＝药力更多落在肝胆与肺。');

  console.log('\n[4] 气的跨度：温里 8 味无一味低于「温」，理气 11 味从寒排到温');
  for (const no of NOS) {
    const list = group([no]);
    const s = list.map((d) => QI_SCORE[d.nature.qi]).filter((x) => x != null);
    const min = Math.min(...s);
    const max = Math.max(...s);
    const lo = list.filter((d) => QI_SCORE[d.nature.qi] === min).map((d) => d.name);
    const hi = list.filter((d) => QI_SCORE[d.nature.qi] === max).map((d) => d.name);
    console.log(`  ${LABEL[no]}：跨度 ${min} … ${max}（${lo.join('/')} → ${hi.join('/')}）`);
  }

  console.log('\n[5] 剂量上限最小的 5 味');
  const caps = group()
    .map((d) => ({ name: d.name, ch: d.chapter, cap: doseCap(d), toxic: isToxic(d) }))
    .filter((x) => x.cap != null)
    .sort((a, b) => a.cap - b.cap);
  table(['药名', '教材章', '剂量上限', '原文标毒性'], caps.slice(0, 5).map((x) => [x.name, x.ch, `${x.cap}g`, x.toxic ? '是' : '否']));

  console.log('\n[6] 归经残缺：原文没写归经的药');
  const miss = group().filter((d) => !d.nature.guijing.length).map((d) => d.name);
  console.log('  ' + (miss.length ? miss.join('、') + '（留空，不用药典补）' : '无'));

  console.log('\n结论：温里治「寒」，靠辛热把体温与气机推回来；理气治「滞」，靠辛苦把堵住的气推开。');
  console.log('      前者的重心在肾—脾—心这条纵线，后者的重心在肝—脾胃—肺这条横线；');
  console.log('      教材把两章排在一起，是因为临床上「寒」与「滞」常常同时存在，不是因为两章可以互换。');
  console.log('教学边界：本章数据来自教材结构化整理，仅用于教学演示与检索，不构成用药依据。');
}

if (require.main === module) main();
module.exports = {
  base, drugs, NOS, QI_ORDER, QI_SCORE, scope, counts, group, fullText,
  isToxic, qiDist, qiScore, guijingCount, axes, doseCap, perChapter, main,
};
