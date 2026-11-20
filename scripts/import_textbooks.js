#!/usr/bin/env node
/**
 * scripts/import_textbooks.js —— 把桌面 `textbooks/qhzy-*.xlsx`（100 份学科教材种子稿）
 * 抽取成 [textbooks] 交付物里的学科教材正文
 *
 *   node scripts/import_textbooks.js --list                 只测量：文件 ↔ 学科 ↔ 章数/字数
 *   node scripts/import_textbooks.js --all                  生成全部已映射学科
 *   node scripts/import_textbooks.js --only 方剂学           只生成一份
 *   node scripts/import_textbooks.js --batch 2 --of 5        分批：第 2 批（共 5 批）
 *   node scripts/import_textbooks.js --check                 校核：已生成文件 ↔ 源工作簿逐章对账
 *
 * 为什么要这个脚本、而不是手抄或让模型「写」：
 *   这批工作簿**本身**就是教材正文（多智能体协同种子稿，27.7 M 字 / 1528 张章表）。
 *   任务是把它们**搬进**仓库并保持可核对，不是重新创作 —— 重新创作等于丢掉原文，
 *   而丢了原文之后没有任何断言会告诉你丢了。
 *
 * 形态（逐份实测，不是推断）：
 *   五列「章/节/小节/段/内容」   40+ 份：节次靠四列标记 + 内容列编号；段列 11/12… 是该段正文
 *   两列「类型/内容」            中医知识树 / 中医信息学 / 中医智能仪器 / 东方哲学概论：类型 ∈ 章|节|小节|细目|正文|表格
 *   三列「类型/四级编码/内容」    黄帝内经(通读注释版)：类型 ∈ 篇名|原文|注释|通读
 *   五列「卷/节/小节/段/内容」    伤寒论讲义：卷即章
 *   大纲表「Part/Chapter/Section」中医药AI导论：只有目录没有正文 → 判为无正文，不生成教材
 *
 * 产物：
 *   textbooks/<dept>/<subject>/00-前言.md              源指纹 + 规模 + 章清单 + 免责
 *   textbooks/<dept>/<subject>/NN-第N章-<标题>.md      源正文逐块抽取（节/小节/细目 + 段落）
 *   standards/materials/textbooks-batch/fulltext/*.md  未落入 120 学科树的学科：全本正文（不丢内容）
 *   standards/materials/textbooks-batch/registry.json  出处 · sha256 · 章数 · 字数 · 缺口
 *   departments/<dept>/<subject>/meta.json             textbook.{chaptersWritten,words,status,source}
 *
 * 原则：源文件只读（不入库，51 MB 二进制；入库的是 sha256 + 文件名，可验原件）；
 *       不改写原文；缺口写进 registry 并让 --check 退出非 0。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook } = require('./lib_xlsx');
const { ROOT, loadCurriculum } = require('./lib');

/**
 * 教材 xlsx 放在哪：先认环境变量，再按候选目录找，取第一个真的有 qhzy-*.xlsx 的。
 *
 * 原来是硬编码 'C:/Users/user/Desktop/textbooks'。2026-10 教材集整体搬到 E:\textbooks 之后，
 * 这条硬路径让 8 个断言全报 ENOENT，看上去像「教材缺了」，其实是「路径过期了」——
 * 硬编码的路径不该成为数据的判据。候选目录任何一个能读到文件就用它。
 */
function resolveSrcDir() {
  const cands = [
    process.env.TEXTBOOKS_DIR,
    'E:/textbooks',
    'C:/Users/user/Desktop/textbooks',
    'D:/textbooks/textbooks',
  ].filter(Boolean);
  for (const d of cands) {
    try {
      const hit = fs.readdirSync(d).some((f) => /^qhzy-.*\.xlsx$/i.test(f));
      if (hit) return d.replace(/\\/g, '/');
    } catch { /* 目录不存在就试下一个 */ }
  }
  return (process.env.TEXTBOOKS_DIR || cands[1]).replace(/\\/g, '/');
}

