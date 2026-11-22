#!/usr/bin/env node
/**
 * scripts/audit_course_docs.js —— 单门课程的正文成色审计（写作期自检，也是父任务的验收工具）
 *
 * 用途：补实某门课时，逐章检查「能不能算写完」，而不是只看字数。
 * 判据（全部硬性）：
 *   1. 模板残留 0：三辨／四位面／单元规模／本课第 N 章／见 code/main.js 输出
 *   2. 每章 ≥2,500 汉字（CJK 计）
 *   3. H1 为观点式：`# 第 N 章 · <判断句>`，判断句长度 ≥8 且不以「概述/基础/方法」这类空词收尾
 *   4. MOTTO 到《书名·篇名》级（不得只有书名）
 *   5. 有 `## 代价与边界`（或 `### 本节翻译的代价与边界`）
 *   6. 有免责声明
 *   7. 正文 4–6 个二级小节（含代价与边界）
 *
 * 用法：
 *   node scripts/audit_course_docs.js --dept=05-huli --subject=21-laonian-huli-xue
 *   node scripts/audit_course_docs.js --dept=05-huli            # 整个院系
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const FP = [/三辨/, /四位面/, /单元规模/, /本课第\s*\d+\s*章/, /见 code\/main\.js 输出/];
const MIN_HZ = 2500;

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=')[1];

function auditChapter(file) {
  const md = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const hz = (md.match(CJK) || []).length;
  const issues = [];
  for (const re of FP) if (re.test(md)) issues.push(`模板残留 ${re}`);
  if (hz < MIN_HZ) issues.push(`汉字 ${hz} < ${MIN_HZ}`);

  const h1 = (md.match(/^#\s+(.+)$/m) || [, ''])[1].trim();
  const m = h1.match(/^第\s*(\d+)\s*章\s*[·・:：]\s*(.+)$/);
  if (!m) issues.push('H1 不是「# 第 N 章 · 判断句」');
  else if ((m[2].match(CJK) || []).length < 8) issues.push('H1 判断句过短（<8 汉字）');

  const motto = md.match(/\*\*MOTTO:\*\*\s*[^\n]*?——《([^》]+)》/);
  if (!motto) {
    const bookOnly = md.match(/\*\*MOTTO:\*\*\s*[^\n]*?《([^》·]+)》/);
    issues.push(bookOnly ? `MOTTO 只有书名《${bookOnly[1]}》，缺篇名` : 'MOTTO 缺《书名·篇名》级引文');
  }

  if (!/^##+\s*[^\n]*代价与边界/m.test(md)) issues.push('缺「代价与边界」小节');
  if (!/免责声明/.test(md)) issues.push('缺免责声明');

  const secs = (md.match(/^##\s+/gm) || []).length;
  if (secs < 4 || secs > 8) issues.push(`二级小节 ${secs} 个（要求 4–8）`);

  return { hz, secs, issues, h1 };
}

function subjectDir(dept, subject) {
  return path.join(ROOT, 'departments', dept, subject);
}

function auditSubject(dept, subject, quiet) {
  const dir = subjectDir(dept, subject);
  const chaptersDir = path.join(dir, 'chapters');
  if (!fs.existsSync(chaptersDir)) return { dept, subject, missing: true, rows: [] };
  const rows = [];
  for (const c of fs.readdirSync(chaptersDir).sort()) {
    const f = path.join(chaptersDir, c, 'docs', 'zh.md');
    if (!fs.existsSync(f)) { rows.push({ c, issues: ['缺 docs/zh.md'], hz: 0 }); continue; }
    rows.push({ c, ...auditChapter(f) });
  }
  const bad = rows.filter((r) => r.issues.length);
  if (!quiet) {
    console.log(`\n=== ${dept}/${subject}  ${rows.length} 章 · 不合格 ${bad.length}`);
    for (const r of rows) {
      const flag = r.issues.length ? '✗' : '✓';
      console.log(`  ${flag} ${r.c.padEnd(34)} ${String(r.hz).padStart(5)} 字  节 ${r.secs ?? '-'}`
        + (r.issues.length ? `  ← ${r.issues.join('；')}` : ''));
    }
  }
  return { dept, subject, rows, bad: bad.length, total: rows.length };
}

function main() {
  const dept = arg('dept', '');
  const subject = arg('subject', '');
  if (!dept) { console.error('用法：--dept=05-huli [--subject=...]'); process.exit(2); }
  const results = [];
  if (subject) {
    results.push(auditSubject(dept, subject));
  } else {
    const base = path.join(ROOT, 'departments', dept);
    for (const s of fs.readdirSync(base).sort()) {
      if (!fs.statSync(path.join(base, s)).isDirectory()) continue;
      results.push(auditSubject(dept, s, true));
    }
    console.log(`\n=== ${dept}  共 ${results.length} 门`);
    for (const r of results) {
      const okHz = r.rows.filter((x) => x.hz >= MIN_HZ).length;
      console.log(`  ${r.bad ? '✗' : '✓'} ${r.subject.padEnd(30)} ${r.total} 章 · ≥${MIN_HZ}字 ${okHz} · 不合格 ${r.bad}`);
    }
  }
  const totalBad = results.reduce((a, r) => a + (r.bad || 0), 0);
  const total = results.reduce((a, r) => a + (r.total || 0), 0);
  console.log(`\n合计 ${total} 章 · 不合格 ${totalBad}`);
  process.exit(totalBad ? 1 : 0);
}

if (require.main === module) main();
module.exports = { auditChapter, auditSubject, MIN_HZ };
