#!/usr/bin/env node
/**
 * scripts/align_zhenduan_icd.js —— 中医诊断学 BZU 病码 × 仓库 ICD-11 术语层对账
 *
 * 为什么要对：
 *   standards/zhenduan/bzu.json 里 15 条病带 ICD-11 码（CA00、MD12、MB51…），
 *   这些码是教材表里写的，**本仓库从未验证过它们与 ICD-11 实体是否对得上**。
 *   仓库里有 standards/icd11/definitions-en.json（2,394 条，含 chapter）与
 *   standards/icd11/zh-names.json（1,120 条 TM1/TM2 中文名），足够做一次「码→实体」对账。
 *
 * 判定分四档（判定依据写进 icd-align.json 的 judgements，可逐条复核）：
 *   ok        题名与病名指向同一实体（或公认同义，如感冒/common cold）
 *   narrow    题名是更窄/更宽的一类（如 哮病/Asthma 不含喘）
 *   conflict  题名与病名指向不同实体（如 眩晕 配 Diplegia of upper extremities）
 *   missing   码在 definitions-en.json 里没有条目
 *
 * 输出：
 *   standards/zhenduan/icd-align.json  逐条判定 + 统计（错配率 = (conflict + missing) / 带码条目）
 *   standards/zhenduan/icd-align.md    人读版
 *
 * 用法：
 *   node scripts/align_zhenduan_icd.js
 *   node scripts/align_zhenduan_icd.js --check   # 与留档比对，码表或词表层一变即报错
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const DEFS = path.join(ROOT, 'standards', 'icd11', 'definitions-en.json');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.md');

/**
 * 人工判定表（本仓库对 15 条带码病逐个比对英文题名后给出；判据只看题名，不看定义正文）。
 * 这张表是「判定」，不是「原文」——改它要连带改 reason。
 */
const JUDGEMENTS = {
  CA00: { verdict: 'ok', reason: 'Acute nasopharyngitis = 急性鼻咽炎；感冒的现代对应即普通感冒，可接受' },
  MD12: { verdict: 'narrow', reason: 'Cough 是症状（咳嗽），教材「咳嗽」为病名；症状当病名用，需注明口径' },
  CA23: { verdict: 'narrow', reason: 'Asthma 覆盖面含喘；教材「哮病」与「喘证」分列，Asthma 对应的是哮' },
  MD11: { verdict: 'conflict', reason: 'Abnormalities of breathing 是「呼吸异常」大类，不是「喘证」；喘证应落在具体呼吸困难的类目' },
  MC81: { verdict: 'narrow', reason: 'Abnormalities of heart beat 是体征类（心律异常），心悸是症状；层级不同' },
  BA40: { verdict: 'missing', reason: '码在 definitions-en.json 无条目（胸痹在 TM1 里的码不是 BA40，需回 WHO 表核对）' },
  MB51: { verdict: 'conflict', reason: 'Diplegia of upper extremities = 双上肢瘫，与「眩晕」无关；镜象里 Dizziness or giddiness = MB48，才是对得上的码', suggested: 'MB48' },
  MD90: { verdict: 'conflict', reason: 'Nausea or vomiting = 恶心呕吐，与「胃脘痛」不是同一实体' },
  ME08: { verdict: 'conflict', reason: 'Flatulence = 腹胀气，与「呕吐」不同' },
  ME05: { verdict: 'narrow', reason: 'Change in bowel habit = 排便习惯改变，与「泄泻」相关但不等于腹泻' },
  ME06: { verdict: 'missing', reason: '码在 definitions-en.json 无条目' },
  MG27: { verdict: 'conflict', reason: 'Haemorrhage, not elsewhere classified = 出血，与「水肿」无关' },
  GC00: { verdict: 'narrow', reason: 'Cystitis = 膀胱炎；「淋证」范围更大（含石淋、膏淋等），只覆盖湿热淋一类' },
  ME83: { verdict: 'conflict', reason: 'Rheumatism, unspecified = 风湿病，与「腰痛」不是同一实体（腰痛应落 low back pain）' },
};

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function load() {
  const bzu = JSON.parse(fs.readFileSync(BZU, 'utf8'));
  const defs = JSON.parse(fs.readFileSync(DEFS, 'utf8')).entries;
  const zh = JSON.parse(fs.readFileSync(ZH, 'utf8')).names;
  return { bzu, defs, zh };
}

