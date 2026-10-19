'use strict';
/**
 * 运气七篇：干支 → 五运 / 司天 / 在泉 / 天符（60 年周期）
 *
 *   node code/main.js
 *
 * 口径（两条基本规则逐字取自《素问》原文）：
 *   · 「甲己之岁，土运统之；乙庚之岁，金运统之；丙辛之岁，水运统之；丁壬之岁，木运统之；戊癸之岁，火运统之。」
 *     ——《素问·天元纪大论》
 *   · 「子午之上，少阴主之；丑未之上，太阴主之；寅申之上，少阳主之；卯酉之上，阳明主之；
 *      辰戌之上，太阳主之；巳亥之上，厥阴主之。」——《素问·五运行大论》
 * 在泉：与司天相对（少阴↔阳明、太阴↔太阳、少阳↔厥阴），本文有「少阳司天…厥阴在泉」之例。
 * 天符：「中运之气与司天之气相符」（《素问·六元正纪大论》），即中运五行 = 司天五行。
 *
 * 本章只做规则推演，不评价运气学说的预测效力。
 */

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 五运：天干 → 五行（原文十干配属） */
const YUN = { 甲: '土', 己: '土', 乙: '金', 庚: '金', 丙: '水', 辛: '水', 丁: '木', 壬: '木', 戊: '火', 癸: '火' };
/** 太过/不及：阳干太过，阴干不及（甲丙戊庚壬为阳） */
const YANG = new Set(['甲', '丙', '戊', '庚', '壬']);

/** 司天：地支 → 六气（原文十二支配属） */
const SITIAN = {
  子: '少阴君火', 午: '少阴君火',
  丑: '太阴湿土', 未: '太阴湿土',
  寅: '少阳相火', 申: '少阳相火',
  卯: '阳明燥金', 酉: '阳明燥金',
  辰: '太阳寒水', 戌: '太阳寒水',
  巳: '厥阴风木', 亥: '厥阴风木',
};

/** 在泉 = 司天六气的对化 */
const ZAIQUAN = {
  少阴君火: '阳明燥金', 阳明燥金: '少阴君火',
  太阴湿土: '太阳寒水', 太阳寒水: '太阴湿土',
  少阳相火: '厥阴风木', 厥阴风木: '少阳相火',
};

const ELEMENT = { 土: '土', 金: '金', 水: '水', 木: '木', 火: '火' };

/** 六气五行（用于判天符） */
function qiElement(qi) {
  if (qi.includes('火')) return '火';
  if (qi.includes('湿土') || qi.endsWith('土')) return '土';
  if (qi.includes('燥金') || qi.endsWith('金')) return '金';
  if (qi.includes('寒水') || qi.endsWith('水')) return '水';
  if (qi.includes('风木') || qi.endsWith('木')) return '木';
  throw new Error(`未知六气：${qi}`);
}

/** 六十甲子（阳干配阳支） */
function sixtyCycle() {
  const out = [];
  for (let i = 0; i < 60; i += 1) {
    const gan = GAN[i % 10];
    const zhi = ZHI[i % 12];
    out.push({ n: i + 1, gan, zhi, ganzhi: gan + zhi });
  }
  return out;
}

/** 单年推演 */
function computeYear(gan, zhi) {
  if (!YUN[gan]) throw new Error(`未知天干：${gan}`);
  if (!SITIAN[zhi]) throw new Error(`未知地支：${zhi}`);
  const yun = YUN[gan];
  const sitian = SITIAN[zhi];
  const zaiquan = ZAIQUAN[sitian];
  const tianfu = ELEMENT[yun] === qiElement(sitian);
  return {
    ganzhi: gan + zhi,
    yun,
    taiGuo: YANG.has(gan) ? '太过' : '不及',
    sitian,
    zaiquan,
    tianfu,
  };
}

/** 年份 → 干支：以 1984 年（甲子）为锚 */
function yearToGanzhi(year) {
  const offset = ((year - 1984) % 60 + 60) % 60;
  return { gan: GAN[offset % 10], zhi: ZHI[offset % 12] };
}

function stats() {
  const rows = sixtyCycle().map((r) => computeYear(r.gan, r.zhi));
  const countBy = (k) => rows.reduce((m, r) => { m[r[k]] = (m[r[k]] || 0) + 1; return m; }, {});
  return {
    rows,
    yun: countBy('yun'),
    sitian: countBy('sitian'),
    taiGuo: countBy('taiGuo'),
    tianfu: rows.filter((r) => r.tianfu).length,
    tianfuList: rows.filter((r) => r.tianfu).map((r) => r.ganzhi),
  };
}

function main() {
  const s = stats();
  console.log('十干配五运（原文）：甲己土 · 乙庚金 · 丙辛水 · 丁壬木 · 戊癸火');
  console.log('十二支配司天（原文）：子午少阴 · 丑未太阴 · 寅申少阳 · 卯酉阳明 · 辰戌太阳 · 巳亥厥阴\n');

  console.log('六十甲子统计：');
  console.log('  五运分布：' + Object.entries(s.yun).map(([k, v]) => `${k}${v}`).join(' · '));
  console.log('  太过/不及：' + Object.entries(s.taiGuo).map(([k, v]) => `${k}${v}`).join(' · '));
  console.log(`  天符之年：${s.tianfu} 个（${s.tianfuList.join('、')}）`);

  console.log('\n近三年推演：');
  for (const y of [1984, 2024, 2026]) {
    const g = yearToGanzhi(y);
    const r = computeYear(g.gan, g.zhi);
    console.log(`  ${y} ${r.ganzhi}：中运 ${r.yun}（${r.taiGuo}）｜司天 ${r.sitian}｜在泉 ${r.zaiquan}${r.tianfu ? '｜天符' : ''}`);
  }

  console.log('\n前 12 年（甲子—乙亥）：');
  for (const r of s.rows.slice(0, 12)) {
    console.log(`  ${r.ganzhi}｜运 ${r.yun}${r.taiGuo}｜司天 ${r.sitian}｜在泉 ${r.zaiquan}${r.tianfu ? '｜天符' : ''}`);
  }
  console.log('\n口径：推演只依据原文两条配属规则与天符定义；不评价运气学说的预测效力。');
  console.log('本输出为典籍规则推演，不构成任何预测或诊疗依据。');
}

if (require.main === module) main();
module.exports = { GAN, ZHI, YUN, SITIAN, ZAIQUAN, sixtyCycle, computeYear, yearToGanzhi, stats, qiElement };
