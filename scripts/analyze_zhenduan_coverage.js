#!/usr/bin/env node
/**
 * scripts/analyze_zhenduan_coverage.js
 *   病证覆盖分析：BZU 的「仅 1 证」病 × ICD-11 TM1 证候单元
 *
 * 问的是什么：
 *   教材给这 12 个病各配了 1 个证（如 不寐—心脾两虚证）。ICD-11 第 26 章（TM1）里
 *   有没有**这个证候单元**，还是只有名字相近的另一个证？
 *
 * 数据：
 *   standards/zhenduan/bzu.json     26 个 BZU 单元（18 病 / 16 证）
 *   standards/icd11/zh-names.json   TM1 472 条（其中英文含 pattern 的 254 条是真证候单元）
 *   data/icd11/entities.ndjson      13,960 实体（hasDefinition 字段；第 26 章实测 0 条有释义）
 *
 * 三档（写死，可复核）：
 *   ① same     去「证」后完全相同
 *   ② near     只有近名单元（contain / 最长公共子串 ≥2），**不是同一证**
 *   ③ missing  连近名都没有
 *
 * 输出：standards/zhenduan/coverage.json / coverage.md
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');
const ENT = path.join(ROOT, 'data', 'icd11', 'entities.ndjson');
const NEAR = path.join(ROOT, 'standards', 'zhenduan', 'near-judgements.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhenduan', 'coverage.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhenduan', 'coverage.md');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const NO_CODE = /\s*\d?[A-Z]{1,2}\d[A-Z0-9]*(?:\.\d+)?\s*$/;  // 尾部 ICD 码：CA00 / 7A00 / 8B20 / 5A11

/** 只看词面，不做同义归并（「湿热蕴结」≠「大肠湿热」），避免把不同证候算成命中 */
function norm(s) {
  return String(s || '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/\s/g, '')
    .replace(/证$/, '');
}

/** 近名不等于同证：逐条写清差在哪（病位/病性），不改判定 */
const NEAR_WHY = {
  脾胃气虚证: 'TM1 只有更宽的「气虚证 SE90」与「胃气虚证 SF7C」，没有「脾胃气虚证」——脾与胃在 TM1 是分开列的',
  肝气犯胃证: 'TM1 有「肝火犯胃证 SF5L」，病机是火不是气；「肝气犯胃」无对应单元',
  湿热蕴结证: 'TM1 的湿热按病位分列（湿热蕴脾 SF78 / 肝胆湿热 SF5A / 肝经湿热 SF5B / 大肠湿热 SF8G / 膀胱湿热 SF9G），无「蕴结」这类跨部位证名',
  风寒湿痹证: 'TM1 的寒湿/风寒都挂在脏腑上（寒湿困脾 SF7B / 风寒束肺 SF8C），没有「痹」这一层单元',
  痰湿阻肺证: 'TM1 有「痰浊阻肺 SF86」与「寒痰阻肺 SF85」，痰的性质不同（湿/浊/寒），不是同一证候',
};

function lcs(a, b) {
  let best = '';
  for (let i = 0; i < a.length; i += 1) {
    for (let j = i + 1; j <= a.length; j += 1) {
      const s = a.slice(i, j);
      if (s.length > best.length && b.includes(s)) best = s;
    }
  }
  return best;
}

function build() {
  const bzu = JSON.parse(fs.readFileSync(BZU, 'utf8'));
  const names = JSON.parse(fs.readFileSync(ZH, 'utf8')).names;
  const tm1 = names.filter((n) => n.module === 'TM1');
  const patterns = tm1.filter((n) => /pattern/i.test(n.en || ''));
  const disorders = tm1.filter((n) => !/pattern/i.test(n.en || ''));

  // 人工判定表：7 条近名的三选一（word-only / position / nature）
  const nearDoc = fs.existsSync(NEAR) ? JSON.parse(fs.readFileSync(NEAR, 'utf8')) : { entries: [] };
  const nearMap = new Map(nearDoc.entries.map((e) => [`${e.bing}|${e.zheng}`, e]));

  const ents = fs.readFileSync(ENT, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const ch26 = ents.filter((e) => String(e.chapterCode) === '26');
  const ch26WithDef = ch26.filter((e) => e.hasDefinition);

  const units = bzu.units.filter((u) => /^BZ-B\d+-Z\d+$/.test(u.bzu || ''));
  const byBing = new Map();
  for (const u of units) {
    const bing = String(u.bing || '').replace(NO_CODE, '').trim();
    if (!byBing.has(bing)) byBing.set(bing, []);
    byBing.get(bing).push({ zheng: String(u.zheng || '').trim(), bzu: u.bzu, code: u.code || '' });
  }

  const rows = [];
  for (const [bing, zhengs] of byBing) {
    const bz = zhengs[0];
    const zheng = bz.zheng;
    const nZ = norm(zheng);
    const nB = norm(bing);

    const dHit = disorders.filter((n) => norm(n.zh) === nB);
    const dLoose = dHit.length ? dHit : disorders.filter((n) => {
      const t = norm(n.zh);
      return t.length >= 2 && (t.includes(nB) || nB.includes(t));
    });
    const disorderMatch = dHit.length ? 'exact' : (dLoose.length ? 'contain' : 'none');

    let match;
    const exact = patterns.filter((n) => norm(n.zh) === nZ);
    const contain = patterns.filter((n) => {
      const t = norm(n.zh);
      return t.length >= 2 && (t.includes(nZ) || nZ.includes(t));
    });
    if (exact.length) match = { how: 'exact', hits: exact, shared: '' };
    else if (contain.length) match = { how: 'contain', hits: contain, shared: '' };
    else {
      const scored = patterns
        .map((n) => ({ n, s: lcs(nZ, norm(n.zh)) }))
        .filter((x) => x.s.length >= 2)
        .sort((a, b) => b.s.length - a.s.length);
      match = scored.length
        ? { how: 'keyword', hits: scored.slice(0, 3).map((x) => x.n), shared: scored[0].s }
        : { how: 'none', hits: [], shared: '' };
    }

    const tier = match.how === 'exact' ? 'same' : (match.how === 'none' ? 'missing' : 'near');
    rows.push({
      bing,
      zheng,
      bzuCode: bz.bzu,
      unitCount: zhengs.length,
      onlyOne: zhengs.length === 1,
      disorder: dLoose.slice(0, 3).map((n) => ({ code: n.code, zh: n.zh, en: n.en })),
      disorderMatch,
      patternMatch: {
        how: match.how,
        tier,
        why: tier === 'same' ? '' : (NEAR_WHY[zheng] || (tier === 'missing' ? 'TM1 里没有任何名称相近的证候单元' : '')),
        shared: match.shared,
        hits: match.hits.slice(0, 3).map((n) => ({ code: n.code, zh: n.zh, en: n.en })),
      },
      hasDefinition: false,
      judgement: (() => {
        const e = nearMap.get(`${bing}|${zheng}`);
        return e ? {
          id: e.id,
          verdict: e.judgement,
          why: e.why,
          consequence: e.consequence,
          nearest: e.tm1Nearest,
          textbookSide: e.textbookSide,
          tm1Side: e.tm1Side,
          positionDiff: e.positionDiff,
          natureDiff: e.natureDiff,
        } : null;
      })(),
    });
  }

  const one = rows.filter((r) => r.onlyOne);
  const tally = { exact: 0, contain: 0, keyword: 0, none: 0 };
  const tier = { same: 0, near: 0, missing: 0 };
  for (const r of one) {
    tally[r.patternMatch.how] += 1;
    tier[r.patternMatch.tier] += 1;
  }

  const nearRows = one.filter((r) => r.patternMatch.tier === 'near');
  const judged = nearRows.filter((r) => r.judgement);
  const byVerdict = { 'word-only': 0, position: 0, nature: 0 };
  for (const r of judged) byVerdict[r.judgement.verdict] += 1;

  return {
    generated: '2026-10-28',
    inputs: {
      bzu: { file: 'standards/zhenduan/bzu.json', sha256: sha(BZU) },
      zhNames: { file: 'standards/icd11/zh-names.json', sha256: sha(ZH), tm1: tm1.length, patterns: patterns.length },
      entities: { file: 'data/icd11/entities.ndjson', sha256: sha(ENT), total: ents.length, ch26: ch26.length, ch26WithDef: ch26WithDef.length },
    },
    method: {
      scope: 'BZU 26 单元 → 18 病；本分析聚焦「仅 1 证」的 12 个病',
      matchRules: [
        'exact：去「证」后完全相同',
        'contain：一方包含另一方（≥2 字）',
        'keyword：最长公共子串 ≥2 字（仅词面重合，不当等价）',
        'none：以上都不成立',
      ],
      whyNotSemantic: '不做同义归并：「湿热蕴结」与「大肠湿热」是两个证候，归并会把「近名」错算成「同名」',
      definitionLayer: '第 26 章在 entities.ndjson 里 hasDefinition 全为 false，故「有证候单元」≠「有释义」',
    },
    stat: {
      bing: byBing.size,
      units: units.length,
      onlyOne: one.length,
      tally,
      tier,
      withDisorder: one.filter((r) => r.disorderMatch === 'exact').length,
      disorderNear: one.filter((r) => r.disorderMatch === 'contain').map((r) => r.bing),
      noDisorder: one.filter((r) => r.disorderMatch === 'none').map((r) => r.bing),
      noUnit: tier.missing,
      nearJudged: judged.length,
      nearPending: nearRows.length - judged.length,
      byVerdict,
      ch26Entities: ch26.length,
      ch26WithDef: ch26WithDef.length,
    },
    rows: one,
    allBing: rows,
  };
}

function toMd(d) {
  const s = d.stat;
  const same = d.rows.filter((r) => r.patternMatch.tier === 'same');
  const near = d.rows.filter((r) => r.patternMatch.tier === 'near');
  const miss = d.rows.filter((r) => r.patternMatch.tier === 'missing');
  const L = [];
  L.push('# 中医诊断学 · 病证覆盖分析（「仅 1 证」的 12 个病 × ICD-11 TM1）');
  L.push('');
  L.push(`> 生成 ${d.generated} · BZU \`${d.inputs.bzu.sha256.slice(0, 12)}\` · TM1 ${d.inputs.zhNames.tm1} 条（证候单元 ${d.inputs.zhNames.patterns} 条）· 实体 ${d.inputs.entities.total} 条（第 26 章 ${s.ch26Entities} 条，其中有释义 **${s.ch26WithDef}** 条）`);
  L.push('');
  L.push('## 一、结论数字');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| BZU 单元 → 病 | ${s.units} → ${s.bing} |`);
  L.push(`| 「仅 1 证」的病 | **${s.onlyOne}** |`);
  L.push(`| ① TM1 有**同名**证候单元 | **${s.tier.same}** |`);
  L.push(`| ② 只有**近名**单元（不是同一证） | **${s.tier.near}** |`);
  L.push(`| ③ TM1 完全无对应单元 | **${s.tier.missing}** |`);
  L.push(`| ② 已人工判定 / 待人工 | **${s.nearJudged} / ${s.nearPending}** |`);
  L.push(`| └ 判定分布（词面近似 · 病位不同 · 病性不同） | ${s.byVerdict['word-only']} · ${s.byVerdict.position} · ${s.byVerdict.nature} |`);
  L.push(`| 病名在 TM1 有**同名**实体 | ${s.withDisorder} / ${s.onlyOne} |`);
  L.push(`| 病名只有**近名**实体（${s.disorderNear.join('、') || '—'}） | ${s.disorderNear.length} |`);
  L.push(`| 病名在 TM1 找不到（${s.noDisorder.join('、') || '—'}） | ${s.noDisorder.length} |`);
  L.push(`| 第 26 章有释义的实体 | **${s.ch26WithDef} / ${s.ch26Entities}** |`);
  L.push('');
  L.push('## 二、逐病对照');
  L.push('');
  L.push('| 病 | BZU 证 | 证数 | TM1 病实体 | TM1 证候单元 | 档 | 匹配方式 |');
  L.push('|---|---|--:|---|---|---|---|');
  for (const r of d.rows) {
    const dz = (r.disorder.map((x) => `${x.code} ${x.zh}`).join('；') || '—')
      + (r.disorderMatch === 'exact' ? '（同名）' : r.disorderMatch === 'contain' ? '（近名）' : '');
    const pz = r.patternMatch.hits.map((x) => `${x.code} ${x.zh}`).join('；') || '**无**';
    const tierName = { same: '① 同名', near: '② 近名', missing: '③ 无' }[r.patternMatch.tier];
    const how = r.patternMatch.how + (r.patternMatch.shared ? `（重合「${r.patternMatch.shared}」）` : '');
    L.push(`| ${r.bing} | ${r.zheng} | ${r.unitCount} | ${dz} | ${pz} | ${tierName} | ${how} |`);
  }
  L.push('');
  L.push(`## 三、① 同名单元（${same.length} 个）`);
  L.push('');
  for (const r of same) {
    const h = r.patternMatch.hits[0];
    L.push(`- **${r.bing} — ${r.zheng}** → \`${h.code}\` ${h.zh}（TM1 题名：${h.en}）`);
  }
  L.push('');
  L.push('> 「同名」只说明两套体系用了同一个名字，不说明判读标准一致；且 TM1 无释义（见第五节），引用时只能引题名。');
  L.push('');
  L.push(`## 四、② 近名但不同证（${near.length} 个，不能自动映射）`);
  L.push('');
  const VNAME = { 'word-only': '仅词面相近', position: '病位不同', nature: '病性不同' };
  L.push('| 病 | BZU 证 | 人工判定 | 判定所据的 TM1 单元 | 词面候选（自动） | 差在哪 |');
  L.push('|---|---|---|---|---|---|');
  for (const r of near) {
    const j = r.judgement;
    const v = j ? `**${VNAME[j.verdict]}**（${j.id}）` : '待人工';
    const near1 = j && j.nearest ? `${j.nearest.code} ${j.nearest.zh}` : '—';
    const auto = r.patternMatch.hits.map((x) => `${x.code} ${x.zh}`).join('；');
    L.push(`| ${r.bing} | ${r.zheng} | ${v} | ${near1} | ${auto} | ${j && j.why ? j.why : r.patternMatch.why} |`);
  }
  L.push('');
  L.push(`判定表：\`standards/zhenduan/near-judgements.json\`（7 条，逐条给教材侧/ TM1 侧的病位与病性、判定、后果）。`);
  L.push('');
  if (miss.length) {
    L.push(`## 五、③ 完全没有对应单元（${miss.length} 个）`);
    L.push('');
    for (const r of miss) L.push(`- ${r.bing} — ${r.zheng}（${r.bzuCode}）`);
    L.push('');
  } else {
    L.push('## 五、③ 完全没有对应单元：0 个');
    L.push('');
    L.push('**这一档是 0——与预期相反。** 12 个「仅 1 证」的病，证名都能在 TM1 找到同名或近名单元，');
    L.push('所以「ICD-11 里没有对应证候单元」这个假说，在这 12 个病上**不成立**。缺口不在「有没有单元」，而在下面两条：');
    L.push('');
    L.push(`1. **${near.length} 个证只是近名**（痰湿阻肺 vs 痰浊阻肺、肝气犯胃 vs 肝火犯胃、湿热蕴结 vs 湿热蕴脾…），近名不能当同证用；`);
    L.push(`2. **TM1 ${s.ch26Entities} 条实体没有一条有释义**，所以「单元存在」推不到「定义存在」。`);
    L.push('');
  }
  L.push('## 六、病名侧：同名 / 近名 / 无');
  L.push('');
  L.push(`- **同名**（${s.withDisorder}）：可直接用 TM1 码指这个病`);
  L.push(`- **仅近名**（${s.disorderNear.length}）：${s.disorderNear.join('、') || '—'}——TM1 里只有更长/更短的类目（如「其他特指的头痛」），不是同一个立项`);
  L.push(`- **完全找不到**（${s.noDisorder.length}）：${s.noDisorder.join('、') || '—'}`);
  L.push('');
  L.push('这不是「ICD-11 没有这些病」（它们可能以别的名字或西医码存在），而是「TM1 第 26 章没有用这个中文名立项」；引用时不能拿别处的码替代病名。');
  L.push('');
  L.push('## 七、口径与边界');
  L.push('');
  L.push(`- ${d.method.scope}`);
  L.push('- 匹配规则（写死，可复核）：');
  for (const r of d.method.matchRules) L.push(`  - ${r}`);
  L.push(`- ${d.method.whyNotSemantic}`);
  L.push(`- ${d.method.definitionLayer}`);
  L.push('- 词面命中不等于临床等价；近名档（②）必须人工判定，本仓库不做自动映射。');
  L.push('- 本分析只覆盖「仅 1 证」的 12 个病；18 病全量对照见 `coverage.json` 的 `allBing`。');
  return L.join('\n') + '\n';
}

function main() {
  const d = build();
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_JSON)) {
      console.log('[coverage] ✗ 缺 coverage.json');
      return 1;
    }
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const bad = [];
    if (prev.inputs.bzu.sha256 !== d.inputs.bzu.sha256) bad.push('bzu.json 变了');
    if ((prev.stat.nearJudged || 0) !== d.stat.nearJudged) bad.push(`近名已判定 ${prev.stat.nearJudged} → ${d.stat.nearJudged}`);
    if (prev.stat.onlyOne !== d.stat.onlyOne) bad.push(`仅1证 ${prev.stat.onlyOne} → ${d.stat.onlyOne}`);
    for (const k of Object.keys(d.stat.tier)) {
      if ((prev.stat.tier[k] || 0) !== d.stat.tier[k]) bad.push(`tier ${k} ${prev.stat.tier[k]} → ${d.stat.tier[k]}`);
    }
    if (bad.length) {
      console.log('[coverage] ✗ ' + bad.join('；'));
      return 1;
    }
    const t = d.stat.tier;
    console.log(`[coverage] ✓ 12 病：同名 ${t.same} · 近名 ${t.near} · 无单元 ${t.missing}`);
    return 0;
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(d, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(d));
  const s = d.stat;
  console.log('═══ 病证覆盖分析 ═══');
  console.log(`  仅 1 证的病 ${s.onlyOne} 个：同名 ${s.tier.same} · 近名 ${s.tier.near}（已判定 ${s.nearJudged} / 待人工 ${s.nearPending}）· 无单元 ${s.tier.missing}`);
  console.log(`  TM1 有释义实体 ${s.ch26WithDef}/${s.ch26Entities}；病名 同名 ${s.withDisorder} · 近名 ${s.disorderNear.join('、') || '—'} · 无 ${s.noDisorder.join('、') || '—'}`);
  for (const r of d.rows) {
    console.log(`    ${r.bing.padEnd(4)} ${r.zheng.padEnd(7)} ${r.patternMatch.tier.padEnd(7)} ${r.patternMatch.how}${r.patternMatch.shared ? '(' + r.patternMatch.shared + ')' : ''}`);
  }
  console.log('  → standards/zhenduan/coverage.{json,md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, toMd, norm, lcs, NEAR_WHY };
