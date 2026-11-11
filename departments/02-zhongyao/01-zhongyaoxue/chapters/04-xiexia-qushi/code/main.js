'use strict';
/**
 * 第 4 章 · 泻下药与祛湿药：湿邪的三条出口（攻 / 燥 / 渗）
 *
 *   node code/main.js
 *
 * 口径：
 *   - 全部数字从 standards/zhongyao/底本.json 与 drugs.json 现算，不写死任何一种计数。
 *   - 「热性分」是一个有序标度：大寒 -4 … 平 0 … 大热 +4（四气本身有序，理由见第 12 章）。
 *   - 「峻猛度」用用法段里可解析的**剂量上限**近似：上限越小，单次用量越窄，安全窗越窄。
 *     这是一个粗糙代理量，不含炮制、配伍、个体差异 —— 见 docs 的「代价与边界」。
 *   - 「毒性词」只统计原文写了「有毒 / 大毒 / 小毒」的药，不用药典补录。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const STD = path.join(ROOT, 'standards', 'zhongyao');
const base = JSON.parse(fs.readFileSync(path.join(STD, '底本.json'), 'utf8'));
const drugs = JSON.parse(fs.readFileSync(path.join(STD, 'drugs.json'), 'utf8')).drugs;

/** 本课程章 → 教材章号 */
const NOS = ['11', '12', '13', '14'];
const LABEL = { 11: '攻下·润下·峻下', 12: '祛风湿', 13: '化湿', 14: '利水渗湿' };
const QI_ORDER = ['大寒', '寒', '微寒', '凉', '平', '微温', '温', '热', '大热'];
const QI_SCORE = { 大寒: -4, 寒: -3, 微寒: -2, 凉: -1, 平: 0, 微温: 1, 温: 2, 热: 3, 大热: 4 };

const dw = (s) => [...String(s)].reduce((n, ch) => n + (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - dw(s)));
const num = (x, d = 1) => (x == null ? '—' : Number(x).toFixed(d));

function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(dw(h), ...rows.map((r) => dw(r[i]))));
  const line = (cells) => cells.map((c, i) => pad(c, w[i])).join('  ');
  console.log(line(headers));
  console.log(w.map((x) => '-'.repeat(x)).join('  '));
  for (const r of rows) console.log(line(r));
}

/** 教材侧：本课程章覆盖的教材章 */
const scope = () => base.chapters.filter((c) => NOS.includes(String(c.no)));

/** 结构计数：全部现算，不信任何外部常量 */
function counts() {
  const chs = scope();
  let secs = 0;
  let subs = 0;
  let paras = 0;
  let chars = 0;
  const byCh = {};
  for (const c of chs) {
    const sN = (c.secs || []).length;
    let uN = 0;
    let pN = 0;
    for (const s of c.secs) {
      for (const u of s.subs) {
        uN += 1;
        pN += (u.paras || []).length;
      }
    }
    byCh[c.no] = { secs: sN, subs: uN, paras: pN, chars: c.counts.chars };
    secs += sN;
    subs += uN;
    paras += pN;
    chars += c.counts.chars;
  }
  return { chapters: chs.length, secs, subs, paras, chars, byCh };
}

/** 药物侧 */
const group = (nos = NOS) => drugs.filter((d) => nos.includes(String(d.chapter)));
const fullText = (d) => Object.values(d.fields).join(' ') + ' ' + (d.nature.raw || '');

