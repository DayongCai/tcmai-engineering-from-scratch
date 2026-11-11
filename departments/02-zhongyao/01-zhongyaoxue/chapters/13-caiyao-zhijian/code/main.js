'use strict';
/**
 * 第 13 章 · 药材之前：产地、采集、炮制、配伍、禁忌与剂量
 *
 * 本章对应教材总论 7 章（第 1/2/3/4/6/7/8 章），共 7,965 字、0 味单药。
 * 工程对象不是「药性」，而是「一味药在被写入方剂之前要经过的 5 道闸」：
 *
 *   ① 产地      —— 决定成分与道地性（教材·第3章·3.1）
 *   ② 采集与贮藏 —— 决定有效成分含量与是否变质（教材·第3章·3.2–3.3）
 *   ③ 炮制      —— 改变性能与趋向（酒炙升提、盐炙下行）（教材·第4章）
 *   ④ 配伍      —— 七情：相须相使增效、相畏相杀减毒、相恶相反减效增毒（教材·第6章）
 *   ⑤ 禁忌与剂量 —— 人群边界 + 克数区间 + 煎法（教材·第7章、第8章）
 *
 * 所有数字都从 standards/zhongyao/{底本,drugs}.json 现算，不手抄统计。
 */

const fs = require('node:fs');
const path = require('node:path');

// 向上找仓根：code → 13-caiyao-zhijian → chapters → 01-zhongyaoxue → 02-zhongyao → departments → 仓根
const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');

/** 本章覆盖的教材章。第 5 章性能归第 12 章，第 9–29 章各论归第 1–11、14 章，故不在内。 */
const ZONGLUN = ['1', '2', '3', '4', '6', '7', '8'];

