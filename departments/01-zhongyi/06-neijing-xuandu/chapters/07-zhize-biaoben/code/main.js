'use strict';
/**
 * 治则与标本：条件→治序的判定器（含优先级冲突）
 *
 *   node code/main.js
 *
 * 口径：
 *   · 规则逐条来自《素问·标本病传论》《素问·至真要大论》原文条件，不用「急/缓」。
 *   · 优先级（中满 > 二便 > 有余/不足）是本章的读法，不是原文明文；代码里标 note。
 *   · 只输出顺序与依据，不出方药、不判预后。
 */

const RULES = [
  {
    id: '中满',
    priority: 1,
    when: (s) => s.先病后中满 === true,
    order: ['标', '本'],
    quote: '先病而后生中满者治其标，先中满而后烦心者治其本。',
    why: '中满阻升降，药食难入，属前置条件',
    note: '本章归纳：中满优先于一般本标',
  },
  {
    id: '二便',
    priority: 2,
    when: (s) => s.小大不利 === true,
    order: ['标', '本'],
    quote: '小大不利治其标，小大利治其本。',
    why: '二便不通则邪无出路，属前置条件',
    note: '本章归纳：二便不利优先于一般本标',
  },
  {
    id: '中满在先',
    priority: 2,
    when: (s) => s.中满在先 === true,
    order: ['本', '标'],
    quote: '先中满而后烦心者治其本。',
    why: '中满在先，则中满即本',
    note: '原文直接给出（同句后半）',
  },
  {
    id: '二便在先',
    priority: 2,
    when: (s) => s.二便不利在先 === true,
    order: ['本', '标'],
    quote: '小大不利而后生病者，治其本。',
    why: '二便不利在先，则二便为本',
    note: '原文直接给出',
  },
  {
    id: '有余不足',
    priority: 3,
    when: (s) => s.有余 === true || s.不足 === true,
    order: (s) => (s.有余 ? ['本', '标'] : ['标', '本']),
    quote: '病发而有余，本而标之，先治其本，后治其标；病发而不足，标而本之，先治其标，后治其本。',
    why: '病势有余先治本，不足先治标',
    note: '原文直接给出',
  },
];

/** 判定：返回胜出规则、治序、全部命中（含被压过的） */
function decide(state = {}) {
  const matched = RULES.filter((r) => r.when(state));
  if (!matched.length) {
    return { order: null, winner: null, matched: [], why: '未命中任何规则：缺「有余/不足」「中满」「二便」等条件' };
  }
  const sorted = [...matched].sort((a, b) => a.priority - b.priority);
  const win = sorted[0];
  return {
    order: typeof win.order === 'function' ? win.order(state) : win.order,
    winner: win.id,
    winnerQuote: win.quote,
    why: win.why,
    note: win.note,
    matched: matched.map((r) => r.id),
    overridden: sorted.slice(1).map((r) => r.id),
  };
}

/** 正治 / 反治：微者逆之，甚者从之 */
function reverseType(intensity) {
  if (intensity === '微') return { type: '正治', mode: '逆', quote: '微者逆之', example: '寒者热之，热者寒之' };
  if (intensity === '甚') return { type: '反治', mode: '从', quote: '甚者从之', example: '塞因塞用，通因通用', caveat: '其始则同，其终则异' };
  throw new Error(`未知病势：${intensity}（原文只有「微」「甚」两档）`);
}

function main() {
  const cases = [
    { name: '仅有余', s: { 有余: true } },
    { name: '仅不足', s: { 不足: true } },
    { name: '有余 + 先病后中满', s: { 有余: true, 先病后中满: true } },
    { name: '有余 + 小大不利', s: { 小大不利: true, 有余: true } },
    { name: '中满在先 + 有余', s: { 中满在先: true, 有余: true } },
    { name: '二便不利在先 + 不足', s: { 二便不利在先: true, 不足: true } },
    { name: '信息不足', s: {} },
  ];
  for (const c of cases) {
    const r = decide(c.s);
    console.log(`${c.name}：${r.order ? r.order.map((x) => '先治' + x).join(' → ') : '—'}${r.winner ? `｜胜出 ${r.winner}` : ''}`);
    if (r.matched.length > 1) console.log(`    同时命中 ${r.matched.join('/')}；被压过 ${r.overridden.join('/')}`);
  }
  console.log('\n正治/反治：');
  for (const i of ['微', '甚']) {
    const r = reverseType(i);
    console.log(`  ${i} → ${r.type}（${r.mode}）｜${r.quote}｜例：${r.example}${r.caveat ? `｜须辨：${r.caveat}` : ''}`);
  }
  console.log('\n口径：优先级为本章归纳（中满 > 二便 > 有余/不足）；只给顺序，不出方药。');
  console.log('本输出为条文规则化演示，不构成诊疗依据。');
}

if (require.main === module) main();
module.exports = { RULES, decide, reverseType };
