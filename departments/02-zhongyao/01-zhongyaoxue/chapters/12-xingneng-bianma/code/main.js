'use strict';
/**
 * 第 12 章 · 中药性能的编码化：性味归经 → 向量
 *
 * 数据来自 `standards/zhongyao/drugs.json`（287 味药，性味归经由教材「来源与性味归经」段拆出），
 * 不在这里手抄药表——上一版是手打的 12 味示例，和教材对不上。
 *
 * 向量 21 维：
 *   ① 四气 1 维（有序轴：大寒 −2 … 平 0 … 大热 +2）
 *   ② 五味 8 维（辛甘酸苦咸淡涩微苦，独热）
 *   ③ 归经 12 维（肝心脾肺肾胃肠胆膀胱三焦心包小肠，独热）
 *
 * 为什么四气用有序轴而不是 one-hot：寒→凉→平→温→热 是有序的，
 * one-hot 会把「寒」和「凉」算成和「寒」与「热」一样远，向量就失去了药性方向。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');

const QI_AXIS = { 大寒: -2, 寒: -1, 微寒: -0.5, 凉: -0.5, 平: 0, 微温: 0.5, 温: 1, 热: 1.5, 大热: 2 };
const WEI_DIMS = ['辛', '甘', '酸', '苦', '咸', '淡', '涩', '微苦'];
const JING_DIMS = ['心', '肝', '脾', '肺', '肾', '胃', '肠', '胆', '膀胱', '三焦', '心包', '小肠'];

const data = () => JSON.parse(fs.readFileSync(DRUGS, 'utf8'));
const baseDoc = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));

function vec(d) {
  const v = [QI_AXIS[d.nature.qi] == null ? 0 : QI_AXIS[d.nature.qi]];
  for (const w of WEI_DIMS) v.push(d.nature.wei.includes(w) ? 1 : 0);
  const gui = d.nature.guijing.join('、');
  for (const j of JING_DIMS) v.push(gui.includes(j) ? 1 : 0);
  return v;
}

function cos(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function table() {
  const d = data();
  return d.drugs.map((x) => ({ ...x, v: vec(x) }));
}

function neighbors(name, k = 5) {
  const all = table();
  const target = all.find((x) => x.name === name);
  if (!target) return [];
  return all
    .filter((x) => x.name !== name)
    .map((x) => ({ name: x.name, score: cos(target.v, x.v), qi: x.nature.qi, wei: x.nature.wei, gui: x.nature.guijing }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function shape() {
  const d = data();
  const c = baseDoc();
  const ch5 = c.chapters.find((x) => x.no === '5');
  const qi = {};
  const wei = {};
  const gui = {};
  for (const x of d.drugs) {
    qi[x.nature.qi] = (qi[x.nature.qi] || 0) + 1;
    for (const w of x.nature.wei) wei[w] = (wei[w] || 0) + 1;
    for (const g of x.nature.guijing) gui[g] = (gui[g] || 0) + 1;
  }
  return {
    drugs: d.drugs.length,
    withQi: d.counts.drugsWithQi,
    withWei: d.counts.drugsWithWei,
    withGui: d.counts.drugsWithGui,
    dims: vec(d.drugs[0]).length,
    qi,
    wei,
    gui,
    chapter: { no: ch5.no, title: ch5.title, chars: ch5.counts.chars, subs: ch5.counts.subs },
  };
}

function main() {
  const s = shape();
  console.log('═══ 中药性能的编码化（教材·第5章·5.1–5.4）═══');
  console.log(`  药库：${s.drugs} 味（性 ${s.withQi} · 味 ${s.withWei} · 归经 ${s.withGui}）· 向量 ${s.dims} 维`);
  console.log(`  教材第${s.chapter.no}章「${s.chapter.title}」：${s.chapter.subs} 小节 / ${s.chapter.chars} 字`);
  console.log('\n── 四气（有序轴：大寒 −2 → 大热 +2）──');
  for (const [k, n] of Object.entries(s.qi).sort((a, b) => QI_AXIS[a[0]] - QI_AXIS[b[0]])) {
    console.log(`  ${k.padEnd(3, '　')} ${String(n).padStart(3)} 味  轴值 ${QI_AXIS[k]}`);
  }
  console.log('\n── 五味（独热 8 维，一味可多维）──');
  for (const [k, n] of Object.entries(s.wei).sort((a, b) => b[1] - a[1])) console.log(`  ${k} ${n}`);
  console.log('\n── 归经（独热 12 维）──');
  for (const [k, n] of Object.entries(s.gui).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`  ${k} ${n}`);

  console.log('\n── 相似度示范（余弦，top5）──');
  for (const name of ['麻黄', '石膏']) {
    const hit = neighbors(name).map((x) => `${x.name}(${x.score.toFixed(3)})`).join(' · ');
    console.log(`  ${name} → ${hit}`);
  }
  console.log('\n提醒：相似 ≠ 可替换。向量只含四气、五味、归经三轴，不含剂量、炮制、毒性与配伍。');
  console.log('教学边界：本章只把教材·第5章的性能描述编码成向量并算相似度，相似不等于可替换，不构成用药依据。');
}

if (require.main === module) main();

module.exports = { vec, cos, neighbors, shape, QI_AXIS, WEI_DIMS, JING_DIMS };