/** 五道闸：闸名 / 依据教材章 / 观测词表 / 闸的输出（进入下一闸的字段） */
const GATES = [
  { id: 'g1', name: '产地', chapters: ['3'], keys: ['道地', '产地'], out: '基原 + 产地（道地性）' },
  { id: 'g2', name: '采集与贮藏', chapters: ['3'], keys: ['采收', '贮藏', '走油', '霉变'], out: '采收期 + 干燥与贮存条件' },
  { id: 'g3', name: '炮制', chapters: ['4'], keys: ['炮制', '炙', '煅', '蒸'], out: '饮片规格（生 / 炒 / 炙 / 煅 / 蒸）' },
  { id: 'g4', name: '配伍', chapters: ['6'], keys: ['相须', '相使', '相畏', '相杀', '相恶', '相反', '单行'], out: '药对关系（七情）' },
  { id: 'g5', name: '禁忌与剂量', chapters: ['7', '8'], keys: ['禁用', '慎用', '十八反', '十九畏', '剂量'], out: '人群边界 + 克数区间 + 煎法' },
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** 一章的全部正文段落（章级 / 节级 / 小节级三层都收） */
function parasOf(ch) {
  const out = [...(ch.paras || [])];
  for (const s of ch.secs || []) {
    out.push(...(s.paras || []));
    for (const u of s.subs || []) out.push(...(u.paras || []));
  }
  return out;
}

/** 本章 7 章：字数/节/小节/段 全部取自底本的 counts，不重算字 */
function chapters() {
  const d = readJson(BASE);
  return ZONGLUN.map((no) => {
    const ch = d.chapters.find((x) => x.no === no);
    if (!ch) throw new Error(`底本里没有第 ${no} 章`);
    return {
      no,
      title: ch.title,
      chars: ch.counts.chars,
      secs: ch.counts.secs,
      subs: ch.counts.subs,
      paras: ch.counts.paras,
      text: parasOf(ch).join('\n'),
    };
  });
}

/** 章级规模：7 章合计多少字、多少节/小节/段 */
function scale() {
  const cs = chapters();
  const rows = cs.map(({ no, title, chars, secs, subs, paras }) => ({ no, title, chars, secs, subs, paras }));
  const add = (k) => cs.reduce((n, c) => n + c[k], 0);
  return { chapters: cs.length, chars: add('chars'), secs: add('secs'), subs: add('subs'), paras: add('paras'), rows };
}

/** 五道闸的词频：在各自教材章正文里数关键字出现次数 */
function gateHits() {
  const cs = chapters();
  return GATES.map((g) => {
    const pool = cs.filter((c) => g.chapters.includes(c.no)).map((c) => c.text).join('\n');
    const hits = {};
    let total = 0;
    for (const k of g.keys) {
      const n = pool.split(k).length - 1;
      hits[k] = n;
      total += n;
    }
    return { id: g.id, name: g.name, chapters: g.chapters, out: g.out, hits, total };
  });
}

/** 剂量区间：只从第 8 章抽「数字-数字g」，单位 g，不换算古制 */
function doseRanges() {
  const ch8 = chapters().find((c) => c.no === '8');
  const re = /(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)g/g;
  const seen = new Map();
  for (const m of ch8.text.matchAll(re)) {
    if (!seen.has(m[0])) seen.set(m[0], { raw: m[0], min: Number(m[1]), max: Number(m[2]) });
  }
  return [...seen.values()].sort((a, b) => a.min - b.min);
}

/** 七情：第 6 章的七类药对关系各出现几次 */
function qiqing() {
  const ch6 = chapters().find((c) => c.no === '6');
  const kinds = ['单行', '相须', '相使', '相畏', '相杀', '相恶', '相反'];
  return kinds.map((k) => ({ kind: k, n: ch6.text.split(k).length - 1 }));
}

/** 总论章有几味单药：0 —— 这是本章「无药可算」的口径说明 */
function drugless() {
  const d = readJson(DRUGS);
  return {
    total: d.drugs.length,
    inZonglun: d.drugs.filter((x) => ZONGLUN.includes(String(x.chapter))).length,
  };
}

function main() {
  const s = scale();
  const g = gateHits();
  const d = doseRanges();
  const q = qiqing();
  const dl = drugless();

  console.log('═══ 药材之前：5 道闸（教材·第1/2/3/4/6/7/8章）═══');
  console.log(`  总论 7 章：${s.chapters} 章 / ${s.secs} 节 / ${s.subs} 小节 / ${s.paras} 段 / ${s.chars} 字`);
  console.log(`  单药：${dl.inZonglun} 味（药库 ${dl.total} 味全在各论，总论一味不产）`);
  console.log('\n── 教材 7 章规模（底本 counts 现算）──');
  for (const r of s.rows) {
    console.log(`  第${r.no.padStart(2)}章 ${r.title.padEnd(16, '　')} ${String(r.chars).padStart(5)} 字 · ${r.secs} 节 · ${r.subs} 小节 · ${r.paras} 段`);
  }
  console.log('\n── 5 道闸：词频与闸的输出 ──');
  for (const x of g) {
    const top = Object.entries(x.hits).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k}×${n}`).join(' ');
    console.log(`  ${x.id} ${x.name.padEnd(6, '　')} 教材第${x.chapters.join('/')}章  ${String(x.total).padStart(3)} 命中（${top}） → ${x.out}`);
  }
  console.log('\n── 剂量区间（只取第 8 章的「数字-数字g」）──');
  console.log(`  共 ${d.length} 个区间：最小 ${d[0].raw}（${d[0].min} g）· 最大 ${d[d.length - 1].raw}（${d[d.length - 1].max} g）`);
  console.log(`  ${d.map((x) => x.raw).join(' · ')}`);
  console.log('\n── 七情（第 6 章词频）──');
  console.log(`  ${q.map((x) => `${x.kind}×${x.n}`).join(' · ')}`);
  console.log('\n提醒：5 道闸是教材正文的组织方式，不是可直接执行的质量标准；教材没有给出炮制温度、时间与法定上限。');
  console.log('教学边界：本章只把教材总论 7 章的产地·采集·炮制·配伍·禁忌·剂量整理成 5 道闸，不含任何单药数据与工艺参数，不构成用药依据。');
}

if (require.main === module) main();

module.exports = { ZONGLUN, GATES, chapters, scale, gateHits, doseRanges, qiqing, drugless };