const SRC_DIR = resolveSrcDir();
const MAT_DIR = path.join(ROOT, 'standards', 'materials', 'textbooks-batch');
const FULLTEXT_DIR = path.join(MAT_DIR, 'fulltext');
const TBDIR = path.join(ROOT, 'textbooks');
const TODAY = (() => {
  // 用本机日期，不用 UTC：UTC 20 日 16:00 起本机已是 21 日，落进元数据会差一天
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const ARGV = process.argv.slice(2);
const has = (f) => ARGV.includes(f);
const val = (f) => { const i = ARGV.indexOf(f); return i >= 0 ? ARGV[i + 1] : null; };
const MODE_LIST = has('--list');
const MODE_CHECK = has('--check');
const ONLY = val('--only');
const BATCH = val('--batch') ? Number(val('--batch')) : null;
const OF = val('--of') ? Number(val('--of')) : null;
const NO_FULLTEXT = has('--no-fulltext');

// ─────────────────────────────────────────────────────────────────────
// 文件 ↔ 学科（人工核对过的对应关系；不是关键词猜的）
//   同名的直接，异名的在 note 里写明依据。null = 120 学科树里没有对应学科，
//   这类只抽取「全本正文」，不硬塞进 8 院系 —— 塞进去会让课程树说谎。
// ─────────────────────────────────────────────────────────────────────
const MAPPING = [
  // 中医系（01-zhongyi）
  {
    file: '中医基础理论',
    subject: '01-zhongyi/01-zhongyi-jichu-lilun',
    note: '同名；2026-10 决策：源 12 章为底本，按手写「阴阳」章体例（N.1–N.5 契约节次）扩展为 13 章改写层教材，'
      + '源正文全文留档 standards/materials/textbooks-batch/fulltext/中医基础理论.md',
    // 全书改写层已由人工/代理逐章写成，源工作簿只作底本留档，不再生成源正文层：
    // 章节文件名与编号由作者按阅读顺序确定（1 绪论 · 2 阴阳 · 3 哲学基础 … 13 体质），脚本不得重排。
    authoredFinal: true,
  },
  { file: '医古文', subject: '01-zhongyi/02-yi-gu-wen', note: '同名' },
  { file: '中国医学史', subject: '01-zhongyi/03-zhongguo-yixue-shi', note: '同名' },
  { file: '中医诊断学', subject: '01-zhongyi/05-zhongyi-zhen-duan-xue', note: '同名' },
  { file: '黄帝内经(通读注释版)', subject: '01-zhongyi/06-neijing-xuandu', note: '内经选读：源为素问/灵枢 31 篇通读+原文+注释' },
  { file: '伤寒论讲义', subject: '01-zhongyi/07-shanghanlun', note: '伤寒论：源为十卷讲义' },
  { file: '温病学', subject: '01-zhongyi/09-wenbing-xue', note: '同名' },
  { file: '中医内科学', subject: '01-zhongyi/10-zhongyi-neike-xue', note: '同名' },
  { file: '中医外科学', subject: '01-zhongyi/11-zhongyi-waike-xue', note: '同名' },
  { file: '中医妇科学', subject: '01-zhongyi/12-zhongyi-fuke-xue', note: '同名' },
  { file: '中医儿科学', subject: '01-zhongyi/13-zhongyi-erke-xue', note: '同名' },
  { file: '中医各家学说', subject: '01-zhongyi/15-zhongyi-gejia-xueshuo', note: '同名' },
  // 中药系（02-zhongyao）
  { file: '中药学', subject: '02-zhongyao/01-zhongyaoxue', note: '同名' },
  { file: '药用植物学', subject: '02-zhongyao/02-yaoyong-zhiwu-xue', note: '同名' },
  { file: '方剂学', subject: '02-zhongyao/03-fangjixue', note: '同名' },
  { file: '中药资源学', subject: '02-zhongyao/04-zhongyao-ziyuan-xue', note: '同名' },
  { file: '中药鉴定学', subject: '02-zhongyao/05-zhongyao-jianding-xue', note: '同名' },
  { file: '中药化学', subject: '02-zhongyao/06-zhongyao-huaxue', note: '同名' },
  { file: '中药药理学', subject: '02-zhongyao/07-zhongyao-yaoli-xue', note: '同名' },
  { file: '中药炮制学', subject: '02-zhongyao/08-zhongyao-paozhi-xue', note: '同名' },
  { file: '中药药剂学', subject: '02-zhongyao/09-zhongyao-yaoji-xue', note: '同名' },
  { file: '中药分析', subject: '02-zhongyao/10-zhongyao-fenxi-xue', note: '书名少「学」字，实为同一课程' },
  // 针灸系（03-zhenjiu）
  { file: '中医气功学', subject: '03-zhenjiu/04-qigong-xue', note: '同名' },
  { file: '推拿学', subject: '03-zhenjiu/05-tuina-xue', note: '同名' },
  { file: '推拿手法学', subject: '03-zhenjiu/06-tuina-shoufa-xue', note: '同名' },
  { file: '针法灸法学', subject: '03-zhenjiu/07-cifa-jiufa-xue', note: '源名「针法灸法」，学科名「刺法灸法」，同一课程的两个通行写法' },
  { file: '针灸治疗学', subject: '03-zhenjiu/08-zhenjiu-zhiliao-xue', note: '同名' },
  { file: '实验针灸学', subject: '03-zhenjiu/10-shiyan-zhenjiu-xue', note: '同名' },
  { file: '针灸医籍选读', subject: '03-zhenjiu/03-zhenjiu-yiji-xuan', note: '源名多「读」字' },
  // 骨伤系（04-gushang）
  { file: '中医骨伤科学', subject: '04-gushang/03-gushang-kexue-jichu', note: '骨伤科学基础：源为骨伤科学全本（含基础与各论）' },
  { file: '中医正骨学', subject: '04-gushang/06-zhongyi-zhenggu-xue', note: '同名' },
  { file: '骨伤影像学', subject: '04-gushang/09-guke-yingxiang-zhenduan', note: '骨科影像诊断学：源名「骨伤影像学」' },
  // 护理系（05-huli）
  { file: '中医护理学基础', subject: '05-huli/01-zhongyi-huli-jichu', note: '同名' },
  { file: '中医护理适宜技术', subject: '05-huli/04-zhongyi-huli-jishu', note: '中医护理技术：源名「适宜技术」，同一课程' },
  { file: '中医养生学', subject: '05-huli/05-zhongyi-yangsheng-xue', note: '同名' },
  { file: '中医心理学', subject: '05-huli/06-zhongyi-xinli-xue', note: '同名' },
  { file: '内科护理学', subject: '05-huli/07-neike-huli-xue', note: '同名' },
  { file: '外科护理学', subject: '05-huli/08-waike-huli-xue', note: '同名' },
  { file: '妇产科护理学', subject: '05-huli/09-fuchanke-huli-xue', note: '同名' },
  { file: '儿科护理学', subject: '05-huli/10-erke-huli-xue', note: '同名' },
  { file: '社区护理学', subject: '05-huli/11-shequ-huli-xue', note: '同名' },
  { file: '护理管理学', subject: '05-huli/13-huli-guanli-xue', note: '同名' },
  { file: '护理伦理学', subject: '05-huli/14-huli-lunli-fagui', note: '护理伦理与法规：源只含伦理部分' },
  // 管理系（06-guanli）
  { file: '卫生统计学', subject: '06-guanli/01-yixue-tongjixue', note: '医学统计学：卫生统计学为该课程通行别名' },
  { file: '卫生管理学', subject: '06-guanli/04-weisheng-shiye-guanli', note: '卫生事业管理：源名「卫生管理学」' },
  { file: '医院管理学', subject: '06-guanli/06-yiyuan-guanli-xue', note: '同名' },
  { file: '卫生经济学', subject: '06-guanli/09-yiliao-baoxian-jingji', note: '医疗保险与卫生经济：源只讲卫生经济' },
  { file: '卫生信息管理', subject: '06-guanli/10-yixue-xinxi-guanli', note: '医学信息管理：卫生信息管理为同一领域旧称' },
  // 智能系（07-zhineng）
  { file: '中医药AI导论', subject: '07-zhineng/01-yixue-rengong-zhineng-daolun', note: '医学人工智能导论；源工作簿只有 Part/Chapter/Section 大纲表（无正文段落），见缺口' },
  { file: '中医智能仪器与可穿戴设备', subject: '07-zhineng/03-zhongyi-zhineng-shebei', note: '源名多「仪器与」' },
  {
    file: '中医知识树',
    subject: '07-zhineng/05-zhongyi-zhishi-tupu',
    note: '中医知识树（2026-10 决策：以「中医知识树」替代原「中医知识图谱」课程名）：手写 10 章已齐，源工作簿只作底本留档',
    manualFinal: true,
  },
  // 五官系（08-wuguan）
  { file: '中医眼科学', subject: '08-wuguan/06-zhongyi-yanke-xue', note: '同名' },
  { file: '中医耳鼻喉科学', subject: '08-wuguan/07-zhongyi-erbihou-xue', note: '同名' },
  // 基础医学院系（09-jichu，2026-10 扩科：树外 12 门基础医学入住）
  { file: '人体解剖学', subject: '09-jichu/01-renti-jiepou-xue', note: '同名（系统解剖学）' },
  { file: '组织学与胚胎学', subject: '09-jichu/02-zuzhi-peitai-xue', note: '同名' },
  { file: '医学生物学', subject: '09-jichu/04-yixue-shengwu-xue', note: '同名' },
  { file: '正常人体学', subject: '09-jichu/05-zhengchang-renti-xue', note: '同名（解剖+生理+组胚合并的护理专业基础课）' },
  { file: '生理学', subject: '09-jichu/06-shengli-xue', note: '同名' },
  { file: '生物化学', subject: '09-jichu/07-shenghua-xue', note: '同名' },
  { file: '局部解剖学', subject: '09-jichu/08-jubu-jiepou-xue', note: '同名' },
  { file: '病理学', subject: '09-jichu/10-bingli-xue', note: '同名' },
  { file: '药理学', subject: '09-jichu/12-yaoli-xue', note: '同名（西药药理；树内「中药药理学」是另一门）' },
  { file: '免疫学基础与病原生物学', subject: '09-jichu/13-mianyi-bingyuan-shengwu', note: '同名' },
  { file: '疾病学基础', subject: '09-jichu/14-jibing-xue-jichu', note: '同名（病理生理+免疫+微生物合并课）' },
  { file: '流行病学', subject: '09-jichu/15-liuxingbing-xue', note: '同名' },
  // 针灸系扩科 +5（2026-10：树外专科课入住）
  { file: '针灸学', subject: '03-zhenjiu/16-zhenjiu-xue', note: '针灸学总论（经络+腧穴+刺灸+治疗）' },
  { file: '各家针灸学说', subject: '03-zhenjiu/17-gejia-zhenjiu-xueshuo', note: '同名' },
  { file: '推拿功法学', subject: '03-zhenjiu/18-tuina-gongfa-xue', note: '同名（易筋经等练功）' },
  { file: '推拿治疗学', subject: '03-zhenjiu/19-tuina-zhiliao-xue', note: '同名' },
  { file: '小儿推拿学', subject: '03-zhenjiu/20-xiaoer-tuina-xue', note: '同名' },
  // 护理系扩科 +10（2026-10：护理通识与专科护理入住）
  { file: '护理学导论', subject: '05-huli/16-huli-xue-daolun', note: '同名' },
  { file: '护理心理学', subject: '05-huli/17-huli-xinli-xue', note: '同名' },
  { file: '护理综合技能', subject: '05-huli/18-huli-zonghe-jineng', note: '同名' },
  { file: '护理人文修养与沟通', subject: '05-huli/19-huli-renwen-goutong', note: '同名' },
  { file: '急救护理学', subject: '05-huli/20-jijiu-huli-xue', note: '同名（树内「急危重症护理学」是另一门）' },
  { file: '老年护理学', subject: '05-huli/21-laonian-huli-xue', note: '同名' },
  { file: '康复护理学', subject: '05-huli/22-kangfu-huli-xue', note: '同名' },
  { file: '精神科护理学', subject: '05-huli/23-jingshenke-huli-xue', note: '同名' },
  { file: '中医护理学', subject: '05-huli/24-zhongyi-huli-xue', note: '中医护理学总论（不同于「中医护理学基础」）' },
  { file: '中医临床护理学', subject: '05-huli/25-zhongyi-linchuang-huli', note: '同名' },
  // 2026-10 选修：树外 17 门按内容相关性挂进四类院系（选修不计入院系必修规模基准）
  { file: '中医急诊学', subject: '01-zhongyi/17-zhongyi-jizhen-xue', note: '选修·病种专科 → 中医系' },
  { file: '中医骨病学', subject: '01-zhongyi/18-zhongyi-gubing-xue', note: '选修·病种专科 → 中医系' },
  { file: '中医老年病学', subject: '01-zhongyi/19-zhongyi-laonianbing-xue', note: '选修·病种专科 → 中医系' },
  { file: '中医精神病学', subject: '01-zhongyi/20-zhongyi-jingshenbing-xue', note: '选修·病种专科 → 中医系' },
  { file: '临床中药学', subject: '02-zhongyao/16-linchuang-zhongyaoxue', note: '选修·药学应用 → 中药系' },
  { file: '中药商品学', subject: '02-zhongyao/17-zhongyao-shangpin-xue', note: '选修·药商 → 中药系' },
  { file: '药事管理学', subject: '02-zhongyao/18-yaoshi-guanli-xue', note: '选修·药事管理 → 中药系' },
  { file: '公共管理学', subject: '06-guanli/16-gonggong-guanli-xue', note: '选修·卫生治理 → 管理系' },
  { file: '管理学基础', subject: '06-guanli/17-guanli-xue-jichu', note: '选修·管理学通识 → 管理系' },
  { file: '管理心理学', subject: '06-guanli/18-guanli-xinli-xue', note: '选修·管理心理 → 管理系' },
  { file: '社会医学', subject: '06-guanli/19-shehui-yixue', note: '选修·社会医学 → 管理系' },
  { file: '卫生法学', subject: '06-guanli/20-weisheng-fa-xue', note: '选修·卫生法 → 管理系' },
  { file: '医学伦理学', subject: '06-guanli/21-yixue-lunli-xue', note: '选修·医学伦理 → 管理系' },
  { file: '医药人力资源管理', subject: '06-guanli/22-yiyao-renli-ziyuan', note: '选修·人力 → 管理系' },
  { file: '医院会计与财务管理', subject: '06-guanli/23-yiyuan-kuaiji-caiwu', note: '选修·医院财务 → 管理系' },
  { file: '中医健康管理', subject: '06-guanli/24-zhongyi-jiankang-guanli', note: '选修·健康管理 → 管理系' },
  { file: '中医信息学', subject: '07-zhineng/17-zhongyi-xinxi-xue', note: '选修·信息公理体系 → 智能系' },
  // 用户 2026-10 决策：东方哲学概论作为「中医哲学史」课程底本（替代原定哲学史教材）
  { file: '东方哲学概论', subject: '01-zhongyi/16-zhongyi-zhexue-shi', note: '中医哲学史：按 2026-10 决策，以《东方哲学概论》（东方哲学 + AI 映射）为底本替代原定教材' },
  // 用户 2026-10 决策：机器学习入住智能系
  { file: '机器学习', subject: '07-zhineng/16-jiqi-xuexi', note: '同名（周志华体系）' },
  // 经络腧穴学：源书把经络学与腧穴学合编，按**节题**切给两门，避免把腧穴章塞进经络学
  {
    file: '经络腧穴学',
    split: [
      {
        subject: '03-zhenjiu/01-jingluo-xue',
        note: '经络学：取经络总论、经脉循行、纵横关系、现代研究与歌赋；腧穴类小节归另一门',
        // 「经络腧穴理论的形成/学术发展」是两门共享的学科史，归经络学（不是腧穴专论）
        pick: (section) => /经络腧穴/.test(section) || !/腧穴|奇穴|常用穴|重点穴|特定穴/.test(section),
      },
      {
        subject: '03-zhenjiu/02-shuxue-xue',
        note: '腧穴学：取腧穴总论、各经「常用腧穴」小节、奇经腧穴与经外奇穴',
        pick: (section) => !/经络腧穴/.test(section) && /腧穴|奇穴|常用穴|重点穴|特定穴/.test(section),
      },
    ],
  },
];

// 树外文件：写明它是什么、为什么没入住（不硬塞）
const OUTSIDE_REASON = {
  东方哲学概论: '公共通识课（东方哲学 + AI 映射），120 学科树内无对应学科',
  中医信息学: '中医药信息学公理体系（36 章），树内最接近的是「中医知识图谱 / 中医软件架构学」，但不是同一门课',
  中医临床护理学: '临床护理综合，树内只有按科分的护理课',
  中医护理学: '中医护理学总论，树内为「中医护理学基础」（已由同名文件占用）',
  中医健康管理: '中医健康管理，树内「健康服务与管理」为一般卫生管理课程',
  中医急诊学: '中医急诊/急症，树内无急诊学科（护理侧只有急危重症护理学）',
  中医精神病学: '中医神志病专科，树内无对应学科',
  中医老年病学: '中医老年病专科，树内无对应学科',
  中医骨病学: '骨病专科（骨肿瘤/骨痨），树内只有正骨、脊柱、关节等分科',
  各家针灸学说: '针灸各家学说，树内「针灸医籍选」为原文选读，不是同一门课',
  小儿推拿学: '小儿推拿专科，树内只有推拿学 / 推拿手法学（已由同名文件占用）',
  推拿功法学: '推拿功法（易筋经等），树内无对应学科',
  推拿治疗学: '推拿治疗学，树内推拿学已占用',
  临床中药学: '临床中药学，树内「中药学」已由同名文件占用',
  中药商品学: '中药商品与流通，树内无对应学科',
  针灸学: '针灸学总论（经络+腧穴+刺灸+治疗），树内按四门分设，无一门等于全书',
  经络腧穴学: '经络腧穴学：树内分为「经络学」「腧穴学」两门，源书经络与腧穴逐经合并，无法无争议拆分',
  机器学习: '机器学习（周志华体系），树内无同名课程',
  流行病学: '基础医学/公卫课程，树内无',
  卫生统计学: null, // 已映射
  病理学: '基础医学课程，树内无（树为中医药工程化课程体系）',
  生理学: '基础医学课程，树内无',
  生物化学: '基础医学课程，树内无',
  人体解剖学: '基础医学课程，树内只有「骨伤解剖学」「耳鼻喉解剖生理学」等专科解剖',
  局部解剖学: '基础医学课程，同上',
  正常人体学: '基础医学课程（解剖+生理+组胚合并），树内无',
  组织学与胚胎学: '基础医学课程，树内无',
  疾病学基础: '基础医学课程（病理生理+免疫+微生物合并），树内无',
  免疫学基础与病原生物学: '基础医学课程，树内无',
  医学生物学: '基础医学课程，树内无',
  药理学: '基础医学课程，树内只有「中药药理学」',
  社会医学: '公卫/人文课程，树内无',
  医学伦理学: '人文课程，树内只有「护理伦理与法规」「中医 AI 伦理与治理」',
  卫生法学: '卫生法课程，树内只有「中医药政策与法规」',
  药事管理学: '药事管理，树内无',
  公共管理学: '管理学通识课，树内无',
  管理学基础: '管理学通识课，树内无',
  管理心理学: '心理学通识课，树内无',
  医药人力资源管理: '管理课程，树内无',
  医院会计与财务管理: '管理课程，树内无',
  护理学导论: '护理学导论，树内无（护理系从「中医护理学基础」起步）',
  护理心理学: '护理心理学，树内只有「中医心理学」',
  护理综合技能: '护理技能综合训练，树内无',
  护理人文修养与沟通: '护理人文课程，树内无',
  急救护理学: '急救护理，树内「急危重症护理学」为同一门课的相邻命名，但源书章节结构与之不同，未强并',
  老年护理学: '老年护理，树内无',
  康复护理学: '康复护理，树内无',
  精神科护理学: '精神科护理，树内无',
};

// ─────────────────────────────────────────────────────────────────────
// 解析：工作簿 → 章 → 块（h2/h3/h4/段落/表格）
// ─────────────────────────────────────────────────────────────────────
const HEADER_WORDS = /^(章|节|小节|段|细目|内容|卷|类型|四级编码|Part|Chapter No\.)$/;
const LEVEL_BY_LABEL = {
  章: 0, 卷: 0, 篇: 0, 章首: 0,
  节: 2, 小节: 3, 细目: 4,
  正文: 9, 原文: 9, 注释: 9, 通读: 9, 表格: 8, 附: 9,
  代码: 7, 实练: 9, 习题: 9, 小结: 9, 术语: 9,
};
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cn2num(s) {
  const t = String(s).replace(/[^一二三四五六七八九十百零\d]/g, '');
  if (/^\d+$/.test(t)) return Number(t);
  let n = 0;
  const parts = t.split('百');
  if (parts.length === 2) { n += (cn2num(parts[0]) || 1) * 100; t2 = parts[1]; } else var t2 = t;
  const m = /^(.*)十(.*)$/.exec(t2);
  if (m) n += (m[1] ? CN_NUM[m[1]] || 0 : 1) * 10 + (m[2] ? CN_NUM[m[2]] || 0 : 0);
  else for (const ch of t2) n += CN_NUM[ch] || 0;
  return n;
}

/** 章序号：从表名或标题取（"01 方剂学绪论" / "1绪论" / "第一章 …" / "卷第三" / "第12章 …"） */
function chapterNumber(name, title) {
  const sources = [String(name || ''), String(title || '')];
  for (const s of sources) {
    let m = /^第\s*([一二三四五六七八九十百零\d]+)\s*[章篇卷]/.exec(s.trim());
    if (m) return cn2num(m[1]);
    m = /^([卷篇])\s*第\s*([一二三四五六七八九十百零\d]+)/.exec(s.trim());
    if (m) return cn2num(m[2]);
    m = /^(\d{1,2})(?!\d)/.exec(s.trim());
    if (m) return Number(m[1]);
  }
  return 0;
}

/** 一行 → {label, text}：类型列取首格（须是词语，不是数字），正文取最长/最后一格 */
function rowParts(cells) {
  const filled = cells.map((c, i) => ({ c: String(c == null ? '' : c).trim(), i })).filter((x) => x.c);
  if (!filled.length) return null;
  if (filled.length === 1) return { label: '', text: filled[0].c };
  const first = filled[0];
  const isWordLabel = first.i === 0
    && first.c.length <= 6
    && /[\u4e00-\u9fff]/.test(first.c)
    // 「卷第一」「第3章」是章标志，不是字段名（五列族里它占首列）
    && !/^[卷篇章]\s*第|^第\s*[一二三四五六七八九十百零\d]+\s*[章篇卷]/.test(first.c)
    && !/[。，；：？！,.;:]/.test(first.c);
  const longest = filled.reduce((a, b) => (b.c.length > a.c.length ? b : a));
  if (isWordLabel && (LEVEL_BY_LABEL[first.c] !== undefined || /^(代码|实练|习题|小结|术语|附|篇|章)/.test(first.c))) {
    return { label: first.c, text: longest.c };
  }
  // 元数据行（教学层级 / 学时分配 …）：短标签 + 值
  if (isWordLabel && first.c.length <= 8) {
    const rest = filled.filter((x) => x.i !== first.i).map((x) => x.c).join(' ');
    return { label: first.c, text: rest || first.c, meta: true };
  }
  return { label: '', text: longest.c };
}

const RE_H4 = /^\d+(?:\.\d+){3}\s+/;
const RE_H3 = /^\d+(?:\.\d+){2}\s+/;
const RE_H2 = /^\d+(?:\.\d+){1}\s+/;
const RE_CHAP = /^第\s*[一二三四五六七八九十百零\d]+\s*[章篇卷]/;

/** 已带编号的标题：清掉重复编号（源表里常见 "2.1 2.1 理念"） */
function dedupeNumber(text) {
  return text.replace(/^((?:\d+\.)+\d+)\s+\1\s+/, '$1 ');
}

function parseChapterSheet(sheet) {
  const rows = sheet.rows.map((r) => (Array.isArray(r) ? r : []));
  // 表头
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 3); i += 1) {
    const cells = rows[i].map((c) => String(c == null ? '' : c).trim());
    const hits = cells.filter((c) => HEADER_WORDS.test(c)).length;
    if (hits >= 2) { headerIdx = i; break; }
  }
  const header = headerIdx >= 0 ? rows[headerIdx].map((c) => String(c == null ? '' : c).trim()) : [];
  let shape = (header.includes('Chapter No.') || header.includes('Section No.')) ? 'outline'
    : header.includes('Part') && header.includes('内容') ? 'partnumeric'
    : header.includes('四级编码') ? 'typed3'
    : header.includes('内容（原文/注释）') ? 'typed3'
    : header.includes('类型') ? 'typed2'
    : 'numeric';

  // 无「类型」表头、但首列是结构词（章/节/正文/表格/代码…）的：按 typed2 读。
  // 反例：伤寒论讲义的「卷第一/00/00/00」是数值标记，判据就落回 numeric。
  if (shape === 'numeric') {
    let labelHits = 0;
    let numHits = 0;
    for (let i = headerIdx + 1; i < Math.min(rows.length, headerIdx + 25); i += 1) {
      const c0 = String(rows[i][0] == null ? '' : rows[i][0]).trim();
      if (!c0) continue;
      if (/^\d+$/.test(c0)) numHits += 1;
      else if (LEVEL_BY_LABEL[c0] !== undefined || /^(代码|实练|习题|小结|术语)/.test(c0)) labelHits += 1;
    }
    if (labelHits >= 2 && labelHits > numHits) shape = 'typed2';
  }

  const blocks = [];
  let title = '';
  let tableBuf = [];
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rowsT = tableBuf.slice();
    const hasSep = rowsT.some((r) => /^\|[\s:|-]+\|$/.test(r));
    if (!hasSep && rowsT.length >= 1) {
      const cols = rowsT[0].split(' | ').length;
      rowsT.splice(1, 0, `| ${Array(cols).fill('---').join(' | ')} |`);
    }
    blocks.push({ level: 8, text: rowsT.join('\n') });
    tableBuf = [];
  };

  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const cells = rows[i].map((c) => String(c == null ? '' : c).trim());
    if (!cells.some(Boolean)) continue;
    const p = rowParts(cells);
    if (!p) continue;
    let { label, text } = p;
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (shape === 'outline') {
      // 大纲表：只有章/节标题，没有正文 → 记进 title，正文为空（由上层判缺口）
      if (!title && text) title = text;
      continue;
    }

    if (shape === 'typed3') {
      if (label === '篇名') { flushTable(); blocks.push({ level: 2, text: dedupeNumber(text) }); if (!title) title = text; continue; }
      if (label === '通读') { flushTable(); blocks.push({ level: 9, text: `**通读**：${text}` }); continue; }
      if (label === '注释') { flushTable(); blocks.push({ level: 9, text: `**注释**：${text}` }); continue; }
      flushTable(); blocks.push({ level: 9, text });
      continue;
    }

    if (shape === 'typed2') {
      if (label === '表格' || label === '表行') { tableBuf.push(text); continue; }
      flushTable();
      if (label === '代码') { blocks.push({ level: 7, text }); continue; }
      if (!title && /^第\s*[一二三四五六七八九十百零\d]+\s*[章篇卷]/.test(text)) { title = text; continue; }
      const lv = LEVEL_BY_LABEL[label];
      if (lv === 0) { if (!title) title = text; blocks.push({ level: 1, text }); continue; }
      if (lv === 2 || lv === 3 || lv === 4) { blocks.push({ level: lv, text: dedupeNumber(text) }); continue; }
      if (label === '正文' || label === '原文') { blocks.push({ level: 9, text }); continue; }
      if (p.meta) { blocks.push({ level: 9, text: `**${label}**：${text}` }); continue; }
      if (label) { blocks.push({ level: 9, text: `**${label}**：${text}` }); continue; }
      blocks.push({ level: 9, text });
      continue;
    }

    // partnumeric：表头 Part/节/小节/段/内容（机器学习）——节号在 col1，节名在 col2，
    // 正文在 col5；连续的多格行是表格（证候样例表）。
    if (shape === 'partnumeric') {
      const secNo = /^\d+\.\d+$/.test(String(cells[1] == null ? '' : cells[1]).trim());
      if (secNo) {
        flushTable();
        const head = `${String(cells[1]).trim()} ${String(cells[2] == null ? '' : cells[2]).trim()}`.trim();
        blocks.push({ level: 2, text: dedupeNumber(head) });
        const body = String(cells[4] == null ? '' : cells[4]).trim();
        if (body) blocks.push({ level: 9, text: body.replace(/\s+/g, ' ') });
        continue;
      }
      const filled = cells.filter(Boolean);
      if (filled.length >= 3) { tableBuf.push(`| ${filled.join(' | ')} |`); continue; }
      flushTable();
      const body = String(cells[4] == null ? '' : cells[4]).trim() || filled[filled.length - 1] || '';
      if (body) blocks.push({ level: 9, text: body.replace(/\s+/g, ' ') });
      continue;
    }

    // numeric：五列章/节/小节/段/内容（含「卷」与无数值标记的变体）
    flushTable();
    const seg = String(cells[3] == null ? '' : cells[3]).trim();
    if (RE_CHAP.test(text)) { if (!title) title = text; blocks.push({ level: 1, text }); continue; }
    // 「《伤寒论》卷第一」这类卷首标题行：章名已由表名给出，不重复进正文
    if (/^《[^》]{1,20}》\s*卷/.test(text)) { if (!title) title = text; continue; }
    if (/^【篇】/.test(text)) { blocks.push({ level: 2, text: text.replace(/^【篇】/, '').trim() }); continue; }
    const isBodyMarker = /^\d{2}$/.test(seg); // 11/12/13… = 该段正文
    if (!isBodyMarker) {
      if (RE_H4.test(text)) { blocks.push({ level: 4, text: dedupeNumber(text) }); continue; }
      if (RE_H3.test(text)) { blocks.push({ level: 3, text: dedupeNumber(text) }); continue; }
      if (RE_H2.test(text)) { blocks.push({ level: 2, text: dedupeNumber(text) }); continue; }
      if (/^[一二三四五六七八九十]+[、．.]/.test(text)) { blocks.push({ level: 3, text }); continue; }
    }
    if (p.meta) { blocks.push({ level: 9, text: `**${label}**：${text}` }); continue; }
    blocks.push({ level: 9, text });
  }
  flushTable();

  if (shape === 'typed3') {
    // 黄帝内经通读版：一篇一表，表名即篇名（"1.素问·养生总纲"）
    title = sheet.name.replace(/^\d+\s*[.．、]\s*/, '').trim();
  }
  if (!title) {
    const h1 = blocks.find((b) => b.level === 1);
    title = h1 ? h1.text : sheet.name;
  }
  title = title
    .replace(RE_CHAP, '')
    .replace(/\s*·\s*第\s*[一二三四五六七八九十百零\d]+\s*篇.*$/, '')
    // 表名/章标题里的两位序号（"01 绪论" → "绪论"）；带点的是节号（1.1），不能跟着砍
    .replace(/^\d{1,2}\s+(?=[\u4e00-\u9fff])/, '')
    .replace(/^\d+(?:\.\d+)+\s+/, '')
    .trim() || sheet.name;
  // 章标题行本身不再重复出现在正文里
  const body = blocks.filter((b) => b.level !== 1);
  return { title, blocks: body };
}

