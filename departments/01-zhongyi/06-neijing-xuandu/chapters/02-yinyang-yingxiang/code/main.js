'use strict';
/**
 * 《素问·阴阳应象大论》四轴偏侧打分
 *
 *   node code/main.js
 *
 * 为什么不是 isYang 布尔量：阴阳有互根、消长、转化三层关系，压成 0/1 会把
 * 「寒极生热」这种**同一过程的两端**判成互相矛盾。所以这里输出的是
 * 每轴一个 −1..+1 的偏侧值 + 命中的证据行 + 参照点，而不是证型。
 */

const A_UP = '升'; // 便于阅读：轴内正方向

const AXES = [
  {
    id: '升降出入',
    pairs: [['上窍', '下窍'], ['腠理', '五脏'], ['四肢', '六腑']],
  },
  {
    id: '寒热',
    pairs: [['恶热', '畏寒'], ['舌红', '舌淡']],
  },
  {
    id: '气味形气',
    pairs: [['气厚', '味厚'], ['走表', '入里']],
  },
  {
    id: '清浊',
    pairs: [['汗出', '尿少'], ['痰黄', '痰清']],
  },
];

/**
 * @param {string[]} signs 病人出现的症状（必须逐字取自四诊记录）
 * @param {string} ref    参照点（如「与平素比」「与对侧比」）；缺失即拒绝计算
 */
function scoreAxes(signs, ref) {
  if (!ref || !String(ref).trim()) {
    throw new Error('缺参照点 ref：阴阳偏侧是相对量，没有参照就没有意义');
  }
  return AXES.map((axis) => {
    let plus = 0;
    let minus = 0;
    const hit = [];
    for (const [p, m] of axis.pairs) {
      if (signs.includes(p)) { plus += 1; hit.push(`+${p}`); }
      if (signs.includes(m)) { minus += 1; hit.push(`-${m}`); }
    }
    const total = plus + minus;
    return {
      id: axis.id,
      // 无证据时给 null，而不是 0 —— 0 会被读成「正好平衡」
      side: total === 0 ? null : +((plus - minus) / total).toFixed(2),
      evidence: hit,
      ref,
    };
  });
}

const CASES = [
  { name: 'A：上窍不利 + 畏寒 + 痰清 + 尿少', signs: ['上窍', '畏寒', '痰清', '尿少'], ref: '与平素比' },
  { name: 'B：只有一条证据（应出现无证据轴）', signs: ['舌红'], ref: '与平素比' },
];

function main() {
  for (const c of CASES) {
    console.log(`\n${c.name}（参照：${c.ref}）`);
    for (const r of scoreAxes(c.signs, c.ref)) {
      console.log(
        `  ${r.id.padEnd(5, '　')} ${r.side === null ? '无证据' : (r.side > 0 ? '偏阳/升 ' : r.side < 0 ? '偏阴/降 ' : '平衡 ') + r.side}`
        + (r.evidence.length ? `（${r.evidence.join(' ')}）` : ''),
      );
    }
  }
  console.log('\n提醒：偏侧值是相对量，不跨病人比较；本输出不构成证型结论。');
  console.log('本输出为教学样例，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { AXES, scoreAxes };
