#!/usr/bin/env node
/**
 * 医学遗传学 · 第 11 章 遗传咨询的产出不是「一个风险数字」，是一份能在几个选项里做决定的框架
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/11-linchuang-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术是筛查的阳性预测值：患病率 1/5000、灵敏度 98%、特异度 99.5%，
 * 以及把特异度提到 99.9% 之后的变化。输入取自正文，结果再与正文明写的数对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '遗传咨询的产出不是「一个风险数字」，是一份能在几个选项里做决定的框架';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const lines = body.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    tables: (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length,
    claims: (body.match(/\*\*[^*\n]+\*\*/g) || []).length,
  };
}

const PREV = 1 / 5000; // 正文：新生儿筛查病在人群中 1/5000
const SENS = 0.98;     // 正文：灵敏度 98%
const SPEC = 0.995;    // 正文：特异度 99.5%

/** 真阳性、假阳性与阳性预测值 */
function screening(prev, sens, spec) {
  const tp = sens * prev;
  const fp = (1 - spec) * (1 - prev);
  return { tp, fp, ppv: tp / (tp + fp), falsePerTrue: fp / tp };
}

function figures(text) {
  const a = screening(PREV, SENS, SPEC);
  const b = screening(PREV, SENS, 0.999);
  return [
    { name: '真阳性', got: a.tp, stated: 0.000196, token: '0.000196' },
    { name: '假阳性', got: a.fp, stated: 0.004999, token: '0.004999' },
    { name: '阳性预测值', got: a.ppv * 100, stated: 3.8, token: '3.8%' },
    { name: '多少个阳性里一个真', got: Math.round(1 / a.ppv), stated: 26, token: '二十六个', tol: 0.06 },
    { name: '特异度 99.9% 后的阳性预测值', got: b.ppv * 100, stated: 16, token: '16%' },
    { name: '特异度提高后假阳性降为原来的', got: a.fp / b.fp, stated: 5, token: '五分之一' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= (f.tol || 0.03) * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(1);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(4);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const cur = screening(PREV, SENS, SPEC);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文写输入，这里重算，再与正文的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(22, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log(`本例每个真阳性旁有 ${cur.falsePerTrue.toFixed(1)} 个假阳性——「筛查阳性」不等于「患病」。`);
  console.log('读法：筛查买的是风险分层，诊断买的是结论；阳性预测值由患病率主导，特异度在这个区间比灵敏度值钱。');
  console.log('※ 1/5000、98%、99.5%、3.8%、16% 全部为教学设定与算例推导，不代表任何真实筛查项目的性能。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、筛查建议或治疗建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, screening, PREV, SENS, SPEC };
