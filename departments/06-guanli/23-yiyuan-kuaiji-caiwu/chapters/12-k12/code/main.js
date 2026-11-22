#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 12 章 内控不是多一道签字
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/12-k12/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文有两组对照：三方核对的净收益与审批加级的净损失，以及五条风险的期望损失表。
 * 脚本从正文抓参数重算，再与正文印出的金额、比例、成本效益比对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const num = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return Number(m[1].replace(/,/g, ''));
  };
  const pay = doc.match(/某院年付款\s*([\d,]+)\s*笔，差错率\s*([\d.]+)%，即\s*([\d,]+)\s*笔、按平均\s*([\d.]+)\s*万元计\s*([\d,]+)\s*万元/);
  if (!pay) throw new Error('正文里找不到付款差错');
  const ctrl = doc.match(/按经验可拦下\s*(\d+)% 的差错，即\s*([\d,]+)\s*笔、([\d,]+)\s*万元；这道核对需要\s*([\d.]+)\s*个编制，年成本\s*([\d,]+)\s*万元/);
  if (!ctrl) throw new Error('正文里找不到三方核对');
  const chain = doc.match(/审批链条从\s*(\d+)\s*级加到\s*(\d+)\s*级，付款周期从\s*(\d+)\s*天拖到\s*(\d+)\s*天，供应商报价上浮\s*([\d.]+)%，一年在\s*([\d,]+)\s*万元采购上多付\s*([\d,]+)\s*万元/);
  if (!chain) throw new Error('正文里找不到审批加级');
  const risks = [...doc.matchAll(/\|\s*([^|\n]+?)\s*\|\s*(0\.\d+)\s*\|\s*([\d,]+)\s*\|\s*\*{0,2}([\d,]+)\*{0,2}\s*\|/g)]
    .filter((m) => m[1] !== '合计' && m[1] !== '风险')
    .map((m) => ({ name: m[1], p: Number(m[2]), impact: Number(m[3].replace(/,/g, '')), loss: Number(m[4].replace(/,/g, '')) }));
  if (risks.length < 5) throw new Error(`正文里只找到 ${risks.length} 条风险`);
  const benefit = doc.match(/年成本合计\s*([\d,]+)\s*万元，可把医保拒付的期望损失从\s*([\d,]+)\s*万元降到\s*([\d,]+)\s*万元，即减少\s*([\d,]+)\s*万元。\*\*净收益\s*([\d,]+)\s*万元，成本效益比\s*([\d.]+)\s*:\s*1。\*\*/);
  if (!benefit) throw new Error('正文里找不到控制成本效益');
  return {
    payments: Number(pay[1].replace(/,/g, '')),
    errorRate: Number(pay[2]),
    errors: Number(pay[3].replace(/,/g, '')),
    avgError: Number(pay[4]),
    errorAmount: Number(pay[5].replace(/,/g, '')),
    catchRate: Number(ctrl[1]),
    caught: Number(ctrl[2].replace(/,/g, '')),
    caughtAmount: Number(ctrl[3].replace(/,/g, '')),
    headcount: Number(ctrl[4]),
    controlCost: Number(ctrl[5].replace(/,/g, '')),
    levelsFrom: Number(chain[1]),
    levelsTo: Number(chain[2]),
    daysFrom: Number(chain[3]),
    daysTo: Number(chain[4]),
    quoteRise: Number(chain[5]),
    purchase: Number(chain[6].replace(/,/g, '')),
    extraCost: Number(chain[7].replace(/,/g, '')),
    risks,
    benefitCost: Number(benefit[1].replace(/,/g, '')),
    lossFrom: Number(benefit[2].replace(/,/g, '')),
    lossTo: Number(benefit[3].replace(/,/g, '')),
    lossCut: Number(benefit[4].replace(/,/g, '')),
    netGain: Number(benefit[5].replace(/,/g, '')),
    ratio: Number(benefit[6]),
  };
}

