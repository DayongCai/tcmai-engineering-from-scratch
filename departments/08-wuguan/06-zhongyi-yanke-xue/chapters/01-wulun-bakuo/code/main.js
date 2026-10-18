'use strict';
/**
 * 五轮八廓：眼局部体征 → 轮位 → 脏腑 的查表
 *
 *   node code/main.js
 *
 * 口径：
 *   五轮（《银海精微·五轮八廓总论》）：胞睑=肉轮=脾 / 两眦=血轮=心 / 白睛=气轮=肺
 *                                    黑睛=风轮=肝 / 瞳神=水轮=肾
 *   八廓：历代配属不一致 —— 一律标 disputed，使用时须指明版本
 *
 * 为什么带上 source 与 disputed：映射表一旦进代码就会变成"事实"，
 * 而八廓的版本分歧是真实的学术信息，不能在编码时被抹平。
 */

const WULUN = [
  { lun: '肉轮', area: '胞睑', zang: '脾', source: '《银海精微·五轮八廓总论》', disputed: false },
  { lun: '血轮', area: '两眦', zang: '心', source: '《银海精微·五轮八廓总论》', disputed: false },
  { lun: '气轮', area: '白睛', zang: '肺', source: '《银海精微·五轮八廓总论》', disputed: false },
  { lun: '风轮', area: '黑睛', zang: '肝', source: '《银海精微·五轮八廓总论》', disputed: false },
  { lun: '水轮', area: '瞳神', zang: '肾', source: '《银海精微·五轮八廓总论》', disputed: false },
];

// 八廓只做「承认存在」的登记，不给单值配属
const BAKUO = {
  names: ['天廓', '地廓', '火廓', '水廓', '风廓', '雷廓', '泽廓', '山廓'],
  disputed: true,
  note: '历代配属不一（《银海精微》与《审视瑶函》不同），编码时不取单值',
};

/** 体征关键词 → 部位（用于查表；关键词必须来自原文，不做同义扩展） */
const SIGN_HINTS = [
  { area: '胞睑', keys: ['胞睑', '眼睑', '上睑', '下睑'] },
  { area: '两眦', keys: ['眦', '目内眦', '目外眦'] },
  { area: '白睛', keys: ['白睛', '球结膜'] },
  { area: '黑睛', keys: ['黑睛', '角膜'] },
  { area: '瞳神', keys: ['瞳神', '瞳孔'] },
];

function locate(sign) {
  const hits = SIGN_HINTS.filter((h) => h.keys.some((k) => sign.includes(k)));
  // 一处体征命中两个部位（如「眦部白睛」）→ 返回多个候选，不替使用者做取舍
  const rows = hits.map((h) => WULUN.find((w) => w.area === h.area)).filter(Boolean);
  if (!rows.length) return null;
  return rows;
}

function main() {
  for (const sign of ['白睛红赤', '胞睑红肿', '眦部白睛充血', '视物模糊']) {
    const r = locate(sign);
    if (!r) {
      console.log(`${sign} → 无法定位到五轮；不得强行归轮，需结合专科检查`);
      continue;
    }
    for (const x of r) {
      console.log(`${sign} → ${x.lun}（${x.area}）→ ${x.zang}脏（出处：${x.source}${x.disputed ? '；有争议' : ''}）`);
    }
    if (r.length > 1) console.log(`  注意：命中 ${r.length} 个轮位，属跨区体征，下游应保留多候选`);
  }
  console.log('\n本输出为教学样例，不构成诊断依据；急性视力下降/剧痛/外伤须急诊处理。');
}

if (require.main === module) main();
module.exports = { WULUN, BAKUO, SIGN_HINTS, locate };