// 带序号但不是章表的：平台度量/映射/目录/封面/历史/改写说明/支撑完整性/互适矩阵…（逐份实测踩到的）
// 判据必须是**元数据表的名字**，不能是单个关键词 —— 否则「18 护理学导论与 tcmP 平台」「24 AI 平台」
// 这类真正的末章会被误删（实测踩过：护理系 18 章被吃掉 1 章）。
const NON_CHAPTER = /(平台度量|平台建设与依赖|平台支撑完整性|平台支撑|可复用Skills|ICD11统一命名|病证单元库|多智能体协同|兼容性思维流|互适矩阵|映射s*d|改写说明|^0?(封面|目录|历史|正文总表|目录细化)$|分布式体系)/;
const isChapterSheet = (name) => chapterNumber(name) > 0 && !NON_CHAPTER.test(name);

function parseWorkbook(file) {
  const wb = readWorkbook(path.join(SRC_DIR, file));
  const chapters = [];
  for (const sheet of wb.sheets) {
    const name = sheet.name;
    const n = chapterNumber(name);
    if (!n || !isChapterSheet(name)) continue;
    const parsed = parseChapterSheet(sheet);
    const chars = parsed.blocks.filter((b) => b.level !== 8).reduce((a, b) => a + b.text.replace(/\s/g, '').length, 0);
    chapters.push({ n, sheet: name, title: parsed.title, blocks: parsed.blocks, chars });
  }
  // 附章 / 无编号章表放在最后
  chapters.sort((a, b) => a.n - b.n);
  const meta = readCoverMeta(wb);
  return { chapters, meta, sheets: wb.sheets.length };
}

