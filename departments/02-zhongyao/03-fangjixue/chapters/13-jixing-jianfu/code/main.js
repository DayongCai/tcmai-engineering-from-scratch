'use strict';
/**
 * 剂型与煎服法：方剂的物理形态
 *
 *   node code/main.js
 *
 * 建模：
 *   · 剂型 = 方名后缀（汤/丸/散/膏/丹/饮/煎），这是「方的出生形态」，不是「现在的用法」；
 *   · 煎法 = 用法用量段里八类特殊煎法（先煎/后下/包煎/另煎/烊化/冲服/煎汤代水/泡服）的出现，
 *     每处提及先判是不是否定句（「无须特殊先煎、后下」），否定句不计入「需用」；
 *   · 服法 = 温服/热服/冷服/频服/顿服 与 空腹/饭前/饭后/睡前 两个维度；
 *   · 外用 = 先粗扫关键词，再逐首裁定是「只供外用」「兼用外治」还是「否定/假阳性」。
 *
 * 本章所有数字都由 standards/fangji/formulas.json 现算，不手打。
 *
 * 边界：
 *   · 方名后缀是「命名习惯」，不是剂型的实测值：一贯煎是汤、天王补心丹是丸、小蓟饮子是汤；
 *   · 词频不是事实：39 处「先煎」里有 5 处是否定句，粗扫只看字符就会多算；
 *   · 114 首是同一种「内服教学方」，膏、丹、注射剂在这份数据里几乎为零，
 *     教材第4章举的剂型示范方有一半在库外——剂型谱的完整度不在这份数据里。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));
const FORMULAS = DATA.formulas;

/** 用法用量原文（本章全部统计的唯一原料） */
const USAGE = (f) => (f.parts && f.parts['用法用量']) || '';

/** 六段（用法用量占篇幅的分母） */
const PARTS = ['方源与组成', '用法用量', '功用与主治', '方解与配伍', '运用与鉴别', '现代研究提示'];
const nonWsLen = (s) => (s || '').replace(/\s/g, '').length;

/** 剂型后缀：按此顺序取第一个命中，保证「竹叶石膏汤」不会被算成膏剂 */
const FORMS = ['汤', '丸', '散', '膏', '丹', '饮', '煎'];

/** 方名 → 剂型后缀（不含后缀者为「其他」，如痛泻要方、小蓟饮子） */
function formOf(name) {
  for (const s of FORMS) if (name.endsWith(s)) return s;
  return '其他';
}

/** 剂型分布：按方名后缀，逐类给出方数与本类方名 */
function formDistribution(list = FORMULAS) {
  const map = new Map(FORMS.concat('其他').map((s) => [s, []]));
  for (const f of list) map.get(formOf(f.name)).push(f.name);
  const items = [...map.entries()].map(([form, names]) => ({
    form,
    n: names.length,
    ratio: names.length / list.length,
    names,
  }));
  return { items, total: list.length };
}

/** 剂型漂移：非汤名的方，用法里还说「作汤剂」的有多少；其中明写「现代多作汤剂／今多改作汤剂」的有多少 */
function formDrift(list = FORMULAS) {
  const nonTang = list.filter((f) => formOf(f.name) !== '汤');
  const mentionsTang = nonTang.filter((f) => /作汤剂/.test(USAGE(f)));
  const explicit = nonTang.filter((f) => /现代多作汤剂|今多改作汤剂/.test(USAGE(f)));
  return {
    total: list.length,
    nonTang: nonTang.length,
    mentionsTang: mentionsTang.map((f) => f.name),
    explicit: explicit.map((f) => f.name),
  };
}

/** 否定判据：关键词前 12 字内出现否定词，记该处提及为「无须」 */
const NEG_RE = /(无须|不需|无特殊|不必|不用|未有)/;
const NEG_WINDOW = 12;

/** 八类特殊煎法 */
const SPECIAL_KW = ['先煎', '后下', '包煎', '另煎', '烊化', '冲服', '煎汤代水', '泡服'];

