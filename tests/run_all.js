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
  { file: 'test_materials_import.js', desc: '源材料批量导入层（13 份材料 / 六种形态渲染 / 出处可复现）' },
  { file: 'test_xls_reader.js', desc: '旧二进制 .xls 读取器（OLE2/BIFF8：内经全本 162 篇逐字校验 / RK 编码）' },
  { file: 'test_shaoyin_source.js', desc: '少阴外源补录（sha256 / 45 条 15 方 / 不污染底本 / PROVENANCE 一致）' },
  { file: 'test_docx_reader.js', desc: 'Word .docx 读取器（OOXML：段落/标题/表格，伤寒架构六经总表逐格校验）' },
  { file: 'test_leijing_colors.js', desc: '类经图翼方位色接入（16×11 矩阵 / 三层球面 / 配色判定用对对照）' },
  { file: 'test_links.js', desc: '内部链接检查（含判据宽严两侧的负例）' },
  { file: 'test_forking_doc.js', desc: '改造流程文档的事实核对（文档里的数字不许静默过期）' },
  { file: 'test_outputs_index.js', desc: '产出物索引层（与文件系统双向一致 / 缺口显式 / 不漂移）' },
  { file: 'test_audit_l3.js', desc: 'L3 内容层端到端（造探针章节，四个负例：代价与边界/代码块绕过/H1/引文）' },
  { file: 'test_deliverable_artifacts.js', desc: '两条交付物线成品（stats/sitemap/robots · 单文件书 HTML）' },
  { file: 'test_embeddings.js', desc: '嵌入层（按源材料 embedding-code 规格：TF-IDF/BM25/RRF + 回归锚点）', slow: true },
  { file: 'test_icd11_client.js', desc: 'ICD-11 客户端（双通道：WHO 凭据路径 / 本地库父链 / 仓库编码校验）' },
  { file: 'test_dashboard.js', desc: '项目看板（KPI 与源独立重算比对；阻塞项必须带解除条件）' },
  { file: 'test_tcm_api.js', desc: '/diag 与 /bianzheng（逆转推理引擎：映射表/高斯/方名 + 未命中不得美化）' },
  { file: 'test_dsu_descriptions.js', desc: '证候描述（构词解析 / 证据只取正文的守门 / 覆盖数字如实）' },
  { file: 'test_external_batch.js', desc: '外部证据分批（队列确定性 / 空结果不入库 / 导入幂等 / 括注限定词）' },
  { file: 'test_evidence_quality.js', desc: '证据质量分级（特指/部分/待确认异名/仅证名/通用，五级各有真实踩坑案例）' },
  { file: 'test_aliases.js', desc: '异名表（**每条别名必须在它 source 指向的来源里字面出现**）' },
  { file: 'test_porting_map.js', desc: '全链路账本（参考→本仓库：路径验真 / evidence 已注册 / 参考新脚本不许被静默忽略 / 不漂移）' },
  { file: 'test_upstream_drift.js', desc: '上游漂移哨兵（**静默契约**：无变化必须零输出；整条路径含测量环节可测）' },
  { file: 'test_architecture.js', desc: '逻辑架构（层路径验真含通配 / 门引的命令与测试必须存在 / 三份文档不许复述同一事实 / 不漂移）' },
  { file: 'test_platform_pipeline.js', desc: '成片流水线（七段三方齐备 / 产物与段数对齐 / 不许是占位 / 诚实报告字段被填 / 完成度可见）' },
  { file: 'test_lib_metrics.js', desc: '嵌入指标（轮廓/CH/DB/分离比/熵/符号准确率/保真度，手算期望值）' },
  { file: 'test_xlsx_writer.js', desc: 'xlsx 写出器（往返逐字相同 / sheet 名清理 / 控制字符剔除 / zip 可解）' },
  { file: 'test_chenruchun.js', desc: '《伤寒论临床应用》交付物（目录与字数可重算 / 出处必须在原书目录里 / 方名交叉可复现）' },
  { file: 'test_chenruchun_lectures.js', desc: '《验证-伤寒论》交付物（全 24 讲：每表带 hermesagent 总结 / 讲稿引用必须逐讲逐句对得上 / 24 讲都读到可核 / 33 方逐首判定 / 与上一份交付物按 sha256 对读）' },
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
