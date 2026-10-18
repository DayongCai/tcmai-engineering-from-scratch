'use strict';
/**
 * 病机十九条：结构化 + 按症状线索反查 + 分布统计
 *
 *   node code/main.js
 *
 * 设计要点（也是本章的教学点）：
 *   1. `belong` 与 `kind` 分开存 —— 「肝」是脏腑，「火」是六气，「上/下」是部位，
 *      三者不是同一层概念，混在一列里统计出来的分布是假的。
 *   2. 每条必须带 `boundary` —— 原文说「皆属于」是归纳，不是排他；
 *      不带边界的条文一旦进系统，就会被读成判据。
 *   3. search() 返回**全部**命中，不排序、不择优 —— 「热」有四条，取第一条就是偏见。
 */

const NINETEEN = [
  { n: 1, text: '诸风掉眩', belong: '肝', kind: '脏', boundary: '掉眩亦可属痰、属虚、属气血亏，本条不排除' },
  { n: 2, text: '诸寒收引', belong: '肾', kind: '脏', boundary: '收引亦可见于寒湿在经络，非独肾阳虚' },
  { n: 3, text: '诸气膹郁', belong: '肺', kind: '脏', boundary: '气郁亦属肝，本条只提示肺主气' },
  { n: 4, text: '诸湿肿满', belong: '脾', kind: '脏', boundary: '水肿亦责肾、责肺，本条不排除' },
  { n: 5, text: '诸热瞀瘈', belong: '火', kind: '火', boundary: '瞀瘈可见于痰、风、虚，本条不排除' },
  { n: 6, text: '诸痛痒疮', belong: '心', kind: '脏', boundary: '疮疡亦属湿热、属火；归属心或火历代有分歧' },
  { n: 7, text: '诸厥固泄', belong: '下', kind: '部位', boundary: '「下」指下焦；固泄亦可由中焦气机致' },
  { n: 8, text: '诸痿喘呕', belong: '上', kind: '部位', boundary: '「上」指上焦；痿证本源在脾胃，本条只言病位' },
  { n: 9, text: '诸禁鼓慄，如丧神守', belong: '火', kind: '火', boundary: '战栗亦有寒证、阳虚，本条不排除' },
  { n: 10, text: '诸痉项强', belong: '湿', kind: '湿', boundary: '痉亦属风、属热、属阴虚，本条不排除' },
  { n: 11, text: '诸逆冲上', belong: '火', kind: '火', boundary: '冲上亦可见于虚阳上浮、痰气上逆' },
  { n: 12, text: '诸胀腹大', belong: '热', kind: '热', boundary: '胀满亦属寒、属虚、属气滞水停' },
  { n: 13, text: '诸躁狂越', belong: '火', kind: '火', boundary: '狂越亦有痰迷、瘀血、阳明腑实' },
  { n: 14, text: '诸暴强直', belong: '风', kind: '风', boundary: '强直亦有热极生风、破伤风（外风）之别' },
  { n: 15, text: '诸病有声，鼓之如鼓', belong: '热', kind: '热', boundary: '腹胀叩之如鼓亦可见于气滞、水停' },
  { n: 16, text: '诸病胕肿，疼酸惊骇', belong: '火', kind: '火', boundary: '胕肿亦可属湿、属虚；惊骇亦可属胆虚' },
  { n: 17, text: '诸转反戾，水液浑浊', belong: '热', kind: '热', boundary: '水液浑浊亦可因湿热下注、清浊不分' },
  { n: 18, text: '诸病水液，澄澈清冷', belong: '寒', kind: '寒', boundary: '清冷亦可见于阳虚不化，寒与虚常并存' },
  { n: 19, text: '诸呕吐酸，暴注下迫', belong: '热', kind: '热', boundary: '吐酸亦可属寒（肝寒犯胃），本条不排除' },
];

/** 按症状线索反查：返回全部命中，不排序、不择优 */
function search(sign) {
  if (!sign || !String(sign).trim()) throw new Error('检索词不能为空');
  return NINETEEN.filter((x) => x.text.includes(sign));
}

/** 分布：按 kind 统计（脏 / 火 / 热 / 湿 / 风 / 寒 / 部位） */
function distribution() {
  const out = {};
  for (const x of NINETEEN) out[x.kind] = (out[x.kind] || 0) + 1;
  return out;
}

/** 「热」与「火」在十九条里是两类，不许合并 —— 合并后「火 5 + 热 4」会变成一个模糊的 9 */
function byBelong() {
  const out = {};
  for (const x of NINETEEN) out[x.belong] = (out[x.belong] || 0) + 1;
  return out;
}

function main() {
  console.log(`条文 ${NINETEEN.length} 条`);
  console.log('按类（kind）：', JSON.stringify(distribution()));
  console.log('按所属（belong）：', JSON.stringify(byBelong()));

  for (const sign of ['水液', '呕', '眩']) {
    const hits = search(sign);
    console.log(`\n检索「${sign}」→ ${hits.length} 条`);
    for (const h of hits) console.log(`  ${h.n}. ${h.text} → 属于${h.belong}（${h.kind}）｜边界：${h.boundary}`);
    if (!hits.length) console.log('  未命中：十九条不含该线索，不要硬套');
  }
  console.log('\n提醒：「皆属于」是归纳提示，原文要求“有者求之，无者求之”。');
  console.log('本输出为教学样例，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { NINETEEN, search, distribution, byBelong };
