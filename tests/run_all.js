#!/usr/bin/env node
/**
 * tests/run_all.js — 跑全部测试套件，汇总结果
 *
 *   node tests/run_all.js
 *   node tests/run_all.js --fast   跳过章节代码执行（只跑结构与契约）
 *
 * 退出码 0 = 全部通过；1 = 有套件失败。
 */

'use strict';

const path = require('path');
const { spawnSync } = require('node:child_process');

const FAST = process.argv.includes('--fast');
const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { file: 'test_curriculum_contract.js', desc: '课程结构与章节契约（复用 audit_curriculum）' },
  { file: 'test_learning_paths.js', desc: '学习路径引用与计数一致性' },
  { file: 'test_site_artifacts.js', desc: '站点生成物形状（data.js / content.js / HTML）' },
  { file: 'test_site_render.js', desc: '站点渲染烟雾测试（共享 dom-shim 里真跑 app.js 逐页渲染）' },
  { file: 'test_math_render.js', desc: '公式渲染器（LaTeX 子集 → HTML，含注入与退化安全）' },
  { file: 'test_glossary_bridge.js', desc: '桥梁表与术语表的完整性' },
  { file: 'test_narration.js', desc: '[tcmP] 讲稿质量（可朗读性 / 段帧一致 / 免责措辞）' },
  { file: 'test_semtensor.js', desc: '语义张量计算核心（规范 §12 硬证据：端色/基点/往返/镜像/DDG Gauss–Bonnet）' },
  { file: 'test_sphere_render.js', desc: '三维极坐标球面渲染（画布无汉字 / 三球同色 / 同步旋转 / 图注实例化）' },
  { file: 'test_knowledge_tree.js', desc: '《中医知识树》导入层（xlsx 读取 / 连续性合并 / 五级骨架 / DSU 交叉印证）' },
  { file: 'test_shanghan_base.js', desc: '《伤寒论底本》导入层（27 篇 1760 条 / 9 域跨源核对 / 出处可复现）' },
  { file: 'test_materials_import.js', desc: '源材料批量导入层（7 份材料 / 四种形态渲染 / 出处可复现）' },
  { file: 'test_leijing_colors.js', desc: '类经图翼方位色接入（16×11 矩阵 / 三层球面 / 配色判定用对对照）' },
  { file: 'test_links.js', desc: '内部链接检查（含判据宽严两侧的负例）' },
  { file: 'test_forking_doc.js', desc: '改造流程文档的事实核对（文档里的数字不许静默过期）' },
  { file: 'test_outputs_index.js', desc: '产出物索引层（与文件系统双向一致 / 缺口显式 / 不漂移）' },
  { file: 'test_audit_l3.js', desc: 'L3 内容层端到端（造探针章节，四个负例：代价与边界/代码块绕过/H1/引文）' },
  { file: 'test_deliverable_artifacts.js', desc: '两条交付物线成品（stats/sitemap/robots · 单文件书 HTML）' },
  { file: 'test_chapter_code.js', desc: '每个已建章节的 code/main.js 与单元测试', slow: true },
  { file: 'test_content_review.js', desc: '人机闭环：内容复核清单', advisory: true },
  { file: 'assert_disclaimers.js', desc: '[tcmP] 每集讲稿必须带末位免责声明卡' },
];

console.log('═══ tcmai-engineering-from-scratch · 测试 ═══');
console.log(`  模式: ${FAST ? '快速（跳过章节代码执行）' : '完整'}\n`);

const results = [];

for (const s of SUITES) {
  if (FAST && s.slow) {
    console.log(`  ⏭  ${s.file} —— 跳过（--fast）`);
    results.push({ ...s, status: 'skipped' });
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, s.file)], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const status = ok ? 'pass' : s.advisory ? 'advisory-fail' : 'fail';
  const icon = ok ? '✅' : s.advisory ? '⚠' : '❌';
  console.log(`  ${icon} ${s.file} (${ms}ms) — ${s.desc}`);
  if (!ok) {
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    out.slice(-14).forEach((l) => console.log(`       ${l}`));
  }
  results.push({ ...s, status, ms, ok });
}

const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const advisory = results.filter((r) => r.status === 'advisory-fail').length;
const skipped = results.filter((r) => r.status === 'skipped').length;

console.log('\n─── 汇总 ───');
console.log(`  通过 ${passed} · 失败 ${failed} · 咨询性失败 ${advisory}${skipped ? ` · 跳过 ${skipped}` : ''}`);

if (failed) {
  console.log('\n❌ 测试未通过');
  process.exit(1);
}
console.log('\n✅ 测试通过');