function codeOf(s) {
  const m = String(s || '').match(/[A-Z]{2}\d{2}(?:\.\d+)?/);
  return m ? m[0] : '';
}

function build() {
  const { bzu, defs, zh } = load();
  const zhByCode = new Map(zh.map((n) => [n.code, n]));

  // 病行：ICD 命名表里带 ICD-11 码的行（正则 [A-Z]{2}\d{2}）；平台自造的 B1…/平台证码 无 icd 码，自然落空
  const rows = bzu.icd
    .map((r) => ({ ...r, code: codeOf(r.icd) }))
    .filter((r) => r.code);

  const items = rows.map((r) => {
    const ent = defs[r.code];
    const z = zhByCode.get(r.code);
    const j = JUDGEMENTS[r.code] || { verdict: 'unjudged', reason: '未在判定表内' };
    return {
      platformCode: String(r.code || ''),
      name: r.name,
      icd: r.code,
      icdTitle: ent ? ent.title : '',
      icdChapter: ent ? String(ent.chapter) : '',
      zhName: z ? z.zh : '',
      zhModule: z ? z.module : '',
      verdict: j.verdict,
      reason: j.reason,
      ...(j.suggested ? { suggested: j.suggested } : {}),
      sourceStatus: r.status || '',
    };
  });

  // 统计
  const stat = { total: items.length, ok: 0, narrow: 0, conflict: 0, missing: 0, unjudged: 0 };
  for (const it of items) stat[it.verdict] = (stat[it.verdict] || 0) + 1;
  stat.misaligned = stat.conflict + stat.missing;
  stat.misalignRate = stat.total ? stat.misaligned / stat.total : 0;
  stat.inDefinitions = items.filter((i) => i.icdTitle).length;
  stat.inTmZhNames = items.filter((i) => i.zhName).length;

  // 章分布：看这些码落到哪些 ICD-11 章
  const chapters = {};
  for (const it of items) {
    const k = it.icdChapter || 'MISSING';
    chapters[k] = (chapters[k] || 0) + 1;
  }

  return {
    generated: new Date().toISOString().slice(0, 10),
    inputs: {
      bzu: { file: 'standards/zhenduan/bzu.json', sha256: sha256(BZU) },
      definitions: { file: 'standards/icd11/definitions-en.json', sha256: sha256(DEFS), entries: Object.keys(defs).length },
      zhNames: { file: 'standards/icd11/zh-names.json', sha256: sha256(ZH), entries: zh.length },
    },
    method: {
      step1: '取 bzu.json 中带 ICD-11 码的病行（正则 [A-Z]{2}\\d{2}）',
      step2: '在 definitions-en.json 查该码；查不到记 missing',
      step3: '在 zh-names.json 查中文名与 module（TM1/TM2）；中医病名多不在 TM1，故该项只作参考',
      step4: '按题名与本仓库判定表给 ok/narrow/conflict；判定只看题名，不看定义正文',
      misalignRate: '(conflict + missing) / 带码条目',
    },
    limits: [
      '这是「码↔题名」层面对账，不是「临床等价」判断：ok 只表示名字对得上，不表示教材的病与 ICD-11 的实体是同一诊断标准',
      'zh-names.json 只有 TM1/TM2 两模块（472 + 648），西医章的码（CA/MD/MB/ME/MC/MG/GC）本来就不在其中，所以 inTmZhNames=0 不代表码错',
      '判定表由本仓库逐条人判，judgements 可复核；不得据此改教材或 bzu 码值',
      'definitions-en.json 只有 2,394 条（非 MMS 全量），所以只能证明「给出的码指向别的东西」，不能对每条都给正确码；suggested 只在镜象里确有对应条目时才写',
    ],
    chapters,
    stat,
    items,
  };
}