function compute(p) {
  const errors = Math.round(p.payments * (p.errorRate / 100));
  const errorAmount = errors * p.avgError;
  const caught = Math.round(errors * (p.catchRate / 100));
  const caughtAmount = caught * p.avgError;
  const netControl = caughtAmount - p.controlCost;
  const extraCost = p.purchase * (p.quoteRise / 100);
  const riskTotal = p.risks.reduce((s, r) => s + r.p, 0) && p.risks.reduce((s, r) => s + r.loss, 0);
  return {
    errors,
    errorAmount,
    caught,
    caughtAmount,
    netControl,
    extraCost,
    riskTotal,
    maxRisk: p.risks.slice().sort((a, b) => b.loss - a.loss)[0],
    netBenefit: p.lossCut - p.benefitCost,
    ratio: p.lossCut / p.benefitCost,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.errors === p.errors && p.errors === 576, '差错 32,000 × 1.8% = 576 笔');
  expect(Math.abs(r.errorAmount - p.errorAmount) < 0.5 && p.errorAmount === 691, '差错金额 576 × 1.2 = 691 万元');
  expect(r.caught === p.caught && p.caught === 357, '可拦下 576 × 62% = 357 笔');
  expect(Math.abs(r.caughtAmount - p.caughtAmount) < 0.5 && p.caughtAmount === 428, '挽回 357 × 1.2 = 428 万元');
  expect(Math.round(r.netControl) === 410 && doc.includes('净赚 410 万元'), '三方核对净赚 410 万元');
  expect(Math.round(r.extraCost) === p.extraCost && p.extraCost === 330 && doc.includes('多付 330 万元'), '审批加级净亏 330 万元');
  expect(r.riskTotal === 2160 && doc.includes('**2,160**'), '五条风险期望损失合计 2,160 万元');
  expect(r.maxRisk.name.includes('医保') && r.maxRisk.loss === 840, '最大风险是医保拒付 840 万元');
  expect(r.netBenefit === p.netGain && p.netGain === 330, '控制净收益 330 万元');
  expect(Math.abs(r.ratio - p.ratio) < 0.01 && p.ratio === 2.57, '成本效益比 2.57∶1');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 12 章 内控不是多一道签字');
  console.log('');
  console.log(`付款差错：${wan(p.payments)} 笔 × ${p.errorRate}% = ${wan(r.errors)} 笔 × ${p.avgError} 万元 = ${wan(r.errorAmount)} 万元`);
  console.log(`三方核对：拦下 ${p.catchRate}% 即 ${wan(r.caught)} 笔、${wan(r.caughtAmount)} 万元，成本 ${wan(p.controlCost)} 万元 → 净 ${wan(r.netControl)} 万元`);
  console.log(`审批加级：${p.levelsFrom} → ${p.levelsTo} 级，${p.daysFrom} → ${p.daysTo} 天，报价上浮 ${p.quoteRise}% → 多付 ${wan(r.extraCost)} 万元`);
  console.log('');
  console.log('五条风险（期望损失，万元）：');
  for (const x of p.risks.slice().sort((a, b) => b.loss - a.loss)) {
    console.log(`  ${x.name.padEnd(14, '　')} ${x.p} × ${wan(x.impact)} = ${wan(x.loss)}`);
  }
  console.log(`  合计 ${wan(r.riskTotal)} 万元；最大风险是「${r.maxRisk.name}」`);
  console.log('');
  console.log(`三项控制：成本 ${wan(p.benefitCost)} 万元，拒付损失 ${wan(p.lossFrom)} → ${wan(p.lossTo)}，净收益 ${wan(r.netBenefit)} 万元，比 ${r.ratio.toFixed(2)}∶1`);
  console.log('结论：内控有成本，做过头等于把赚到的钱又送出去。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 净收益与风险合计由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成审计结论或风险评估结论。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