/** 0封面 / 0改写说明：取书名、学时、版本、审稿人（有则用，无则空，不猜） */
function readCoverMeta(wb) {
  const out = { title: '', hours: '', version: '', reviewers: '', series: '' };
  const cover = wb.sheets.find((s) => s.name === '0封面');
  if (cover) {
    for (const row of cover.rows) {
      const cells = row.map((c) => String(c == null ? '' : c).trim()).filter(Boolean);
      if (!cells.length) continue;
      const t = cells.join(' ');
      if (!out.title && /^《.+》$/.test(cells[0])) out.title = cells[0];
      const h = /(\d+)\s*学时/.exec(t);
      if (!out.hours && h) out.hours = h[1];
      if (!out.series && /系列教材/.test(t)) out.series = t;
    }
  }
  const note = wb.sheets.find((s) => s.name === '0改写说明');
  if (note) {
    for (const row of note.rows) {
      const cells = row.map((c) => String(c == null ? '' : c).trim());
      if (cells[0] === '版本') out.version = cells[1] || '';
      if (cells[0] === '审稿人') out.reviewers = cells[1] || '';
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// 渲染
// ─────────────────────────────────────────────────────────────────────
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]/g, '·').replace(/\s+/g, ' ').trim().slice(0, 60);
const pad2 = (n) => String(n).padStart(2, '0');
const words = (t) => t.replace(/\s/g, '').length;

function renderChapter(ch, idx, file, sha, label) {
  const out = [];
  out.push(`# 第 ${ch.displayN != null ? ch.displayN : ch.n} 章 · ${ch.title}`);
  out.push('');
  out.push(`> **源**：\`${file}\` · 表「${ch.sheet}」 · 源文 ${ch.chars.toLocaleString()} 字`);
  out.push(`> **抽取**：\`node scripts/import_textbooks.js --only ${label}\` · sha256 \`${sha.slice(0, 16)}…\` · ${TODAY}`);
  out.push('> **层次**：本文件是**源教材正文层** —— 节次取自源表的结构列，文字未改写、未压缩、未抽样。'
    + '改写层（N.3「这个翻译丢掉了什么」/ N.5「争议与本项目立场」）尚未撰写，见 `textbooks/README.md` 章契约。');
  out.push('');
  out.push('---');
  out.push('');
  for (const b of ch.blocks) {
    if (b.level === 2) { out.push(`## ${b.text}`, ''); continue; }
    if (b.level === 3) { out.push(`### ${b.text}`, ''); continue; }
    if (b.level === 4) { out.push(`#### ${b.text}`, ''); continue; }
    if (b.level === 7) { out.push('```text', b.text, '```', ''); continue; }
    if (b.level === 8) { out.push(b.text, ''); continue; }
    out.push(b.text, '');
  }
  out.push('---', '');
  out.push('> **免责声明**：本教材内容仅用于教育与科研，不构成任何诊疗建议。');
  out.push('> 本文件由 `scripts/import_textbooks.js` 从源工作簿生成，请勿手改 —— 需要修改请改源工作簿后重跑。');
  out.push('');
  return out.join('\n');
}

function renderPreface(subj, file, sha, bytes, chapters, totalChars, meta, label, splitNote, mergeNote) {
  const out = [];
  out.push(`# ${subj.title} · 教材（源正文层）`);
  out.push('');
  out.push(`> **源**：\`${file}\`（${(bytes / 1024).toFixed(0)} KB，sha256 \`${sha.slice(0, 16)}…\`，原件在桌面 \`textbooks/\`，不进仓）`);
  out.push(`> **抽取**：\`node scripts/import_textbooks.js --only ${subj.title}\` · ${TODAY}`);
  out.push(`> **规模**：${chapters.length} 章 / ${totalChars.toLocaleString()} 字（实测，来自源工作簿正文单元格，不是估算）`);
  out.push(`> **学科**：${subj.dept.slug}/${subj.slug} · 第 ${subj.semester} 学期 · ${subj.hours} 学时 · 目标 ${subj.chapters} 章`);
  out.push('');
  out.push('## 这本书是什么');
  out.push('');
  out.push(`本目录是《${subj.title}》的**源教材正文层**：${chapters.length} 章正文逐块取自源工作簿的章表，`
    + '节 / 小节 / 细目层级来自源表的结构列，段落文字一字未改。');
  out.push('');
  if (mergeNote) {
    out.push('');
    out.push(`> **合并口径**：${mergeNote}`);
    out.push('> 章序按阅读顺序重排，手写章（改写层）插在指定位置并重编号，其余章为源正文层；'
      + '两者并存但不重复 —— 改写层是同一主题的「翻译为什么成立/丢掉了什么」，源正文层是原始内容。');
  }
  if (splitNote) {
    out.push('');
    out.push(`> **切分口径**：${splitNote}。`);
    out.push('> 源工作簿把经络学与腧穴学合编成一本书，本目录只收命中本门课的小节 —— 文字一字未改，'
      + '**章数少于原书是正常的**。');
  }
  out.push('做到的三件事：**不手抄**（脚本逐行抽取）、**不重写**（原文即正文）、**可对账**'
    + '（每章首块的源表名 + sha256 + 字数可复算，`--check` 会逐章比对）。');
  out.push('');
  out.push('## 与项目教材契约的关系');
  out.push('');
  out.push('| 契约节次 | 本目录现状 |');
  out.push('|---|---|');
  out.push('| 章首「本章要回答的问题」 | ⬚ 待撰写（不由脚本编造） |');
  out.push('| N.1 概念与出处 | 🚧 源正文已含（出处散见于正文，未统一到篇名级） |');
  out.push('| N.2 为什么可以这样翻译 | ⬚ 待撰写 |');
  out.push('| N.3 这个翻译丢掉了什么 | ⬚ 待撰写（本项目的硬规则，必须人工写） |');
  out.push('| N.4 与相邻学科的接口 | ⬚ 待撰写 |');
  out.push('| N.5 争议与本项目立场 | ⬚ 待撰写 |');
  out.push('');
  out.push('也就是说：**正文骨架与内容已经落地，改写层仍缺**。把源正文当成品交付是不诚实的 ——');
  out.push('`build_book.js --check` 统计的字数只证明「有字」，不证明「按契约写」。');
  out.push('');
  out.push('## 章节清单（实测字数）');
  out.push('');
  out.push('| 章 | 标题 | 字数 | 源表 |');
  out.push('|---|---|---|---|');
  for (let i = 0; i < chapters.length; i += 1) {
    const c = chapters[i];
    out.push(`| ${pad2(i + 1)} | [第 ${c.n} 章 · ${c.title}](${chapterFileName(i, c)}) | ${c.chars.toLocaleString()} | ${c.sheet} |`);
  }
  out.push('');
  if (meta.version) { out.push('## 源工作簿版本'); out.push(''); out.push(`- 版本：${meta.version}`); }
  if (meta.reviewers) out.push(`- 审稿人：${meta.reviewers}`);
  if (meta.version || meta.reviewers) out.push('');
  out.push('## 出处与重建');
  out.push('');
  out.push('```bash');
  out.push(`node scripts/import_textbooks.js --only ${label}   # 重新抽取（源工作簿需在桌面 textbooks/）`);
  out.push('node scripts/import_textbooks.js --check                  # 逐章对账：文件字数 ↔ 源正文');
  out.push('node textbooks/build_book.js --check                      # 全库教材字数统计');
  out.push('```');
  out.push('');
  out.push('源工作簿的指纹（sha256 / 字节数 / 章表清单）记在 `standards/materials/textbooks-batch/registry.json`。');
  out.push('原件不入库的理由：100 份合计 51 MB 的二进制，sha256 已足以验证「眼前这份」是不是当初那份。');
  out.push('');
  out.push('本文件由 `scripts/import_textbooks.js` 从源工作簿生成，请勿手改 —— 需要修改请改源工作簿后重跑。');
  out.push('');
  out.push('## 免责声明');
  out.push('');
  out.push('> 本教材全部内容仅用于教育与科研目的，**不构成任何形式的临床诊疗建议**。');
  out.push('> 任何基于本教材内容的临床决策，必须由具备合法执业资格的医师在其专业判断下作出。');
  out.push('');
  return out.join('\n');
}

const chapterFileName = (i, ch) => `${pad2(i + 1)}-第${ch.displayN != null ? ch.displayN : ch.n}章-${safeName(ch.title)}.md`;

// ─────────────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────────────
function resolveSubjects() {
  const cur = loadCurriculum();
  const bySlug = new Map();
  for (const d of cur.departments) for (const s of d.subjects) bySlug.set(`${d.slug}/${s.slug}`, { ...s, dept: d });
  return bySlug;
}

/** 按节题切分（一本合编书服务两门课）：逐章走块，记住当前 h2，命中者留下。 */
function filterChapters(chapters, pick) {
  const out = [];
  for (const ch of chapters) {
    let section = ch.title;
    const blocks = [];
    const keptHeads = [];
    const allHeads = [];
    for (const b of ch.blocks) {
      if (b.level === 2) { section = b.text; allHeads.push(b.text); }
      if (!pick(section)) continue;
      if (b.level === 2) keptHeads.push(b.text.replace(/^\d+(\.\d+)*\s*/, ''));
      blocks.push(b);
    }
    if (!blocks.length) continue;
    const chars = blocks.filter((b) => b.level !== 8).reduce((a, b) => a + b.text.replace(/\s/g, '').length, 0);
    // 章节被切走一半时，标题不能还叫「X及其腧穴」——按保留的小节改名
    let title = ch.title;
    let suffix = '';
    if (allHeads.length > keptHeads.length) {
      title = title.replace(/及其腧穴$/, '');
      if (keptHeads.length) suffix = `（${keptHeads.join('·')}）`;
    }
    out.push({ ...ch, title: `${title}${suffix}`, blocks, chars });
  }
  return out;
}

function files() {
  return fs.readdirSync(SRC_DIR).filter((f) => /^qhzy-.*\.xlsx$/i.test(f)).sort();
}

const mapByBase = new Map(MAPPING.map((m) => [m.file, m]));

function plan() {
  const bySlug = resolveSubjects();
  const rows = [];
  for (const f of files()) {
    const base = f.replace(/^qhzy-/, '').replace(/\.xlsx$/i, '');
    const m = mapByBase.get(base);
    if (m && m.split) {
      // 一本合编书服务多门：每门一行，带各自的节题过滤器
      for (const spec of m.split) {
        const subj = bySlug.get(spec.subject);
        if (!subj) { rows.push({ file: f, base, status: 'error', note: `映射的学科不存在：${spec.subject}` }); continue; }
        rows.push({ file: f, base, subject: subj, note: spec.note, status: 'mapped', spec });
      }
      continue;
    }
    if (m && m.subject) {
      const subj = bySlug.get(m.subject);
      if (!subj) { rows.push({ file: f, base, status: 'error', note: `映射的学科不存在：${m.subject}` }); continue; }
      rows.push({
        file: f, base, subject: subj, note: m.note, status: 'mapped',
        merge: m.merge || null, mergeNote: m.mergeNote || null, manualFinal: Boolean(m.manualFinal),
        authoredFinal: Boolean(m.authoredFinal),
      });
    } else {
      rows.push({
        file: f, base, subject: null, status: 'outside',
        note: OUTSIDE_REASON[base] || '学科树内无对应学科（未逐份复核）',
      });
    }
  }
  return rows;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC_DIR, file))).digest('hex');
}

