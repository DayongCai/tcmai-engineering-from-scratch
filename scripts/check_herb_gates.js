#!/usr/bin/env node
/**
 * scripts/check_herb_gates.js —— 五道闸校验器（第 13 章的可执行版）
 *
 * 输入：药名（可选）。输出：这味药过了五道闸里的哪几道、缺哪几道、依据在哪一段。
 * 无参数时对 287 味全库跑一遍，写出 standards/zhongyao/gates.{json,md}。
 *
 * 五道闸（定义来自第 13 章正文，不是这里自创）：
 *   G1 产地   道地 / 产地 / 主产 / 采收 / 采集 / 贮藏 / 贮存
 *   G2 炮制   炮制 / 生用 / 炙 / 炒 / 煅 / 蒸 / 煮 / 姜制 / 酒制 / 醋制 / 盐制 / 砂烫 / 制霜 …
 *   G3 配伍   配 X / 相须 / 相使 / 相畏 / 相杀 / 相恶 / 相反 / 同用 / 合用
 *   G4 禁忌   禁忌 / 慎用 / 禁用 / 忌 / 不宜 / 孕妇 / 有毒 / 小毒 / 大毒
 *   G5 剂量   数字 + g / 克 / 钱 / 两 / 枚 / 片 / ml
 *
 * 边界（写进产物，不许省）：
 *   这是**词面检索**：命中只说明「教材在这一段里写了相关字样」，不说明记载完整、也不说明对不对。
 *   未命中同样只说明「教材没写」，不等于该药没有这种属性（可能在别的章节或别的书里）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhongyao', 'gates.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhongyao', 'gates.md');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const GATES = [
  { id: 'G1', name: '产地', words: ['道地', '产地', '主产', '采收', '采集', '贮藏', '贮存'], ch13: '第3章' },
  { id: 'G2', name: '炮制', words: ['炮制', '生用', '炙', '炒', '煅', '蒸', '煮', '姜制', '酒制', '醋制', '盐制', '砂烫', '制霜', '煨', '制用'], ch13: '第4章' },
  { id: 'G3', name: '配伍', words: ['相须', '相使', '相畏', '相杀', '相恶', '相反', '同用', '合用', '配'], ch13: '第6章' },
  { id: 'G4', name: '禁忌', words: ['禁忌', '慎用', '禁用', '不宜', '孕妇', '有毒', '小毒', '大毒', '忌'], ch13: '第7章' },
  { id: 'G5', name: '剂量', words: [], re: /\d+(?:\.\d+)?\s*(?:g|克|钱|两|枚|片|ml|毫升)/i, ch13: '第8章' },
];

const FIELDS = ['来源与性味归经', '功效与主治', '用法用量与使用注意'];

function hit(text, gate) {
  if (gate.re) {
    const m = text.match(gate.re);
    return m ? m[0] : '';
  }
  for (const w of gate.words) {
    const i = text.indexOf(w);
    if (i >= 0) {
      // 取命中词前后一小段做证据，避免只报一个单字
      return text.slice(Math.max(0, i - 6), Math.min(text.length, i + w.length + 10)).trim();
    }
  }
  return '';
}

function checkDrug(d) {
  const per = {};
  for (const f of FIELDS) {
    const text = String(d.fields[f] || '');
    for (const g of GATES) {
      if (per[g.id] && per[g.id].pass) continue;
      const ev = text ? hit(text, g) : '';
      if (ev) per[g.id] = { pass: true, field: f, evidence: ev };
      else if (!per[g.id]) per[g.id] = { pass: false, field: '', evidence: '' };
    }
  }
  const gates = GATES.map((g) => ({
    id: g.id, name: g.name, chapter: g.ch13,
    pass: Boolean(per[g.id] && per[g.id].pass),
    field: (per[g.id] && per[g.id].field) || '',
    evidence: (per[g.id] && per[g.id].evidence) || '',
  }));
  const passed = gates.filter((g) => g.pass).length;
  return {
    name: d.name,
    chapter: d.chapter,
    sub: d.sub,
    locator: `教材·第${d.chapter}章·${d.sub}`,
    gates,
    passed,
    missing: gates.filter((g) => !g.pass).map((g) => g.name),
    score: passed / GATES.length,
  };
}

function build() {
  const drugs = JSON.parse(fs.readFileSync(DRUGS, 'utf8'));
  const rows = drugs.drugs.map(checkDrug);

  const byGate = {};
  for (const g of GATES) {
    const pass = rows.filter((r) => r.gates.find((x) => x.id === g.id).pass).length;
    byGate[g.id] = { name: g.name, chapter: g.ch13, pass, fail: rows.length - pass, rate: pass / rows.length };
  }

  const dist = {};
  for (const r of rows) dist[r.passed] = (dist[r.passed] || 0) + 1;

  const mean = rows.reduce((n, r) => n + r.passed, 0) / rows.length;
  const full = rows.filter((r) => r.passed === GATES.length);
  const zero = rows.filter((r) => r.passed === 0);

  return {
    generated: '2026-10-29',
    what: '五道闸校验器（第 13 章的可执行版）：逐药检查教材里有没有产地/炮制/配伍/禁忌/剂量五类依据',
    inputs: {
      drugs: { file: 'standards/zhongyao/drugs.json', sha256: sha(DRUGS) },
      base: { file: 'standards/zhongyao/底本.json', sha256: sha(BASE) },
    },
    gateDefs: GATES.map((g) => ({ id: g.id, name: g.name, chapter: g.ch13, words: g.words, re: g.re ? String(g.re) : '' })),
    limits: [
      '这是词面检索：命中只说明教材这一段里出现相关字样，不说明记载完整或正确。',
      '未命中只说明教材没写，不等于该药无此属性（可能写在第 3–8 章总论里以类相从）。',
      'G3「配伍」用单字「配」作线索，命中率高但精度低；精确判定要看原文是否为「配某药」。',
      'G4「禁忌」把「有毒/小毒/大毒」也算作依据——毒性本身不等于禁忌，这里按第 13 章第四道闸的口径合并统计。',
    ],
    stat: {
      drugs: rows.length,
      gates: GATES.length,
      meanPassed: Number(mean.toFixed(3)),
      meanScore: Number((mean / GATES.length).toFixed(3)),
      full: full.length,
      zero: zero.length,
      dist,
      byGate,
    },
    rows,
  };
}

function toMd(d) {
  const s = d.stat;
  const L = [];
  L.push('# 五道闸校验器 · 287 味药的资料完整度');
  L.push('');
  L.push(`> 生成 ${d.generated} · 输入 drugs \`${d.inputs.drugs.sha256.slice(0, 12)}\` · 底本 \`${d.inputs.base.sha256.slice(0, 12)}\` · ${s.drugs} 味 × ${s.gates} 闸 = ${s.drugs * s.gates} 格`);
  L.push('');
  L.push('## 一、结论数字');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| 平均通过闸数 | **${s.meanPassed} / ${s.gates}** |`);
  L.push(`| 平均完整度 | **${(s.meanScore * 100).toFixed(1)}%** |`);
  L.push(`| 五闸全过 | ${s.full} 味（${(s.full / s.drugs * 100).toFixed(1)}%） |`);
  L.push(`| 一闸都不过 | ${s.zero} 味 |`);
  L.push('');
  L.push('| 通过闸数 | 药数 |');
  L.push('|--:|--:|');
  for (let i = s.gates; i >= 0; i -= 1) L.push(`| ${i} | ${s.dist[i] || 0} |`);
  L.push('');
  L.push('## 二、逐闸通过率');
  L.push('');
  L.push('| 闸 | 对应教材章 | 通过 | 未通过 | 通过率 |');
  L.push('|---|---|--:|--:|--:|');
  for (const g of Object.values(s.byGate)) {
    L.push(`| ${g.name} | ${g.chapter} | ${g.pass} | ${g.fail} | ${(g.rate * 100).toFixed(1)}% |`);
  }
  L.push('');
  L.push('## 三、词面判据（写死的，可复核）');
  L.push('');
  L.push('| 闸 | 命中词 / 正则 |');
  L.push('|---|---|');
  for (const g of d.gateDefs) L.push(`| ${g.name} | ${g.re ? '`' + g.re + '`' : g.words.join(' · ')} |`);
  L.push('');
  L.push('## 四、五闸全过的药（可直接当教学范例）');
  L.push('');
  const fullNames = d.rows.filter((r) => r.passed === s.gates).map((r) => r.name);
  L.push(fullNames.length ? fullNames.join('、') : '（无）');
  L.push('');
  L.push('## 五、一闸都不过的药');
  L.push('');
  const zeroNames = d.rows.filter((r) => r.passed === 0);
  L.push(zeroNames.length ? zeroNames.map((r) => `${r.name}（${r.locator}）`).join('、') : '（无）');
  L.push('');
  L.push('## 六、边界（四条，缺一条就会误用）');
  L.push('');
  for (const x of d.limits) L.push(`- ${x}`);
  L.push('');
  L.push('## 七、逐药明细（287 行）');
  L.push('');
  L.push('| 药 | 教材位置 | G1 产地 | G2 炮制 | G3 配伍 | G4 禁忌 | G5 剂量 | 通过 |');
  L.push('|---|---|:-:|:-:|:-:|:-:|:-:|--:|');
  for (const r of d.rows) {
    const c = (id) => (r.gates.find((g) => g.id === id).pass ? '✓' : '—');
    L.push(`| ${r.name} | ${r.locator} | ${c('G1')} | ${c('G2')} | ${c('G3')} | ${c('G4')} | ${c('G5')} | ${r.passed}/5 |`);
  }
  L.push('');
  return L.join('\n');
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const d = build();

  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_JSON)) {
      console.log('[gates] ✗ 缺 gates.json（先跑 node scripts/check_herb_gates.js）');
      return 1;
    }
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const bad = [];
    if (prev.inputs.drugs.sha256 !== d.inputs.drugs.sha256) bad.push('drugs.json 变了');
    if (prev.stat.meanPassed !== d.stat.meanPassed) bad.push(`平均通过 ${prev.stat.meanPassed} → ${d.stat.meanPassed}`);
    if (prev.stat.full !== d.stat.full) bad.push(`全过 ${prev.stat.full} → ${d.stat.full}`);
    if (bad.length) {
      console.log('[gates] ✗ ' + bad.join('；'));
      return 1;
    }
    const s = d.stat;
    console.log(`[gates] ✓ ${s.drugs} 味 × ${s.gates} 闸 · 平均 ${s.meanPassed}/5（${(s.meanScore * 100).toFixed(1)}%）· 全过 ${s.full} · 零过 ${s.zero}`);
    return 0;
  }

  if (arg) {
    const hitRow = d.rows.find((r) => r.name === arg);
    if (!hitRow) {
      console.log(`未找到药名：${arg}`);
      return 1;
    }
    console.log(`═══ ${hitRow.name}（${hitRow.locator}）═══`);
    for (const g of hitRow.gates) {
      console.log(`  ${g.pass ? '✓' : '—'} ${g.id} ${g.name.padEnd(3, '　')} ${g.pass ? `[${g.field}] ${g.evidence}` : '（教材该药三段里没有相关字样）'}`);
    }
    console.log(`  通过 ${hitRow.passed}/5 · 缺：${hitRow.missing.join('、') || '无'}`);
    return 0;
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(d, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(d));
  const s = d.stat;
  console.log('═══ 五道闸校验器 ═══');
  console.log(`  ${s.drugs} 味 × ${s.gates} 闸 = ${s.drugs * s.gates} 格`);
  console.log(`  平均通过 ${s.meanPassed}/5（完整度 ${(s.meanScore * 100).toFixed(1)}%）· 五闸全过 ${s.full} 味 · 零过 ${s.zero} 味`);
  for (const [id, g] of Object.entries(s.byGate)) console.log(`    ${id} ${g.name}：${g.pass}/${s.drugs}（${(g.rate * 100).toFixed(1)}%）`);
  console.log('  分布：' + Object.entries(s.dist).sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k}闸 ${v}`).join(' · '));
  console.log('  → standards/zhongyao/gates.{json,md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, checkDrug, GATES };
