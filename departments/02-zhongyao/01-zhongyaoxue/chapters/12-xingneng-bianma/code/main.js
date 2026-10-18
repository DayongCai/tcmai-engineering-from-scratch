'use strict';
/**
 * 中药性能向量化：四气（有序）+ 五味（多位）+ 归经（多位） → 余弦相似度
 *
 *   node code/main.js
 *
 * 口径：
 *   气 → 一维整数（寒 -2 / 凉 -1 / 平 0 / 温 +1 / 热 +2）
 *   味 → 5 位 0/1（辛 甘 酸 苦 咸）
 *   经 → 12 位 0/1（肺 心 肝 脾 肾 胃 胆 膀胱 大肠 小肠 三焦 心包）
 *
 * 为什么气不能 one-hot：寒→凉→平→温→热 是有序的，one-hot 会把「温」与「热」的距离
 * 算得和「温」与「寒」一样远，这与临床直觉相反。
 * 为什么味/经用多位：一味药可以既辛又甘（桂枝），一条经络表也不能互斥。
 */

const WEI = ['辛', '甘', '酸', '苦', '咸'];
const JING = ['肺', '心', '肝', '脾', '肾', '胃', '胆', '膀胱', '大肠', '小肠', '三焦', '心包'];
const QI = { 寒: -2, 凉: -1, 平: 0, 温: 1, 热: 2 };

// 微苦、微温这类程度词在这里被压平 —— 这是本课的已知失真，写在 docs 的「代价与边界」里。
const norm = (s) => s.replace(/^微/, '');

function vec(herb) {
  const v = [QI[herb.qi] ?? 0];
  for (const w of WEI) v.push(herb.wei.map(norm).includes(w) ? 1 : 0);
  for (const j of JING) v.push(herb.jing.includes(j) ? 1 : 0);
  return v;
}

function cos(a, b) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  if (!na || !nb) return 0;
  return +(dot / (na * nb)).toFixed(3);
}

const HERBS = [
  { name: '麻黄', qi: '温', wei: ['辛', '微苦'], jing: ['肺', '膀胱'] },
  { name: '桂枝', qi: '温', wei: ['辛', '甘'], jing: ['心', '肺', '膀胱'] },
  { name: '紫苏叶', qi: '温', wei: ['辛'], jing: ['肺', '脾'] },
  { name: '薄荷', qi: '凉', wei: ['辛'], jing: ['肺', '肝'] },
  { name: '石膏', qi: '寒', wei: ['辛', '甘'], jing: ['肺', '胃'] },
];

/** 以某味药为查询，按性能相似度排序（不回自己） */
function neighbors(name, herbs = HERBS) {
  const q = herbs.find((h) => h.name === name);
  if (!q) throw new Error(`没有这味药: ${name}`);
  const qv = vec(q);
  return herbs
    .filter((h) => h.name !== name)
    .map((h) => ({ name: h.name, cos: cos(qv, vec(h)) }))
    .sort((a, b) => b.cos - a.cos);
}

function main() {
  for (const name of ['麻黄', '石膏']) {
    console.log(`\n查询：${name}（${HERBS.find((h) => h.name === name).qi}）`);
    for (const n of neighbors(name)) console.log(`  ${n.name.padEnd(4, '　')} cos=${n.cos}`);
  }
  console.log('\n提醒：相似 ≠ 可替换。性能向量不含剂量、炮制、毒性与配伍。');
  console.log('本输出为教学样例，不构成用药建议。');
}

if (require.main === module) main();
module.exports = { HERBS, WEI, JING, QI, vec, cos, neighbors };