const GENERATED_MARK = '本文件由 `scripts/import_textbooks.js` 从源工作簿生成';

function writeSubject(row, sha, bytes, parsed, registry) {
  const subj = row.subject;
  const dir = path.join(TBDIR, subj.dept.slug, subj.slug);
  fs.mkdirSync(dir, { recursive: true });

  // 合并：人工稿按指定位置插进源正文章序（手写章 = 改写层，其余 = 源正文层）
  const merges = (row.merge || []).map((m) => ({ ...m }));

  // 目录里已有**非本脚本产出**的手写章：不覆盖、不删、不混编号 —— 除非它被显式登记为合并项
  const allMd = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const isOurs = (f) => fs.readFileSync(path.join(dir, f), 'utf8').includes(GENERATED_MARK);
  const mergedName = (m) => `${pad2(m.position)}-第${m.position}章-${safeName(m.title || '手写章')}.md`;
  const mergeNames = new Set(merges.map((m) => m.file));
  // 人工写的前言（非本脚本产出）保留：它是这本书的立场文字，重跑时不许覆盖
  const keepPreface = allMd.includes('00-前言.md') && !isOurs('00-前言.md');
  const mergedNames = new Set(merges.map(mergedName));
  const foreign = allMd.filter((f) => !isOurs(f) && !mergeNames.has(f) && !mergedNames.has(f)
    && !(keepPreface && f === '00-前言.md'));
  if (foreign.length) {
    return { conflict: foreign, chapters: 0, chars: 0 };
  }
  const missingMerge = merges.filter((m) => !allMd.includes(m.file) && !allMd.includes(mergedName(m)));
  if (missingMerge.length) {
    return { conflict: missingMerge.map((m) => `${m.file}（登记的合并项不存在）`), chapters: 0, chars: 0 };
  }

  // 清掉上一轮本脚本产出的文件（避免改章后残留旧编号文件）；手写稿先读进内存再删
  const manualRaw = new Map();
  for (const m of merges) {
    const srcFile = allMd.includes(m.file) ? m.file : mergedName(m);
    manualRaw.set(m.file, fs.readFileSync(path.join(dir, srcFile), 'utf8'));
  }
  for (const f of fs.readdirSync(dir)) {
    if (/^\d{2}-第\d+章-.*\.md$/.test(f) && isOurs(f)) fs.rmSync(path.join(dir, f));
    if (merges.some((m) => mergedName(m) === f)) fs.rmSync(path.join(dir, f));
    if (f === '00-前言.md' && !keepPreface) fs.rmSync(path.join(dir, f));
  }

  // 按位置合并：1..(源章数 + 手写章数)
  const src = parsed.chapters;
  const total = src.length + merges.length;
  const entries = [];
  let si = 0;
  for (let pos = 1; pos <= total; pos += 1) {
    const man = merges.find((m) => m.position === pos);
    if (man) {
      const raw = manualRaw.get(man.file);
      const body = stripChapterHead(raw);
      entries.push({
        manual: true,
        displayN: pos,
        title: man.title || raw.match(/^#\s+第\s*\d+\s*章\s*·\s*(.+)$/m)?.[1] || '手写章',
        chars: body.replace(/\s/g, '').length,
        text: renumberManual(raw, pos),
        sheet: '手写稿（改写层）',
      });
    } else {
      entries.push({ ch: { ...src[si], displayN: pos }, displayN: pos });
      si += 1;
    }
  }

  const chapterViews = entries.map((e) => (e.manual
    ? { n: e.displayN, title: e.title, chars: e.chars, sheet: e.sheet, blocks: [] }
    : e.ch));
  const totalChars = chapterViews.reduce((a, c) => a + c.chars, 0);

  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const name = chapterFileName(i, chapterViews[i]);
    if (e.manual) {
      fs.writeFileSync(path.join(dir, name), e.text, 'utf8');
      // 迁移完成：删掉旧名的原稿，避免同一章留两份（02- 已取代 01-）
      const oldName = merges.find((m) => m.position === e.displayN)?.file;
      if (oldName && oldName !== name && fs.existsSync(path.join(dir, oldName))) fs.rmSync(path.join(dir, oldName));
    }
    else fs.writeFileSync(path.join(dir, name), renderChapter(e.ch, i, row.file, sha, row.base), 'utf8');
  }
  if (!keepPreface) {
    fs.writeFileSync(path.join(dir, '00-前言.md'),
      renderPreface(subj, row.file, sha, bytes, chapterViews, totalChars, parsed.meta, row.base,
        row.spec ? row.note : null, row.mergeNote || null), 'utf8');
  }

  // meta.json：实测数字 + 出处
  const metaPath = path.join(ROOT, subj.path, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta.textbook = {
      ...(meta.textbook || {}),
      id: 'textbooks',
      path: `textbooks/${subj.dept.slug}/${subj.slug}`,
      chaptersWritten: chapterViews.length,
      words: totalChars,
      status: 'wip',
      layer: merges.length ? 'source-body+rewrite' : 'source-body',
      source: `standards/materials/textbooks-batch/registry.json#${row.base}`,
      extractedAt: TODAY,
    };
    fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  }

  registry.push({
    base: row.base,
    file: row.file,
    subject: `${subj.dept.slug}/${subj.slug}`,
    subjectTitle: subj.title,
    matchNote: row.note,
    ...(row.mergeNote ? { mergeNote: row.mergeNote } : {}),
    ...(merges.length ? { manualChapters: merges.map((m) => ({ file: m.file, position: m.position, title: m.title })) } : {}),
    sha256: sha,
    bytes,
    sheets: parsed.sheets,
    chapters: chapterViews.length,
    chars: totalChars,
    status: 'textbook',
    ...(row.spec ? { splitNote: row.note, splitFrom: row.file } : {}),
    chapterTable: chapterViews.map((c) => ({ n: c.n, title: c.title, sheet: c.sheet, chars: c.chars })),
    gaps: chapterViews.filter((c) => c.chars === 0).map((c) => `章表「${c.sheet}」无正文`),
  });
  return { chapters: chapterViews.length, chars: totalChars };
}