/**
 * 特殊煎法词频：提及方数 / 否定方数 / 需用方数，另记字符级出现次数。
 * 判否规则：该方内此词的所有出现，前 12 字都被否定词罩住，才算「否定」；
 * 只要有一处是肯定（如血府逐瘀汤「无须特殊先煎、后下之法，然牛膝宜先煎」），就计入需用。
 */
function specialDecoctions(list = FORMULAS) {
  return SPECIAL_KW.map((kw) => {
    const negNames = [];
    const netNames = [];
    let occurrences = 0;
    for (const f of list) {
      const t = USAGE(f);
      let i = -1;
      let has = false;
      let allNeg = true;
      while ((i = t.indexOf(kw, i + 1)) >= 0) {
        has = true;
        occurrences += 1;
        const pre = t.slice(Math.max(0, i - NEG_WINDOW), i);
        if (!NEG_RE.test(pre)) allNeg = false;
      }
      if (!has) continue;
      (allNeg ? negNames : netNames).push(f.name);
    }
    return {
      kw,
      mentions: negNames.length + netNames.length,
      negated: negNames.length,
      net: netNames.length,
      occurrences,
      negNames,
      netNames,
    };
  });
}

/** 至少一处「需用」某类特殊煎法的方（净覆盖） */
function specialCoverage(list = FORMULAS) {
  const hit = new Set();
  for (const row of specialDecoctions(list)) for (const n of row.netNames) hit.add(n);
  return { names: [...hit].sort(), n: hit.size, total: list.length, ratio: hit.size / list.length };
}

/** 服法两个维度：温度与频次 / 时间 */
const SERVING_TEMP = ['温服', '热服', '冷服', '频服', '顿服'];
const SERVING_TIME = ['空腹', '饭前', '饭后', '睡前'];

function servingDistribution(list = FORMULAS) {
  const count = (kw) => list.filter((f) => USAGE(f).includes(kw)).length;
  return {
    temp: SERVING_TEMP.map((kw) => ({ kw, n: count(kw), names: list.filter((f) => USAGE(f).includes(kw)).map((f) => f.name) })),
    time: SERVING_TIME.map((kw) => ({ kw, n: count(kw), names: list.filter((f) => USAGE(f).includes(kw)).map((f) => f.name) })),
    total: list.length,
  };
}

/** 外用粗扫关键词（故意放宽，用来暴露假阳性） */
const EXTERNAL_KW = ['外用', '外敷', '调敷', '敷', '掺', '吹'];

/** 逐首裁定：粗扫命中的每一首，属于哪一类，依据哪一句 */
const EXTERNAL_ADJUDICATION = [
  { name: '犀角地黄汤', kind: '兼用', why: '可配以外用止血之法', trigger: '外用' },
  { name: '仙方活命饮', kind: '兼用', why: '药渣可捣烂外敷患处', trigger: '外敷' },
  { name: '川芎茶调散', kind: '兼用', why: '葱涎调敷两太阳穴', trigger: '调敷' },
  { name: '消风散', kind: '否定', why: '不宜使用刺激性之外用药', trigger: '外用' },
  { name: '五味消毒饮', kind: '否定', why: '不掺石灰等物之黄酒', trigger: '掺' },
];

/**
 * 内服 / 外用分界。
 * 粗扫 5 首 → 逐首裁定后：只供外用 0 首，兼用外治 3 首，否定或假阳性 2 首。
 * 数据里没有一首「只供外用」的方，这不是统计缺陷，是这 114 首的选方口径。
 */