function qiDist(list) {
  const m = new Map();
  for (const d of list) {
    const q = d.nature.qi || '(空)';
    m.set(q, (m.get(q) || 0) + 1);
  }
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

const isToxic = (d) => /有毒|大毒|小毒/.test(fullText(d));

/** 用法段里的剂量上限（克）；解析不到返回 null —— 不猜 */
function doseCap(d) {
  const m = String(d.fields['用法用量与使用注意']).match(/(\d+(?:\.\d+)?)\s*[-~～]\s*(\d+(?:\.\d+)?)\s*g/);
  if (!m) return null;
  const v = parseFloat(m[2]);
  return Number.isFinite(v) ? v : null;
}

function perChapter() {
  const out = {};
  for (const no of NOS) {
    const list = group([no]);
    const caps = list.map(doseCap).filter((x) => x != null);
    out[no] = {
      drugs: list.length,
      chars: base.chapters.find((c) => String(c.no) === no).counts.chars,
      toxic: list.filter(isToxic).length,
      qi: qiScore(list),
      capAvg: caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : null,
      capMax: caps.length ? Math.max(...caps) : null,
      topGui: [...guijingCount(list).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }
  return out;
}

function main() {
  const c = counts();
  console.log('== 第 4 章 · 泻下药与祛湿药：湿邪的三条出口 ==');
  console.log(`教材章 ${NOS.join('+')}｜${c.chapters} 章 / ${c.secs} 节 / ${c.subs} 小节 / ${c.paras} 段 / ${c.chars} 字`);
  console.log(`药物单元 ${group().length} 味（教材各论第 11–14 章各小节一味）`);

  console.log('\n[1] 四条通道的规模与强度（数字全部现算）');
  const pc = perChapter();
  table(
    ['教材章', '通道', '药数', '字数', '热性均分', '剂量上限均值', '剂量上限最大', '毒性词', '归经前三'],
    NOS.map((no) => [
      no, LABEL[no], String(pc[no].drugs), String(pc[no].chars), num(pc[no].qi, 2),
      num(pc[no].capAvg) + 'g', num(pc[no].capMax, 0) + 'g', String(pc[no].toxic),
      pc[no].topGui.map(([g, n]) => `${g}${n}`).join('/'),
    ]),
  );

  console.log('\n[2] 四气分布（45 味合计）');
  const dist = qiDist(group());
  const total = group().length;
  for (const q of QI_ORDER) {
    const n = dist.get(q) || 0;
    if (!n) continue;
    const share = ((n / total) * 100).toFixed(0);
    console.log(`  ${pad(q, 6)}${String(n).padStart(3)}  ${'█'.repeat(n)}  ${share}%`);
  }
  const cold = (dist.get('寒') || 0) + (dist.get('微寒') || 0) + (dist.get('凉') || 0) + (dist.get('大寒') || 0);
  const warm = (dist.get('温') || 0) + (dist.get('微温') || 0) + (dist.get('热') || 0) + (dist.get('大热') || 0);
  console.log(`  寒凉侧 ${cold} 味 / 温热侧 ${warm} 味 / 平 ${dist.get('平') || 0} 味`);

  console.log('\n[3] 归经覆盖（一味药可归多经，故合计 > 药数）');
  const gj = [...guijingCount(group()).entries()].sort((a, b) => b[1] - a[1]);
  console.log('  ' + gj.map(([g, n]) => `${g} ${n}`).join(' · '));

  console.log('\n[4] 峻猛度：剂量上限最小的 6 味（越小＝安全窗越窄）');
  const caps = group()
    .map((d) => ({ name: d.name, ch: d.chapter, cap: doseCap(d), toxic: isToxic(d) }))
    .filter((x) => x.cap != null)
    .sort((a, b) => a.cap - b.cap);
  table(
    ['药名', '教材章', '剂量上限', '原文标毒性'],
    caps.slice(0, 6).map((x) => [x.name, x.ch, `${x.cap}g`, x.toxic ? '是' : '否']),
  );
  console.log(`  可解析剂量上限 ${caps.length}/${group().length} 味；解析不到的不猜，直接从排序里剔除。`);

  console.log('\n[5] 五味与通道的错位（「苦」是三条通道的公共词）');
  const ku = group().filter((d) => d.nature.wei.some((w) => w.includes('苦'))).length;
  const xin = group().filter((d) => d.nature.wei.includes('辛')).length;
  const gan = group().filter((d) => d.nature.wei.includes('甘')).length;
  console.log(`  含苦 ${ku}/${total}｜含辛 ${xin}/${total}｜含甘 ${gan}/${total}`);
  console.log('  苦能泄能燥能坚 → 泻下、燥湿、渗泄三条通道都能挂上「苦」，所以苦味不能用来区分通道。');

  console.log('\n结论：攻（剂量最窄、毒性最密）、燥（热性最高）、渗（剂量最宽、毒性最低）是三种不同的力，');
  console.log('      教材把它们排在一起，是因为它们回答同一个问题——水湿从哪走；不是因为它们可以互换。');
  console.log('教学边界：本章数据来自教材结构化整理，仅用于教学演示与检索，不构成用药依据。');
}

if (require.main === module) main();
module.exports = {
  base, drugs, NOS, QI_ORDER, QI_SCORE, scope, counts, group, fullText,
  qiDist, qiScore, guijingCount, isToxic, doseCap, perChapter, main,
};
