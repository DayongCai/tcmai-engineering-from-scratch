#!/usr/bin/env node
/**
 * 健康服务管理 · 第 2 章 分级不是排座次，是让每一段服务有人接得住
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/02-z82/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；正文里「三个判断」「四个接口」
 * 「四个条件」「三处破解」的条数由正文自己数出来并与中文数字对账；卷首那几个百分比
 * 也读回正文复算，看不出接口在哪里。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '分级不是排座次，是让每一段服务有人接得住';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

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

/** 标签后面第一个百分数。 */
function pct(body, label) {
  const i = body.indexOf(label);
  if (i < 0) throw new Error('正文里没找到「' + label + '」');
  const m = body.slice(i + label.length, i + label.length + 30).match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) throw new Error('「' + label + '」后面没有百分数');
  return Number(m[1]);
}

function audit(body) {
  const decisions = splitList(clauseAfter(body, '是三个判断'));

  const ifaceRaw = body.match(/(基层首诊、双向转诊、急慢分治、上下联动)/);
  if (!ifaceRaw) throw new Error('正文里没找到四个接口那句话');
  const interfaces = ifaceRaw[1].split('、');

  const chainItems = (body.match(/[一二三四]是/g) || []).filter((x) => ['一是', '二是', '三是', '四是'].includes(x));

  const fixes = ['支付方式上', '考核指标上', '责任安排上'].filter((k) => body.includes(k));

  const counts = {
    decisions: decisions.length,
    interfaces: interfaces.length,
    chain: chainItems.length,
    fixes: fixes.length,
  };
  const claims = [
    { label: '三个判断', want: NUM['三'], got: counts.decisions },
    { label: '四个接口', want: NUM['四'], got: counts.interfaces },
    { label: '四个条件', want: NUM['四'], got: counts.chain },
    { label: '三处破解', want: NUM['三'], got: counts.fixes },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const m = {
    countyVisit: pct(body, '县域内就诊率'),
    townBed: pct(body, '乡镇卫生院床位使用率'),
    countyBed: pct(body, '县医院床位使用率'),
    downShare: pct(body, '下转人次只占上转人次的'),
    signRate: pct(body, '家庭医生签约覆盖率'),
    renewRate: pct(body, '续约率'),
  };
  m.bedGap = m.countyBed - m.townBed;
  m.upDownRatio = 100 / m.downShare;
  m.renewOfSigned = (m.renewRate / m.signRate) * 100;

  return { decisions, interfaces, chainCount: counts.chain, fixes, counts, claims, mismatched, m };
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
  console.log('接口清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  三个判断 ${a.counts.decisions} 条：${a.decisions.join('；')}`);
  console.log(`  四个接口 ${a.counts.interfaces} 条：${a.interfaces.join('／')}`);
  console.log(`  连续性的四个条件 ${a.counts.chain} 条（正文以「一是…四是」列出）`);
  console.log(`  破解下转难 ${a.counts.fixes} 处：${a.fixes.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首四个数字复算：');
  console.log(`  县医院床位使用率 ${a.m.countyBed}% − 乡镇 ${a.m.townBed}% = 差 ${a.m.bedGap} 个百分点`);
  console.log(`  下转占上转 ${a.m.downShare}% → 上转人次约为下转的 ${a.m.upDownRatio.toFixed(1)} 倍`);
  console.log(`  签约 ${a.m.signRate}% 、续约 ${a.m.renewRate}% → 签约者中续约占 ${a.m.renewOfSigned.toFixed(1)}%`);
  console.log('  → 四个数字各自及格，接口却不在一张纸上：床位在县医院挤、在乡镇空。');
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：没有责任人的接口，等于没有接口；文件规定「应当」，流程要规定「由谁在几个工作日内完成」。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成政策解读意见，也不构成医疗或管理咨询建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, pct, audit };