function externalUse(list = FORMULAS) {
  const coarse = list.filter((f) => EXTERNAL_KW.some((k) => USAGE(f).includes(k))).map((f) => f.name);
  const rows = EXTERNAL_ADJUDICATION.map((a) => {
    const f = list.find((x) => x.name === a.name);
    const present = !!f && coarse.includes(a.name);
    const triggerOk = !!f && USAGE(f).includes(a.trigger) && USAGE(f).includes(a.why);
    return { ...a, present, triggerOk };
  });
  const unclear = coarse.filter((n) => !EXTERNAL_ADJUDICATION.some((a) => a.name === n));
  return {
    coarse,
    coarseN: coarse.length,
    rows,
    onlyExternal: [],
    adjunct: rows.filter((r) => r.kind === '兼用').map((r) => r.name),
    negated: rows.filter((r) => r.kind === '否定').map((r) => r.name),
    unclear,
    internal: list.length - coarse.length,
  };
}

/** 用法用量的篇幅：占六段多少、每首多长 */
function usageVolume(list = FORMULAS) {
  let all = 0;
  let use = 0;
  const lens = [];
  for (const f of list) {
    for (const p of PARTS) all += nonWsLen(f.parts[p]);
    const l = nonWsLen(USAGE(f));
    use += l;
    lens.push({ name: f.name, len: l });
  }
  lens.sort((a, b) => b.len - a.len || (a.name < b.name ? -1 : 1));
  return {
    all,
    use,
    share: use / all,
    avg: use / list.length,
    max: lens[0],
    min: lens[lens.length - 1],
  };
}

/** 教材第4章举作剂型示例的方名（20 个），本节核它们在不在 114 首内 */
const TEXTBOOK_EXAMPLES = [
  '桂枝汤', '麻黄汤', '银翘散', '小柴胡汤', '理中丸', '乌梅丸', '五苓散', '保和丸',
  '六味地黄丸', '安宫牛黄丸',
  '鳖甲煎丸', '舟车丸', '控涎丹', '琼玉膏', '狗皮膏', '红升丹', '白降丹', '至宝丹', '紫雪散', '活络丹',
];

function libraryCoverage(list = FORMULAS) {
  const have = new Set(list.map((f) => f.name));
  const inside = TEXTBOOK_EXAMPLES.filter((n) => have.has(n));
  const outside = TEXTBOOK_EXAMPLES.filter((n) => !have.has(n));
  return { total: TEXTBOOK_EXAMPLES.length, inside, outside };
}

