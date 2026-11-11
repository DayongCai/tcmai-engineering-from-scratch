#!/usr/bin/env node
/**
 * scripts/check_handbook_contract.js —— 操作型章契约 handbook-v1 的审计器
 *
 * 为什么单独一个门：`audit_curriculum.js` 的 L2/L3 验的是**讲授型**课程文档（docs/zh.md 的
 * MOTTO/PROBLEM/经典引文/代价与边界）。轮转与毕设没有那套东西 —— 它们的契约是
 * 「流程 + 清单 + 模板 + 失效 + 考核」。两套契约混在一个门里，结局只有两种：
 * 要么把手册写成论文，要么把论文放水成清单。
 *
 * handbook-v1 的硬要求（逐条可查）：
 *   1. 章首块声明「操作型章（handbook-v1）」，且不得声称 N.1–N.5 学术契约
 *   2. 七节齐全：H.1 问题 / H.2 目标 / H.3 流程 / H.4 清单 / H.5 模板 / H.6 失效 / H.7 考核
 *   3. 流程步骤 ≥4 · 清单 ≥6 条（含 - [ ]）· 失效 ≥3 · 考核 ≥3
 *   4. 模板表 ≥4 行字段
 *   5. 正文 ≥400 汉字（不是篇幅崇拜，是挡「只有标题的空壳」）
 *   6. 必须有免责/边界声明
 *   7. meta.json 的 textbook.contract 必须是 handbook-v1（契约与文件必须对得上）
 *
 *   node scripts/check_handbook_contract.js            检查
 *   node scripts/check_handbook_contract.js --json     机器可读
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, loadCurriculum } = require('./lib');

const AS_JSON = process.argv.includes('--json');
const cur = loadCurriculum();

const hanzi = (t) => (t.match(/[\u4e00-\u9fa5]/g) || []).length;
const errors = [];
const stats = [];

for (const d of cur.departments) {
  for (const s of d.subjects) {
    if (s.semester < 9) continue;
    const key = `${d.slug}/${s.slug}`;
    const metaPath = path.join(ROOT, s.path, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      errors.push(`L1 缺 meta.json: ${key}`);
      continue;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')).textbook || {};
    if (meta.contract !== 'handbook-v1') {
      errors.push(`契约未声明: ${key} 的 textbook.contract = ${meta.contract || '（空）'}，第 9/10 学期必须为 handbook-v1`);
      continue;
    }
    const dir = path.join(ROOT, 'textbooks', d.slug, s.slug);
    if (!fs.existsSync(dir)) {
      errors.push(`缺教材目录: textbooks/${key}`);
      continue;
    }
    const files = fs.readdirSync(dir).filter((f) => /^\d+-第\d+章.*\.md$/.test(f)).sort();
    if (files.length !== s.chapters) {
      errors.push(`章文件 ${files.length} ≠ 章节目标 ${s.chapters}: textbooks/${key}`);
    }
    let chars = 0;
    for (const f of files) {
      const where = `textbooks/${key}/${f}`;
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      chars += hanzi(t);
      if (!/handbook-v1/.test(t)) errors.push(`章首未声明 handbook-v1: ${where}`);
      if (/N\.3\s*这个翻译丢掉了什么/.test(t)) errors.push(`操作型章混入学术契约 N.3: ${where}`);
      for (const sec of ['H.1', 'H.2', 'H.3', 'H.4', 'H.5', 'H.6', 'H.7']) {
        if (!new RegExp(`^##\\s*${sec.replace('.', '\\.')}\\s`, 'm').test(t)) errors.push(`缺 ${sec} 节: ${where}`);
      }
      const steps = (t.match(/^\d+\.\s+\S/gm) || []).length;
      if (steps < 4) errors.push(`流程步骤 ${steps} < 4: ${where}`);
      const checks = (t.match(/^- \[ \]/gm) || []).length;
      if (checks < 6) errors.push(`清单 ${checks} < 6: ${where}`);
      const h6 = t.split(/^##\s*H\.6/m)[1];
      const fails = h6 ? (h6.split(/^##\s*H\.7/m)[0].match(/^- /gm) || []).length : 0;
      if (fails < 3) errors.push(`失效条目 ${fails} < 3: ${where}`);
      const h7 = t.split(/^##\s*H\.7/m)[1];
      const assess = h7 ? (h7.match(/^- /gm) || []).length : 0;
      if (assess < 3) errors.push(`考核条目 ${assess} < 3: ${where}`);
      const h5 = t.split(/^##\s*H\.5/m)[1];
      const rows = h5 ? (h5.split(/^##\s*H\.6/m)[0].match(/^\|.*\|$/gm) || []).length - 2 : 0;
      if (rows < 4) errors.push(`模板字段行 ${rows} < 4: ${where}`);
      if (hanzi(t) < 400) errors.push(`正文 ${hanzi(t)} 汉字 < 400: ${where}`);
      if (!/(免责|边界声明|不构成诊疗)/.test(t)) errors.push(`缺免责/边界声明: ${where}`);
    }
    stats.push({ key, chapters: files.length, hanzi: chars });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ contract: 'handbook-v1', subjects: stats.length, chapters: stats.reduce((a, s) => a + s.chapters, 0), errors }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

console.log('═══ 操作型章契约（handbook-v1）═══\n');
if (errors.length) {
  for (const e of errors.slice(0, 40)) console.log(`  ✗ ${e}`);
  if (errors.length > 40) console.log(`  … 另有 ${errors.length - 40} 条`);
  console.log(`\n─── ${stats.length} 门 / ${stats.reduce((a, s) => a + s.chapters, 0)} 章 · 错误 ${errors.length} ───`);
  console.log('\n❌ 手册契约未通过');
  process.exit(1);
}
console.log(`  ✅ ${stats.length} 门 / ${stats.reduce((a, s) => a + s.chapters, 0)} 章全部满足 handbook-v1`);
console.log(`  ✅ 结构：H.1–H.7 七节齐全 · 步骤 ≥4 · 清单 ≥6 · 失效 ≥3 · 考核 ≥3 · 模板 ≥4 字段`);
console.log(`  ✅ 篇幅与声明：每章 ≥400 汉字，且带免责/边界声明`);
console.log(`  ✅ 契约一致：18 门 meta.json 的 textbook.contract = handbook-v1`);
