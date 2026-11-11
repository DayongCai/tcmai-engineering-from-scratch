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
const fs = require('fs');
const os = require('os');
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
  { file: 'test_embeddings.js', desc: '嵌入层（甲·源材料 embedding-code：TF-IDF/FTS5/RRF + 乙·Decoding the mind 的 prompt 单元与上下文工程 + ICD-11 术语通道）', slow: true },
  { file: 'test_icd11_terms.js', desc: 'ICD-11 术语嵌入层与真 FTS5（lib_fts5 中文 bigram/trigram/注入 + 术语单元构造 + 建库确定性）', slow: true },
  { file: 'test_equivalence.js', desc: '语义张量等价映射（一个点=一个类 / 往返闭合 / 同名多义不取第一个 / D 级探针不是翻译 / 异体字只改写法 / 中文直查）', slow: true },
  { file: 'test_tm1_axes.js', desc: 'TM1 四轴词表与探针组合器（词项有出现次数 / 轴序统计得来 / 中文构件有官方出处 / 官方没的词如实标出）' },
  { file: 'test_icd11_client.js', desc: 'ICD-11 客户端（双通道：WHO 凭据路径 / 本地库父链 / 仓库编码校验）' },
  { file: 'test_dashboard.js', desc: '项目看板（KPI 与源独立重算比对；阻塞项必须带解除条件）' },
  { file: 'test_content_board.js', desc: '专业内容看板（七层内容与源独立重算比对；单元数≠证候数、无数据集记 n/a）' },
  { file: 'test_jingui_text.js', desc: '金匮外源底本（sha256/篇条方/条号格式/互见方/繁简双栏）' },
  { file: 'test_jingui_chapters.js', desc: '金匮 24 章（10 主题章 + 14 篇目精读；引文逐字在底本 / quiz 契约 / 章内单测可跑 / 不许标底本）' },
  { file: 'test_jingui_quanwen.js', desc: '金匮 402 条覆盖（398 带条号逐字相等且各出现一次 + 序 1 + 附篇 3 篇）' },
  { file: 'test_jingui_zhujia.js', desc: '金匮三家注：留档 sha256 / 对齐计数 / 每条注文带出处 / 注文≠原文' },
  { file: 'test_jingui_shiyi.js', desc: '金匮释义：398 条全覆盖 / 方名不串条 / 不抄原文 / 自撰声明' },
  { file: 'test_jingui_cidian.js', desc: '金匮词解：402 条全覆盖 / 词形必在本条 / 不重复 / 自撰声明' },
  { file: 'test_jingui_fangjie.js', desc: '金匮方解：168 方全覆盖 / 药名不越界 / 落到本方药 / 自撰声明' },
  { file: 'test_jingui_fangzu.js', desc: '金匮方族：168 方一族一归属 / 药味合计自洽 / 标志药门槛 / 图表同源' },
  { file: 'test_jingui_gushiwen.js', desc: '金匮古诗文网本（第二见证：26 份留档 sha256 / 25 篇 1282 段 29929 字 / 逐篇对照 / 校勘表同源）' },
  { file: 'test_wenbing_text.js', desc: '温病三书底本（三份 sha256 / 条方数 / 条号体系 / 方名尾注）' },
  { file: 'test_wenbing_chapters.js', desc: '温病 10 章（三书引文保真 / 卫气营血≠三焦 / quiz 契约 / 章内单测）' },
  { file: 'test_zhongcan_xilu_text.js', desc: '醫學衷中參西錄底本（sha256 / 5 大类 265 篇 534 单元 / 双栏一致 / 参西轴可测）' },
  { file: 'test_neijing_text.js', desc: '內經選讀底本（sha256 / 31 篇类 162 篇 1,728 段 / 正文=段拼接 / 三轴可测）' },
  { file: 'test_neijing_chapters.js', desc: '內經選讀 10 章 × 底本（底本對讀塊 / 引文逐字命中 / 教材本 vs 全文可重算）' },
  { file: 'test_video_lessons.js', desc: '188 門學科網絡視頻台賬（講數可重算 / 缺口占行 / 教案與台賬同步）' },
  { file: 'test_zhongcan_xilu_course.js', desc: '汇通期选读课 10 章（引文逐字在底本 / 外源标注 / 剂量不换算 / 534 单元无悬空）' },
  { file: 'test_std_mapping.js', desc: '底本目录映射（未挂课底本只许汇通期一部 / 隐形课程回归守卫 / 重复目录白名单）' },
  { file: 'test_jichu_text.js', desc: '中医基础理论教材底本（sha256 / 13 章 327 段 / 编号体系 / 19 段截断留档）' },
  { file: 'test_jichu_chapters.js', desc: '中医基础理论 10 章（教材引文保真 / 章级引用 / 跨文件规模数字 / quiz 契约）' },
  { file: 'test_jichu_supplements.js', desc: '教材缺口补源（四源 sha256 / 56 条逐条可回源 / 底本不被污染）' },
  { file: 'test_zhongyao_pairing.js', desc: '配伍对象+反畏扫描（279/287 有对象 · 1,162 边 · 各论踩清单 0）' },
  { file: 'test_zhongyao_gates.js', desc: '五道闸校验器（287 味×5 闸 · 平均 3.341/5 · 产地全库 0）' },
  { file: 'test_zhongyao_supplements.js', desc: '中药学补源层（升降浮沉 17 示例/28 线索/249 拒补 · 总论与攻毒两缺口）' },
  { file: 'test_zhongyao_chapters.js', desc: '中药学 12 章（教材引文保真 / 章级引用 / quiz 契约 / 章内单测）' },
  { file: 'test_shengli_chapters.js', desc: '生理学 11 章（6 文件/引文逐字/数值零容忍/边界声明/quiz question 键）' },
  { file: 'test_shengli_text.js', desc: '生理学底本（11 章/132 单元/228,672 字 · 数值型 0 · 三视角四层级）' },
  { file: 'test_normal_values.js', desc: '生理学正常值数据层（53 条/6 来源·sha256·NV 块一致·pending 不带值·正文零裸值）' },
  { file: 'test_bingli_text.js', desc: '病理学底本（21 章/252 单元/428,867 字 · 数值型 0 · 病因机制形态三视角）' },
  { file: 'test_bingli_chapters.js', desc: '病理学 21 章（6 文件/引文逐字/数值口径分支/单元覆盖/边界声明）' },
  { file: 'test_binglishengli_text.js', desc: '病理生理学代用底本（疾病学基础 18 章/216 单元/360,945 字 · 数值型 0 · 病因机制机能三视角）' },
  { file: 'test_binglishengli_chapters.js', desc: '病理生理学 53 章契约（讲义为第一文本 · 逐章 6 文件/讲义引文逐字/节号覆盖/零裸值/quiz 引证）' },
  { file: 'test_binglishengli_narration.js', desc: '病理生理学旁白层（53 章 lesson.json · 段数/角色/spoken 清洁/估算自洽/course.yaml 对齐）' },
  { file: 'test_binglishengli_textbook.js', desc: '病理生理学教材层（53 篇溯源 sha256 · 改写层 5 章样板结构/篇幅/出处可核）' },
  { file: 'test_jiangyi.js', desc: '病理生理学讲义层（单元/章号连续/必备部分/规模/案例/指纹）' },
  { file: 'test_yaoli_chapters.js', desc: '药理学 49 章（6 文件/教材引文逐字/三级 locator/12 小节全覆盖/B 支数值/quiz 引证）' },
  { file: 'test_neike_chapters.js', desc: '中医内科学 14 章（教材引文按 locator 范围回查/小节逐个落位/跨章综合章/B 支数值）' },

  { file: 'test_media_delivery.js', desc: '交付层：HLS 两档 + 纯音频 + 字幕组 + 发布清单（未打包则跳过）' },
  { file: 'test_fangji_chapters.js', desc: '方剂学 12 章（6 文件/引文逐字/字数/quiz/outputs/单测/留账）' },
  { file: 'test_fangji_text.js', desc: '方剂学底本（24 章/750 段/358,800 字 · 114 方 · 八法 52 方）' },
  { file: 'test_zhongyao_text.js', desc: '中药学教材底本（sha256 / 30 章 971 段 / 287 味药性味归经）' },
  { file: 'test_zhenduan_text.js', desc: '中医诊断学教材底本（sha256 / 14 章 196 段 / 编号体系 / BZU 26 条）' },
  { file: 'test_zhenduan_chapters.js', desc: '中医诊断学 12 章（教材引文保真 / 章级引用 / quiz 契约 / 章内单测）' },
  { file: 'test_zhenduan_icd.js', desc: '中医诊断学 BZU 病码 × ICD-11 对账（14 码 · 错配 57.1%）' },
  { file: 'test_zhenduan_tm1_disorder_landing.js', desc: '病名侧反查（TM1 病 150 实条 · exact 44 / 29.3% · 无 87）' },
  { file: 'test_zhenduan_tm1_landing.js', desc: '反方向对账（TM1 196 实单元 · exact 108 · 硬缺口 6）' },
  { file: 'test_zhenduan_near_judgements.js', desc: '近名判定表（7 条 · 词面2/病位2/病性3 · 待人工 0）' },
  { file: 'test_zhenduan_coverage.js', desc: '病证覆盖分析（12 病 · 同名 5 / 近名 7 / 无 0 · TM1 0 释义）' },
  { file: 'test_zhenduan_icd_corrections.js', desc: '教材更正建议（14 格 · 必改 8 格 · md/csv 同源）' },
  { file: 'test_zhenduan_supplements.js', desc: '中医诊断学补源层（3 补 1 拒 · 31 条外源 · 底本不动）' },
  { file: 'test_tcm_api.js', desc: '/diag 与 /bianzheng（逆转推理引擎：映射表/高斯/方名 + 未命中不得美化）' },
  { file: 'test_dsu_descriptions.js', desc: '证候描述（构词解析 / 证据只取正文的守门 / 覆盖数字如实）' },
  { file: 'test_external_batch.js', desc: '外部证据分批（队列确定性 / 空结果不入库 / 导入幂等 / 括注限定词）' },
  { file: 'test_evidence_quality.js', desc: '证据质量分级（特指/部分/待确认异名/仅证名/通用，五级各有真实踩坑案例）' },
  { file: 'test_aliases.js', desc: '异名表（**每条别名必须在它 source 指向的来源里字面出现**）' },
  { file: 'test_term_alignment.js', desc: '术语对齐（ICD-11 合称 → 国家证名表通行证名；对齐不是证据）' },
  { file: 'test_literature_names.js', desc: '文献通行证名（**每条判定必须在所指正文里逐字命中**；换名须有出处；不进证据数）' },
  { file: 'test_porting_map.js', desc: '全链路账本（参考→本仓库：路径验真 / evidence 已注册 / 参考新脚本不许被静默忽略 / 不漂移）' },
  { file: 'test_upstream_drift.js', desc: '上游漂移哨兵（**静默契约**：无变化必须零输出；整条路径含测量环节可测）' },
  { file: 'test_architecture.js', desc: '逻辑架构（层路径验真含通配 / 门引的命令与测试必须存在 / 三份文档不许复述同一事实 / 不漂移）' },
  { file: 'test_platform_pipeline.js', desc: '成片流水线（七段三方齐备 / 产物与段数对齐 / 不许是占位 / 诚实报告字段被填 / 完成度可见）' },
  { file: 'test_lib_metrics.js', desc: '嵌入指标（轮廓/CH/DB/分离比/熵/符号准确率/保真度，手算期望值）' },
  { file: 'test_xlsx_writer.js', desc: 'xlsx 写出器（往返逐字相同 / sheet 名清理 / 控制字符剔除 / zip 可解）' },
  { file: 'test_chenruchun.js', desc: '《伤寒论临床应用》交付物（目录与字数可重算 / 出处必须在原书目录里 / 方名交叉可复现）' },
  { file: 'test_chenruchun_lectures.js', desc: '《验证-伤寒论》交付物（全 24 讲：每表带 hermesagent 总结 / 讲稿引用必须逐讲逐句对得上 / 24 讲都读到可核 / 33 方逐首判定 / 与上一份交付物按 sha256 对读）' },
  { file: 'test_chapter_code.js', desc: '每个已建章节的 code/main.js 与单元测试', slow: true },
  { file: 'test_textbooks_source.js', desc: '学科种子稿 → [textbooks]（100 份账本齐全 / 逐章可复算 / 章文件与账本一一对应 / conflict 不越权且正文保全）' },
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
  // 子进程输出直接落盘，不经 maxBuffer：1000+ 章的 TAP 会到数百 MB，
  // 缓冲进内存会把父进程一起拖死（表现为「跑到第 80 个套件就静默退出」）。
  const tmp = path.join(os.tmpdir(), `tcmai-test-${s.file}.log`);
  const fd = fs.openSync(tmp, 'w');
  const r = spawnSync(process.execPath, [path.join(__dirname, s.file)], {
    encoding: 'utf8',
    cwd: ROOT,
    stdio: ['ignore', fd, fd],
  });
  fs.closeSync(fd);
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const status = ok ? 'pass' : s.advisory ? 'advisory-fail' : 'fail';
  const icon = ok ? '✅' : s.advisory ? '⚠' : '❌';
  console.log(`  ${icon} ${s.file} (${ms}ms) — ${s.desc}`);
  if (!ok) {
    const out = (fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '').trim().split('\n');
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