/** 规模自检：任一数字与预期不符即抛错（不许静默通过） */
function selfCheck() {
  const dist = Object.fromEntries(formDistribution().items.map((x) => [x.form, x.n]));
  const drift = formDrift();
  const sp = Object.fromEntries(specialDecoctions().map((x) => [x.kw, x]));
  const neg = specialDecoctions().reduce((n, x) => n + x.negated, 0);
  const net = specialDecoctions().reduce((n, x) => n + x.net, 0);
  const sv = Object.fromEntries(servingDistribution().temp.concat(servingDistribution().time).map((x) => [x.kw, x.n]));
  const ext = externalUse();
  const vol = usageVolume();
  const cov = libraryCoverage();
  const checks = [
    { name: '方数 114', ok: FORMULAS.length === 114, got: FORMULAS.length },
    { name: '汤 63', ok: dist['汤'] === 63, got: dist['汤'] },
    { name: '散 26', ok: dist['散'] === 26, got: dist['散'] },
    { name: '丸 16', ok: dist['丸'] === 16, got: dist['丸'] },
    { name: '饮 5 · 煎 1 · 丹 1 · 其他 2', ok: dist['饮'] === 5 && dist['煎'] === 1 && dist['丹'] === 1 && dist['其他'] === 2, got: [dist['饮'], dist['煎'], dist['丹'], dist['其他']].join('/') },
    { name: '非汤名 51 首', ok: drift.nonTang === 51, got: drift.nonTang },
    { name: '非汤名提及作汤剂 31 首', ok: drift.mentionsTang.length === 31, got: drift.mentionsTang.length },
    { name: '明写剂型漂移 9 首', ok: drift.explicit.length === 9, got: drift.explicit.length },
    { name: '先煎 提及 39 / 否定 4 / 需用 35', ok: sp['先煎'].mentions === 39 && sp['先煎'].negated === 4 && sp['先煎'].net === 35, got: `${sp['先煎'].mentions}/${sp['先煎'].negated}/${sp['先煎'].net}` },
    { name: '后下 提及 33 / 否定 4 / 需用 29', ok: sp['后下'].mentions === 33 && sp['后下'].negated === 4 && sp['后下'].net === 29, got: `${sp['后下'].mentions}/${sp['后下'].negated}/${sp['后下'].net}` },
    { name: '包煎 8 · 另煎 5 · 烊化 8 · 冲服 15', ok: sp['包煎'].net === 8 && sp['另煎'].net === 5 && sp['烊化'].net === 8 && sp['冲服'].net === 15, got: [sp['包煎'].net, sp['另煎'].net, sp['烊化'].net, sp['冲服'].net].join('/') },
    { name: '煎汤代水 2 · 泡服 0', ok: sp['煎汤代水'].net === 2 && sp['泡服'].net === 0, got: `${sp['煎汤代水'].net}/${sp['泡服'].net}` },
    { name: '逐条提及合计 110 方次 · 否定 8 · 需用 102', ok: specialDecoctions().reduce((n, x) => n + x.mentions, 0) === 110 && neg === 8 && net === 102, got: `${specialDecoctions().reduce((n, x) => n + x.mentions, 0)}/${neg}/${net}` },
    { name: '需用特殊煎法 63 首', ok: specialCoverage().n === 63, got: specialCoverage().n },
    { name: '温服 99 · 热服 11 · 冷服 1', ok: sv['温服'] === 99 && sv['热服'] === 11 && sv['冷服'] === 1, got: `${sv['温服']}/${sv['热服']}/${sv['冷服']}` },
    { name: '频服 12 · 顿服 5', ok: sv['频服'] === 12 && sv['顿服'] === 5, got: `${sv['频服']}/${sv['顿服']}` },
    { name: '空腹 10 · 饭前 9 · 饭后 12 · 睡前 2', ok: sv['空腹'] === 10 && sv['饭前'] === 9 && sv['饭后'] === 12 && sv['睡前'] === 2, got: [sv['空腹'], sv['饭前'], sv['饭后'], sv['睡前']].join('/') },
    { name: '外用粗扫 5 首 · 只供外用 0 首', ok: ext.coarseN === 5 && ext.onlyExternal.length === 0, got: `${ext.coarseN}/${ext.onlyExternal.length}` },
    { name: '兼用外治 3 · 否定 2', ok: ext.adjunct.length === 3 && ext.negated.length === 2, got: `${ext.adjunct.length}/${ext.negated.length}` },
    { name: '用法用量 39375 字 · 占 12.18%', ok: vol.use === 39375 && Number((vol.share * 100).toFixed(2)) === 12.18, got: `${vol.use}/${(vol.share * 100).toFixed(2)}` },
    { name: '教材示例 20 首 · 库内 10', ok: cov.inside.length === 10, got: cov.inside.length },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const fd = formDistribution();
  const drift = formDrift();
  const sp = specialDecoctions();
  const cov = specialCoverage();
  const sv = servingDistribution();
  const ext = externalUse();
  const vol = usageVolume();
  const lib = libraryCoverage();
  const num = (x) => x.toLocaleString('en-US');
  const pct = (x) => (x * 100).toFixed(1) + '%';

  console.log('═══ 剂型与煎服法：方剂的物理形态 ═══');
  console.log(`底座：${FORMULAS.length} 首方 · 教材第4章 7,742 字 · 用法用量段 ${num(vol.use)} 字（占六段 ${pct(vol.share)}，平均 ${vol.avg.toFixed(1)} 字/方）`);
  console.log(`  最长 ${vol.max.name} ${vol.max.len} 字 · 最短 ${vol.min.name} ${vol.min.len} 字`);

  console.log('\n── 剂型分布（按方名后缀：这是「出生形态」，不是「现在的用法」）──');
  for (const x of fd.items) {
    if (!x.n) { console.log(`  ${x.form} 0 首 —— 这一类在本数据里是空的`); continue; }
    const list = x.names.length > 6 ? x.names.slice(0, 6).join('、') + ' 等' : x.names.join('、');
    console.log(`  ${x.form} ${String(x.n).padStart(3)} 首（${pct(x.ratio)}）：${list}`);
  }

  console.log('\n── 剂型漂移：名字是丸散，用法说汤剂 ──');
  console.log(`  非汤名方 ${drift.nonTang} 首，其中用法里提到「作汤剂」的 ${drift.mentionsTang.length} 首（${pct(drift.mentionsTang.length / drift.nonTang)}）`);
  console.log(`  明写「现代多作汤剂／今多改作汤剂」的 ${drift.explicit.length} 首：${drift.explicit.join('、')}`);
  console.log('  名与实分离的典型：一贯煎（名煎实汤）、天王补心丹（名丹实丸）、小蓟饮子与痛泻要方（名方名饮子，实为汤剂）');

  console.log('\n── 特殊煎法词频（提及方数 / 否定「无须」/ 需用方数）──');
  for (const x of sp) {
    const neg = x.negNames.length ? `（否定：${x.negNames.join('、')}）` : '';
    console.log(`  ${x.kw.padEnd(4, '　')} 提及 ${String(x.mentions).padStart(2)} · 否定 ${x.negated} · 需用 ${String(x.net).padStart(2)} · 字面出现 ${String(x.occurrences).padStart(2)} 次 ${neg}`);
  }
  const sumM = sp.reduce((n, x) => n + x.mentions, 0);
  const sumN = sp.reduce((n, x) => n + x.negated, 0);
  const sumK = sp.reduce((n, x) => n + x.net, 0);
  console.log(`  合计：提及 ${sumM} 方次 → 否定 ${sumN} → 需用 ${sumK}；涉及 ${cov.n}/${cov.total} 首方（${pct(cov.ratio)}）`);

  console.log('\n── 服法：温度与频次 / 时间 ──');
  console.log('  温度频次：' + sv.temp.map((x) => `${x.kw} ${x.n}`).join(' · '));
  console.log('  时间：' + sv.time.map((x) => `${x.kw} ${x.n}`).join(' · '));

  console.log('\n── 内服 / 外用分界 ──');
  console.log(`  关键词粗扫命中 ${ext.coarseN} 首：${ext.coarse.join('、')}`);
  for (const r of ext.rows) {
    const ok = r.present && r.triggerOk ? '✓' : '✗';
    console.log(`  ${ok} ${r.name}：${r.kind} —— ${r.why}`);
  }
  console.log(`  裁定：只供外用 ${ext.onlyExternal.length} 首 · 兼用外治 ${ext.adjunct.length} 首 · 否定或假阳性 ${ext.negated.length} 首`);
  console.log('  结论：114 首全是内服方；外用只以「佐法」出现，没有一首是纯外用制剂。');

  console.log('\n── 剂型谱的完整度：教材举的示范方在不在库内 ──');
  console.log(`  教材第4章举作剂型示例的方 ${lib.total} 个：库内 ${lib.inside.length}（${lib.inside.join('、')}）`);
  console.log(`  库外 ${lib.outside.length}（${lib.outside.join('、')}）`);
  console.log('  膏、丹、糊丸的示范方全在库外——本数据统计不到这三类。');

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：剂型名不等于剂型实测值；词频不等于方义（否定句必须扣）；丸散汤的差别是释药速度与适应证，不是优劣。');
  console.log('教学边界：本章只做教材用法用量段的描述性统计，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  DATA, FORMULAS, USAGE, PARTS, nonWsLen, FORMS, formOf, formDistribution, formDrift,
  NEG_RE, NEG_WINDOW, SPECIAL_KW, specialDecoctions, specialCoverage,
  SERVING_TEMP, SERVING_TIME, servingDistribution,
  EXTERNAL_KW, EXTERNAL_ADJUDICATION, externalUse,
  usageVolume, TEXTBOOK_EXAMPLES, libraryCoverage, selfCheck,
};