function toMd(doc) {
  const L = [];
  L.push('# 中医诊断学 BZU 病码 × ICD-11 术语层对账\n');
  L.push(`> 生成：${doc.generated} · 输入：bzu.json \`${doc.inputs.bzu.sha256.slice(0, 12)}\` / definitions-en ${doc.inputs.definitions.entries} 条 / zh-names ${doc.inputs.zhNames.entries} 条\n`);
  const s = doc.stat;
  L.push('## 一、结论数字\n');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| 带 ICD-11 码的病行 | ${s.total} |`);
  L.push(`| ok（题名对得上） | ${s.ok} |`);
  L.push(`| narrow（范围不等） | ${s.narrow} |`);
  L.push(`| **conflict（指向不同实体）** | **${s.conflict}** |`);
  L.push(`| **missing（库中无此条目）** | **${s.missing}** |`);
  L.push(`| **错配率 = (conflict+missing)/总数** | **${(s.misalignRate * 100).toFixed(1)}%** |`);
  L.push(`| 在 definitions-en 有定义 | ${s.inDefinitions} |`);
  L.push(`| 在 zh-names（TM1/TM2）有中文名 | ${s.inTmZhNames} |`);
  L.push('');
  L.push('## 二、逐条判定\n');
  L.push('| 平台码 | 病名 | ICD 码 | 题名 | 章 | 判定 | 依据 | 建议码 |');
  L.push('|---|---|---|---|--:|---|---|---|');
  for (const it of doc.items) {
    L.push(`| ${it.platformCode} | ${it.name} | ${it.icd} | ${it.icdTitle || '（无条目）'} | ${it.icdChapter || '—'} | ${it.verdict} | ${it.reason} | ${it.suggested || '—'} |`);
  }
  L.push('');
  L.push('## 三、口径与边界\n');
  for (const x of doc.limits) L.push(`- ${x}`);
  L.push('');
  L.push('## 四、章分布\n');
  L.push('| ICD-11 章 | 条数 |');
  L.push('|---|--:|');
  for (const [k, v] of Object.entries(doc.chapters).sort()) L.push(`| ${k} | ${v} |`);
  return L.join('\n') + '\n';
}

function check() {
  const doc = build();
  if (!fs.existsSync(OUT_JSON)) {
    console.log('[zhenduan-icd] ✗ 缺 standards/zhenduan/icd-align.json（先跑 node scripts/align_zhenduan_icd.js）');
    return 1;
  }
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  const diffs = [];
  if (prev.inputs.definitions.sha256 !== doc.inputs.definitions.sha256) diffs.push('definitions-en.json 变了');
  if (prev.inputs.zhNames.sha256 !== doc.inputs.zhNames.sha256) diffs.push('zh-names.json 变了');
  if (prev.inputs.bzu.sha256 !== doc.inputs.bzu.sha256) diffs.push('bzu.json 变了');
  if (prev.stat.misaligned !== doc.stat.misaligned) diffs.push(`错配数 ${prev.stat.misaligned} → ${doc.stat.misaligned}`);
  if (diffs.length) {
    console.log('[zhenduan-icd] ✗ ' + diffs.join('；'));
    return 1;
  }
  console.log(`[zhenduan-icd] ✓ ${doc.stat.total} 条 · 错配 ${doc.stat.misaligned}（${(doc.stat.misalignRate * 100).toFixed(1)}%）`);
  return 0;
}

function main() {
  if (process.argv.includes('--check')) return check();
  const doc = build();
  fs.writeFileSync(OUT_JSON, JSON.stringify(doc, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(doc));
  const s = doc.stat;
  console.log('═══ BZU 病码 × ICD-11 对账 ═══');
  console.log(`  带码 ${s.total} 条：ok ${s.ok} · narrow ${s.narrow} · conflict ${s.conflict} · missing ${s.missing}`);
  console.log(`  错配率 ${(s.misalignRate * 100).toFixed(1)}%（conflict+missing / total）`);
  console.log(`  在 definitions-en 有定义 ${s.inDefinitions}/${s.total}；在 TM1/TM2 中文名 ${s.inTmZhNames}/${s.total}`);
  for (const it of doc.items.filter((x) => x.verdict === 'conflict' || x.verdict === 'missing')) {
    console.log(`    ✗ ${it.name} → ${it.icd} ${it.icdTitle || '（无条目）'}（${it.verdict}）`);
  }
  console.log('  → standards/zhenduan/{icd-align.json, icd-align.md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, toMd, JUDGEMENTS, codeOf };