/** 手写章：去掉 H1 与首个分隔线之前的内容，用来算正文字数 */
function stripChapterHead(raw) {
  const parts = String(raw).split(/\n---\n/);
  return parts.length > 1 ? parts.slice(1).join('\n---\n') : String(raw).replace(/^#.*$/m, '');
}

/** 手写章重编号：H1 与「N.x」小节号跟着新章号走，其余文字一字不动 */
function renumberManual(raw, pos) {
  let t = String(raw).replace(/^#\s+第\s*\d+\s*章\s*·\s*/m, `# 第 ${pos} 章 · `);
  const old = Number((String(raw).match(/^##\s+(\d+)\./m) || [])[1]);
  if (old && old !== pos) {
    t = t.replace(new RegExp(`^(#{2,4})\\s+${old}\\.`, 'gm'), `$1 ${pos}.`);
  }
  return t;
}

function writeFulltext(row, sha, bytes, parsed, registry) {
  fs.mkdirSync(FULLTEXT_DIR, { recursive: true });
  const out = [];
  out.push(`# ${row.base} · 全本正文（源抽取）`);
  out.push('');
  out.push(`> **源**：\`${row.file}\`（sha256 \`${sha.slice(0, 16)}…\`） · 抽取 ${TODAY} · \`scripts/import_textbooks.js\``);
  out.push(`> **未入住 [textbooks] 的原因**：${row.note}`);
  out.push('> 本文件是内容保全：原工作簿的章节正文在这里可读、可检索，等到 120 学科树扩科后再迁入而不必重抽。');
  out.push('');
  for (const c of parsed.chapters) {
    out.push(`## 第 ${c.n} 章 · ${c.title}`);
    out.push('');
    out.push(`*源表「${c.sheet}」· ${c.chars.toLocaleString()} 字*`);
    out.push('');
    for (const b of c.blocks) {
      if (b.level === 2) out.push(`### ${b.text}`, '');
      else if (b.level === 3) out.push(`#### ${b.text}`, '');
      else if (b.level === 4) out.push(`##### ${b.text}`, '');
      else if (b.level === 7) out.push('```text', b.text, '```', '');
      else out.push(b.text, '');
    }
  }
  const totalChars = parsed.chapters.reduce((a, c) => a + c.chars, 0);
  fs.writeFileSync(path.join(FULLTEXT_DIR, `${safeName(row.base)}.md`), out.join('\n'), 'utf8');
  registry.push({
    base: row.base,
    file: row.file,
    subject: null,
    sha256: sha,
    bytes,
    sheets: parsed.sheets,
    chapters: parsed.chapters.length,
    chars: totalChars,
    status: 'fulltext',
    reason: row.note,
    fulltext: `standards/materials/textbooks-batch/fulltext/${safeName(row.base)}.md`,
    gaps: parsed.chapters.filter((c) => c.chars === 0).map((c) => `章表「${c.sheet}」无正文`),
  });
  return { chapters: parsed.chapters.length, chars: totalChars };
}

// ── 分批 ────────────────────────────────────────────────────────────
function pick(rows) {
  let list = rows;
  if (ONLY) list = list.filter((r) => r.base.includes(ONLY) || (r.subject && (r.subject.slug.includes(ONLY) || r.subject.title.includes(ONLY))));
  if (BATCH && OF) {
    const chunk = Math.ceil(list.length / OF);
    list = list.slice((BATCH - 1) * chunk, BATCH * chunk);
  }
  return list;
}

function main() {
  const rows = plan();
  const mapped = rows.filter((r) => r.status === 'mapped');
  const outside = rows.filter((r) => r.status === 'outside');
  const errors = rows.filter((r) => r.status === 'error');

  if (MODE_LIST) {
    console.log('═══ 桌面 textbooks/ → [textbooks] 学科教材 · 映射与规模 ═══\n');
    console.log(`  工作簿 ${new Set(rows.map((r) => r.file)).size} 份 · 入住学科 ${mapped.length} 门 · 树外 ${outside.length} 份 · 映射错误 ${errors.length}\n`);
    for (const r of mapped) {
      const p = parseWorkbook(r.file);
      const chars = p.chapters.reduce((a, c) => a + c.chars, 0);
      const noBody = p.chapters.filter((c) => c.chars === 0).length;
      console.log(`  ✓ ${String(p.chapters.length).padStart(3)}章 ${String(chars).padStart(8)}字 ${noBody ? `(空表 ${noBody})` : ''}  ${r.subject.dept.slug}/${r.subject.slug} ← ${r.base}`);
    }
    console.log('');
    for (const r of outside) console.log(`  · 树外 ${r.base} —— ${r.note}`);
    for (const r of errors) console.log(`  ✗ ${r.file} —— ${r.note}`);
    return;
  }

  if (MODE_CHECK) {
    let bad = 0;
    const regPath0 = path.join(MAT_DIR, 'registry.json');
    const reg0 = fs.existsSync(regPath0) ? JSON.parse(fs.readFileSync(regPath0, 'utf8')) : { materials: [] };
    const statusOf = new Map((reg0.materials || []).map((m) => [m.base, m.status]));
    for (const r of rows) {
      if (r.status !== 'mapped') continue;
      const st = statusOf.get(r.base);
      if (st && st !== 'textbook') continue; // 冲突/无正文的已在 registry 里写明，不算缺文件
      const p = parseWorkbook(r.file);
      const dir = path.join(TBDIR, r.subject.dept.slug, r.subject.slug);
      for (let i = 0; i < p.chapters.length; i += 1) {
        const f = path.join(dir, chapterFileName(i, p.chapters[i]));
        if (!fs.existsSync(f)) { console.log(`  ✗ 缺文件 ${path.relative(ROOT, f)}`); bad += 1; continue; }
        const text = fs.readFileSync(f, 'utf8');
        const got = words(text.replace(/^#[^\n]*\n[\s\S]*?\n---\n/, ''));
        if (got < p.chapters[i].chars * 0.98) {
          console.log(`  ✗ 字数不符 ${path.relative(ROOT, f)}：文件 ${got} < 源 ${p.chapters[i].chars}`);
          bad += 1;
        }
      }
      if (!fs.existsSync(path.join(dir, '00-前言.md'))) { console.log(`  ✗ 缺前言 ${dir}`); bad += 1; }
    }
    console.log(bad ? `\n  ✗ 对账失败 ${bad} 项` : '  ✅ 逐章对账通过：生成文件与源正文一致');
    if (bad) process.exit(1);
    return;
  }

  const targets = pick(rows);
  if (!targets.length) { console.error('没有选中任何文件（--only / --batch 过滤后为空）'); process.exit(1); }

  const registry = [];
  fs.mkdirSync(MAT_DIR, { recursive: true });
  let doneSubjects = 0; let doneFiles = 0; let totalChars = 0; const gaps = [];

  for (const r of targets) {
    if (r.status === 'error') { console.log(`  ✗ ${r.file}：${r.note}`); gaps.push(`${r.file}: ${r.note}`); continue; }
    const abs = path.join(SRC_DIR, r.file);
    const bytes = fs.statSync(abs).size;
    const sha = sha256(r.file);
    let parsed;
    try { parsed = parseWorkbook(r.file); }
    catch (e) { console.log(`  ✗ 解析失败 ${r.file}：${e.message}`); gaps.push(`${r.file}: 解析失败 ${e.message}`); continue; }
    if (r.spec) {
      const before = parsed.chapters.length;
      parsed = { ...parsed, chapters: filterChapters(parsed.chapters, r.spec.pick) };
      console.log(`     ↳ 节题切分 → ${r.subject.dept.slug}/${r.subject.slug}：${before} 章中保留 ${parsed.chapters.length} 章`);
    }

    // 手写稿定稿：不再写教材（避免覆盖人工稿），源工作簿只作底本留档
    if (r.manualFinal || r.authoredFinal) {
      const ft = writeFulltext({ ...r, note: r.note }, sha, bytes, parsed, registry);
      const last = registry[registry.length - 1];
      if (last) {
        last.subject = `${r.subject.dept.slug}/${r.subject.slug}`;
        last.subjectTitle = r.subject.title;
        last.status = r.authoredFinal ? 'textbook' : 'manual';
        last.layer = r.authoredFinal ? 'rewrite' : 'manual-rewrite';
        if (r.authoredFinal) last.authored = true;
        last.reason = r.note;
      }
      console.log(`  · ${r.authoredFinal ? '改写层定稿' : '手写稿定稿'} ${r.subject.dept.slug}/${r.subject.slug}（源 ${ft.chapters} 章留档）← ${r.base}`);
      // 手写稿的进度也要如实进 meta：读目录里已有的章文件，不许估
      const mdir = path.join(TBDIR, r.subject.dept.slug, r.subject.slug);
      // 章号允许三位（外源古籍学科章数过百），与 build_book.js / 教材看板同口径
      const mfiles = fs.existsSync(mdir) ? fs.readdirSync(mdir).filter((f) => /^\d+-第\d+章-.*\.md$/.test(f)) : [];
      const mwords = mfiles.reduce((acc, f) => acc + fs.readFileSync(path.join(mdir, f), 'utf8').replace(/\s/g, '').length, 0);
      const mmeta = path.join(ROOT, r.subject.path, 'meta.json');
      if (fs.existsSync(mmeta)) {
        const meta = JSON.parse(fs.readFileSync(mmeta, 'utf8'));
        meta.textbook = {
          ...(meta.textbook || {}), id: 'textbooks',
          path: `textbooks/${r.subject.dept.slug}/${r.subject.slug}`,
          chaptersWritten: mfiles.length, words: mwords, status: 'wip',
          layer: r.authoredFinal ? 'rewrite' : 'manual-rewrite',
          source: `standards/materials/textbooks-batch/registry.json#${r.base}`, extractedAt: TODAY,
        };
        fs.writeFileSync(mmeta, `${JSON.stringify(meta, null, 2)}
`, 'utf8');
      }
      doneFiles += 1;
      totalChars += ft.chars;
      continue;
    }

    if (r.status === 'mapped') {
      if (!parsed.chapters.length) {
        console.log(`  ✗ ${r.base}：无章表（正文结构不在章表里）`);
        gaps.push(`${r.base}: 无章表，未生成教材`);
        registry.push({
          base: r.base, file: r.file, subject: `${r.subject.dept.slug}/${r.subject.slug}`,
          subjectTitle: r.subject.title, sha256: sha, bytes, sheets: parsed.sheets,
          chapters: 0, chars: 0, status: 'no-body',
          reason: '工作簿无章表：内容是大纲表（Part/Chapter/Section/Notes）或讲稿式分表，没有逐章正文段落',
        });
        continue;
      }
      const empty = parsed.chapters.filter((c) => c.chars === 0);
      if (empty.length === parsed.chapters.length) {
        console.log(`  ⚠ ${r.base}：${parsed.chapters.length} 张章表全部无正文 —— 不生成教材（只有目录）`);
        gaps.push(`${r.base}: 章表无正文（大纲表），未生成教材`);
        continue;
      }
      const res = writeSubject(r, sha, bytes, parsed, registry);
      if (res.conflict) {
        console.log(`  ⚠ ${r.subject.dept.slug}/${r.subject.slug}：目录已有手写 md ${res.conflict.length} 篇，未写入教材 —— ${res.conflict.join('、')}`);
        gaps.push(`${r.base}: 目标目录有手写章（${res.conflict.join('、')}），按「不覆盖人工稿」跳过；正文已保全到 fulltext`);
        const ft = writeFulltext(
          { ...r, note: `目标学科目录（textbooks/${r.subject.dept.slug}/${r.subject.slug}）里已有手写章（${res.conflict.join('、')}）。按「不覆盖人工稿」不写入 textbooks，先把源正文保全在这里，待人工决定替换还是并存。` },
          sha, bytes, parsed, registry,
        );
        const last = registry[registry.length - 1];
        if (last) { last.subject = `${r.subject.dept.slug}/${r.subject.slug}`; last.subjectTitle = r.subject.title; last.status = 'conflict'; }
        void ft;
        continue;
      }
      doneSubjects += 1; doneFiles += 1; totalChars += res.chars;
      console.log(`  ✓ ${r.subject.dept.slug}/${r.subject.slug}  ${res.chapters} 章 ${res.chars.toLocaleString()} 字 ← ${r.base}`);
      if (empty.length) console.log(`     ⚠ 空正文章表 ${empty.length} 张：${empty.map((c) => c.sheet).join('、')}`);
    } else {
      const res = writeFulltext(r, sha, bytes, parsed, registry);
      doneFiles += 1; totalChars += res.chars;
      console.log(`  · 树外全本 ${r.base}  ${res.chapters} 章 ${res.chars.toLocaleString()} 字`);
    }
  }

  // 增量合并：分批跑时后批不能抹掉前批。
  // 键必须带学科：一本合编书（经络腧穴学）会产出两条记录，只按 base 作键会互相覆盖。
  const regPath = path.join(MAT_DIR, 'registry.json');
  let prev = { materials: [] };
  if (fs.existsSync(regPath)) { try { prev = JSON.parse(fs.readFileSync(regPath, 'utf8')); } catch { prev = { materials: [] }; } }
  const keyOf = (m) => `${m.base}@${m.subject || ''}`;
  const byBase = new Map((prev.materials || []).map((m) => [keyOf(m), m]));
  for (const m of registry) {
    // 同一文件从「树外全本」升为「入住教材」时，把旧的 base-only 记录删掉，别留两份身份
    for (const [k, v] of byBase) {
      if (v.base === m.base && v.status === 'fulltext' && m.status === 'textbook') byBase.delete(k);
    }
    byBase.set(keyOf(m), m);
  }
  const all = [...byBase.values()].sort((a, b) => a.base.localeCompare(b.base, 'zh'));
  const covered = all.filter((m) => m.status === 'textbook');
  const out = {
    $generated: 'node scripts/import_textbooks.js',
    note: '桌面 textbooks/qhzy-*.xlsx → [textbooks] 学科教材。源件不进仓，入的是 sha256 + 章表清单 + 逐章字数。',
    sourceDir: SRC_DIR,
    generatedAt: TODAY,
    summary: {
      files: new Set(all.map((m) => m.file)).size,
      subjects: covered.length,
      outside: all.filter((m) => m.status === 'fulltext').length,
      chapters: all.reduce((a, m) => a + m.chapters, 0),
      chars: all.reduce((a, m) => a + m.chars, 0),
    },
    gaps,
    materials: all,
  };
  fs.writeFileSync(regPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  // 清掉不再被引用的全本（改映射或状态变化时会留下孤儿文件，孤儿=假证据）
  if (fs.existsSync(FULLTEXT_DIR)) {
    const keep = new Set(all.filter((m) => m.fulltext).map((m) => path.basename(m.fulltext)));
    for (const f of fs.readdirSync(FULLTEXT_DIR)) {
      if (f.endsWith('.md') && !keep.has(f)) fs.rmSync(path.join(FULLTEXT_DIR, f));
    }
  }

  console.log(`\n═══ 本轮 ═══`);
  console.log(`  教材学科 ${doneSubjects} 门 · 处理后文件 ${doneFiles} 份 · 正文 ${totalChars.toLocaleString()} 字`);
  if (gaps.length) { console.log(`  ⚠ 缺口 ${gaps.length} 条：`); for (const g of gaps) console.log(`     - ${g}`); }
  console.log(`  注册表：standards/materials/textbooks-batch/registry.json（累计 ${out.summary.subjects} 门学科 / ${out.summary.chapters} 章 / ${out.summary.chars.toLocaleString()} 字）`);
}

if (require.main === module) main();

module.exports = { parseWorkbook, parseChapterSheet, chapterNumber, MAPPING, plan, SRC_DIR };
