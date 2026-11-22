#!/usr/bin/env node
/**
 * 健康服务管理 · 第 3 章 基层的本事，是把一次就诊变成一段随访
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/03-z83/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；六个环节、三个断点、三重用途、
 * 四个随访数这几处清单由正文自己数出来；卷首那组数（人口、全科医生、门诊量、在管
 * 高血压、签约与续约、建档与随访记录）读回正文，现场折算成人均负荷与随访缺口。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '基层的本事，是把一次就诊变成一段随访';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (t) => (String(t || '').match(HANZI) || []).length;

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

const splitList = (s, re = /[、，]/) =>
  String(s).replace(/以及/g, '、').split(re).map((x) => x.trim()).filter(Boolean);

/** 标签后面第一个数（允许千分位与小数）。 */
function numAfter(body, label) {
  const i = body.indexOf(label);
  if (i < 0) throw new Error('正文里没找到「' + label + '」');
  const m = body.slice(i + label.length, i + label.length + 24).match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) throw new Error('「' + label + '」后面没有数');
  return Number(m[1].replace(/,/g, ''));
}

/** 数写在标签前面的情况，如「8 名全科医生」。 */
function numBefore(body, label) {
  const re = new RegExp('(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:名|个|位)?\\s*' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到「N ' + label + '」');
  return Number(m[1].replace(/,/g, ''));
}

function audit(body) {
  const steps = splitList(clauseAfter(body, '基层的健康管理可以拆成六个环节'));
  const trust = splitList(clauseAfter(body, '取决于三件事'));
  const uses = splitList(clauseAfter(body, '健康档案有三重用途'), /[、，与]/);
  const followNums = splitList(clauseAfter(body, '要看四个数'));
  const breakpoints = (body.match(/第[一二三]处断点/g) || []).length;

  const counts = {
    steps: steps.length,
    trust: trust.length,
    uses: uses.length,
    followNums: followNums.length,
    breakpoints,
  };
  const claims = [
    { label: '六个环节', want: 6, got: counts.steps },
    { label: '三件事', want: 3, got: counts.trust },
    { label: '三重用途', want: 3, got: counts.uses },
    { label: '四个随访数', want: 4, got: counts.followNums },
    { label: '三处断点', want: 3, got: counts.breakpoints },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const raw = {
    population: numAfter(body, '辖区常住人口') * 1e4,
    gps: numBefore(body, '全科医生'),
    visits: numAfter(body, '年门诊') * 1e4,
    hypertension: numAfter(body, '在管高血压患者'),
    followRate: numAfter(body, '规范随访率'),
    signed: numAfter(body, '签约居民') * 1e4,
    renewRate: numAfter(body, '续约率'),
    files: numAfter(body, '健康档案建了') * 1e4,
    filedWithFollow: numAfter(body, '有随访记录的只有'),
    slots: numAfter(body, '半天看'),
    minutes: numAfter(body, '每个病人平均'),
    callsPerTeam: numAfter(body, '一个团队一天打'),
    controlRate: numAfter(body, '血压控制率只有'),
  };

  const derived = {
    visitsPerGp: raw.visits / raw.gps,
    htnPerGp: raw.hypertension / raw.gps,
    halfDayMinutes: raw.slots * raw.minutes,
    followedFiles: (raw.files * raw.filedWithFollow) / 100,
    followedHtn: (raw.hypertension * raw.followRate) / 100,
    callConnectRate: 60, // 正文写「接通率不到六成」
  };

  return { steps, trust, uses, followNums, breakpoints, counts, claims, mismatched, raw, derived };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((x) => x[1]))];

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${(body.match(/\*\*[^*\n]+\*\*/g) || []).length} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('流程清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  六个环节 ${a.counts.steps} 条：${a.steps.join('／')}`);
  console.log(`  三处断点 ${a.counts.breakpoints} 处：建档之后／随访／转诊`);
  console.log(`  关系的三件事 ${a.counts.trust} 条：${a.trust.join('／')}`);
  console.log(`  档案的三重用途 ${a.counts.uses} 条：${a.uses.join('／')}`);
  console.log(`  随访的四个数 ${a.counts.followNums} 条：${a.followNums.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首数字复算：');
  const { raw, derived } = a;
  console.log(`  常住人口 ${(raw.population / 1e4).toFixed(1)} 万 · 全科医生 ${raw.gps} 名 · 年门诊 ${(raw.visits / 1e4).toFixed(0)} 万人次`);
  console.log(`  → 每名全科医生年门诊 ${derived.visitsPerGp.toFixed(0)} 人次；在管高血压 ${derived.htnPerGp.toFixed(0)} 人`);
  console.log(`  半天 ${raw.slots} 个号 × 平均 ${raw.minutes} 分钟 = ${derived.halfDayMinutes} 分钟`);
  console.log(`  建档 ${(raw.files / 1e4).toFixed(1)} 万份 × ${raw.filedWithFollow}% 有随访记录 = ${derived.followedFiles.toFixed(0)} 份`);
  console.log(`  在管 ${raw.hypertension} 人 × 规范随访 ${raw.followRate}% = ${derived.followedHtn.toFixed(0)} 人`);
  console.log(`  签约 ${(raw.signed / 1e4).toFixed(1)} 万人 × 续约 ${raw.renewRate}% ≈ ${((raw.signed * raw.renewRate) / 100 / 1e4).toFixed(2)} 万人续约`);
  console.log(`  团队一天打 ${raw.callsPerTeam} 个电话 × 接通不到六成 ≈ ${(raw.callsPerTeam * derived.callConnectRate / 100).toFixed(1)} 个接通`);
  console.log(`  → 控制率 ${raw.controlRate}%：门诊量做上去了，管住的人没有同步上去。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：基层最缺的不是热情，是把热情固定成流程的能力；流程一旦固定，换人也不塌。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成对具体机构服务的评价。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, numAfter, audit };
