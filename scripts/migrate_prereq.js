#!/usr/bin/env node
/**
 * scripts/migrate_prereq.js —— 给 subjectTuple 加 `prereq`，并补第 9/10 学期的轮转 / 毕设课
 *
 * 为什么现在做：
 *   排课原来只能靠「学期 + 类型」两个字段推先后，`curriculum.json` 里**没有任何先修边** ——
 *   于是「中医诊断学在中医内科学之前」只是碰巧学期不同，不是被声明过的依赖，改一个学期没人会报错。
 *   这一步把先修关系写成数据（每门课 1–3 条边），校验层（audit_curriculum.js）会挡住
 *   「前置课排在后面」「引用不存在的课」「成环」三类错误；看板与 SCHEDULE.md 的院系内顺序改成按图拓扑排。
 *
 * 同时补第 9、10 学期：此前 169 门课全挤在 1–8 学期，五卷的「🍂 老·固化」「🔄 已·转型」两卷是空卷。
 *   每个院系加 2 门：第 9 学期「轮转 / 专业实践」（108 学时）、第 10 学期「毕业设计与知识移交」（72 学时）。
 *
 * 边的来源（可审计，不是猜的）：
 *   1. 经典链：中基 → 内经/诊断 → 伤寒 → 金匮/温病 → 临床各科
 *   2. 桥梁课：中药学 → 方剂学 → 临床；解剖 → 生理 → 病理 → 药理/临床
 *   3. 工程链：AI 导论 → 机器学习 → NLP/知识树 → 智能体
 *   4. 专科链：骨伤解剖 → 骨伤科学基础 → 正骨/筋伤/手法 → 脊柱/关节
 *   规则约束：前置课学期必须**严格早于**本课学期（否则排不出来），由本脚本与审计共同把关。
 *
 * 用法：
 *   node scripts/migrate_prereq.js --dry     只校验、不写盘
 *   node scripts/migrate_prereq.js           写 curriculum.json（幂等：已有 prereq 的科目以本表为准）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CUR = path.join(ROOT, 'curriculum.json');
const DRY = process.argv.includes('--dry');

const cur = JSON.parse(fs.readFileSync(CUR, 'utf8'));

// ── 先修边（作者维护；值里不带 '/' 的 = 同院系）───────────────────────
const PREREQ = {
  '02-zhongyao/21-zhongyao-du-li-xue': ['01-zhongyaoxue', '07-zhongyao-yaoli-xue'],
  '01-zhongyi/01-zhongyi-jichu-lilun': [],
  '01-zhongyi/02-yi-gu-wen': [],
  '01-zhongyi/03-zhongguo-yixue-shi': [],
  '01-zhongyi/04-zhongyi-tizhi-xue': ['01-zhongyi-jichu-lilun', '05-zhongyi-zhen-duan-xue'],
  '01-zhongyi/05-zhongyi-zhen-duan-xue': ['01-zhongyi-jichu-lilun'],
  '01-zhongyi/06-neijing-xuandu': ['01-zhongyi-jichu-lilun', '02-yi-gu-wen'],
  '01-zhongyi/07-shanghanlun': ['01-zhongyi-jichu-lilun', '06-neijing-xuandu', '05-zhongyi-zhen-duan-xue'],
  '01-zhongyi/08-jingui-yaolue': ['07-shanghanlun', '05-zhongyi-zhen-duan-xue'],
  '01-zhongyi/09-wenbing-xue': ['07-shanghanlun', '06-neijing-xuandu'],
  // 汇通期选读：既要用六经（伤寒）也要用卫气营血（温病），两套坐标各读一半
  '01-zhongyi/23-zhongcan-xilu-xuandu': ['09-wenbing-xue', '07-shanghanlun'],
  '01-zhongyi/10-zhongyi-neike-xue': ['05-zhongyi-zhen-duan-xue', '07-shanghanlun', '02-zhongyao/01-zhongyaoxue', '02-zhongyao/03-fangjixue'],
  '01-zhongyi/11-zhongyi-waike-xue': ['10-zhongyi-neike-xue', '02-zhongyao/03-fangjixue'],
  '01-zhongyi/12-zhongyi-fuke-xue': ['10-zhongyi-neike-xue', '02-zhongyao/03-fangjixue'],
  '01-zhongyi/13-zhongyi-erke-xue': ['10-zhongyi-neike-xue', '02-zhongyao/03-fangjixue'],
  '01-zhongyi/14-zhongyi-zhenghou-xue': ['05-zhongyi-zhen-duan-xue', '10-zhongyi-neike-xue', '11-zhongyi-waike-xue'],
  '01-zhongyi/15-zhongyi-gejia-xueshuo': ['06-neijing-xuandu', '07-shanghanlun'],
  '01-zhongyi/16-zhongyi-zhexue-shi': ['01-zhongyi-jichu-lilun'],
  '01-zhongyi/17-zhongyi-jizhen-xue': ['10-zhongyi-neike-xue', '11-zhongyi-waike-xue'],
  '01-zhongyi/18-zhongyi-gubing-xue': ['04-gushang/03-gushang-kexue-jichu', '10-zhongyi-neike-xue'],
  '01-zhongyi/19-zhongyi-laonianbing-xue': ['10-zhongyi-neike-xue'],
  '01-zhongyi/20-zhongyi-jingshenbing-xue': ['05-zhongyi-zhen-duan-xue', '10-zhongyi-neike-xue'],

  '02-zhongyao/01-zhongyaoxue': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '02-zhongyao/02-yaoyong-zhiwu-xue': [],
  '02-zhongyao/03-fangjixue': ['01-zhongyaoxue', '01-zhongyi/01-zhongyi-jichu-lilun'],
  '02-zhongyao/04-zhongyao-ziyuan-xue': ['02-yaoyong-zhiwu-xue'],
  '02-zhongyao/05-zhongyao-jianding-xue': ['02-yaoyong-zhiwu-xue', '01-zhongyaoxue'],
  '02-zhongyao/06-zhongyao-huaxue': ['09-jichu/07-shenghua-xue'],
  '02-zhongyao/07-zhongyao-yaoli-xue': ['06-zhongyao-huaxue', '09-jichu/12-yaoli-xue'],
  '02-zhongyao/08-zhongyao-paozhi-xue': ['01-zhongyaoxue', '05-zhongyao-jianding-xue'],
  '02-zhongyao/09-zhongyao-yaoji-xue': ['06-zhongyao-huaxue'],
  '02-zhongyao/10-zhongyao-fenxi-xue': ['06-zhongyao-huaxue', '09-zhongyao-yaoji-xue'],
  '02-zhongyao/11-zhongyao-yaodai-donglixue': ['07-zhongyao-yaoli-xue', '09-jichu/12-yaoli-xue'],
  '02-zhongyao/12-daodi-yaocai': ['04-zhongyao-ziyuan-xue', '05-zhongyao-jianding-xue'],
  '02-zhongyao/13-zhongchengyao-linchuang': ['03-fangjixue', '09-zhongyao-yaoji-xue', '07-zhongyao-yaoli-xue'],
  '02-zhongyao/14-peiwu-yu-jinji': ['01-zhongyaoxue', '03-fangjixue'],
  '02-zhongyao/15-zhongyao-xinyao-yanfa': ['13-zhongchengyao-linchuang', '10-zhongyao-fenxi-xue'],
  '02-zhongyao/16-linchuang-zhongyaoxue': ['01-zhongyaoxue', '07-zhongyao-yaoli-xue'],
  '02-zhongyao/17-zhongyao-shangpin-xue': ['04-zhongyao-ziyuan-xue'],
  '02-zhongyao/18-yaoshi-guanli-xue': ['06-guanli/02-zhongyiyao-zhengce-fagui'],

  '03-zhenjiu/01-jingluo-xue': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '03-zhenjiu/02-shuxue-xue': ['01-jingluo-xue', '09-jichu/01-renti-jiepou-xue'],
  '03-zhenjiu/03-zhenjiu-yiji-xuan': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '03-zhenjiu/04-qigong-xue': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '03-zhenjiu/05-tuina-xue': ['01-jingluo-xue', '02-shuxue-xue'],
  '03-zhenjiu/06-tuina-shoufa-xue': ['01-jingluo-xue'],
  '03-zhenjiu/07-cifa-jiufa-xue': ['02-shuxue-xue'],
  '03-zhenjiu/08-zhenjiu-zhiliao-xue': ['02-shuxue-xue', '07-cifa-jiufa-xue', '01-zhongyi/05-zhongyi-zhen-duan-xue'],
  '03-zhenjiu/09-kangfu-yixue-jichu': ['09-jichu/06-shengli-xue'],
  '03-zhenjiu/10-shiyan-zhenjiu-xue': ['08-zhenjiu-zhiliao-xue', '09-jichu/06-shengli-xue'],
  '03-zhenjiu/11-wuli-zhiliao': ['09-kangfu-yixue-jichu'],
  '03-zhenjiu/12-erxue-zhenduan-xue': ['02-shuxue-xue', '08-zhenjiu-zhiliao-xue'],
  '03-zhenjiu/13-zhendao-yixue': ['08-zhenjiu-zhiliao-xue', '09-jichu/01-renti-jiepou-xue'],
  '03-zhenjiu/14-zhenjiu-zhentong-mazui': ['07-cifa-jiufa-xue', '08-zhenjiu-zhiliao-xue'],
  '03-zhenjiu/15-zhongyi-kangfu-xue': ['09-kangfu-yixue-jichu', '05-tuina-xue'],
  '03-zhenjiu/16-zhenjiu-xue': ['01-jingluo-xue', '02-shuxue-xue', '07-cifa-jiufa-xue'],
  '03-zhenjiu/17-gejia-zhenjiu-xueshuo': ['03-zhenjiu-yiji-xuan'],
  '03-zhenjiu/18-tuina-gongfa-xue': ['01-jingluo-xue'],
  '03-zhenjiu/19-tuina-zhiliao-xue': ['05-tuina-xue', '06-tuina-shoufa-xue'],
  '03-zhenjiu/20-xiaoer-tuina-xue': ['19-tuina-zhiliao-xue', '01-zhongyi/13-zhongyi-erke-xue'],

  '04-gushang/01-zhongyi-yundong-xue': ['09-jichu/01-renti-jiepou-xue', '09-jichu/06-shengli-xue'],
  '04-gushang/02-yao-shang-jiepou': ['09-jichu/01-renti-jiepou-xue'],
  '04-gushang/03-gushang-kexue-jichu': ['02-yao-shang-jiepou', '01-zhongyi/01-zhongyi-jichu-lilun'],
  '04-gushang/04-chuangshang-jijiu-xue': ['02-yao-shang-jiepou', '09-jichu/06-shengli-xue'],
  '04-gushang/05-yundong-yixue': ['01-zhongyi-yundong-xue', '09-jichu/11-bingli-shengli-xue'],
  '04-gushang/06-zhongyi-zhenggu-xue': ['03-gushang-kexue-jichu', '04-chuangshang-jijiu-xue'],
  '04-gushang/07-zhongyi-jinshang-xue': ['03-gushang-kexue-jichu', '02-yao-shang-jiepou'],
  '04-gushang/08-gushang-shoufa-zhiliao': ['03-gushang-kexue-jichu', '02-yao-shang-jiepou'],
  '04-gushang/09-guke-yingxiang-zhenduan': ['02-yao-shang-jiepou'],
  '04-gushang/10-jizhu-bing-xue': ['06-zhongyi-zhenggu-xue', '09-guke-yingxiang-zhenduan'],
  '04-gushang/11-guanjie-bing-xue': ['06-zhongyi-zhenggu-xue', '09-guke-yingxiang-zhenduan'],
  '04-gushang/12-guzhishusong-tuibian': ['03-gushang-kexue-jichu', '09-jichu/11-bingli-shengli-xue'],
  '04-gushang/13-zhongyi-zhengji-xue': ['06-zhongyi-zhenggu-xue', '08-gushang-shoufa-zhiliao'],
  '04-gushang/14-kangfu-gongcheng-zhiju': ['13-zhongyi-zhengji-xue', '11-guanjie-bing-xue'],
  '04-gushang/15-gushang-kangfu-pingding': ['10-jizhu-bing-xue', '11-guanjie-bing-xue'],

  '05-huli/01-zhongyi-huli-jichu': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '05-huli/02-jichu-huli-xue': [],
  '05-huli/03-jiankang-pinggu': ['02-jichu-huli-xue', '09-jichu/06-shengli-xue'],
  '05-huli/04-zhongyi-huli-jishu': ['01-zhongyi-huli-jichu'],
  '05-huli/05-zhongyi-yangsheng-xue': ['01-zhongyi/01-zhongyi-jichu-lilun'],
  '05-huli/06-zhongyi-xinli-xue': ['01-zhongyi/01-zhongyi-jichu-lilun', '17-huli-xinli-xue'],
  '05-huli/07-neike-huli-xue': ['03-jiankang-pinggu', '09-jichu/10-bingli-xue', '09-jichu/12-yaoli-xue'],
  '05-huli/08-waike-huli-xue': ['02-jichu-huli-xue', '09-jichu/10-bingli-xue'],
  '05-huli/09-fuchanke-huli-xue': ['07-neike-huli-xue'],
  '05-huli/10-erke-huli-xue': ['07-neike-huli-xue'],
  '05-huli/11-shequ-huli-xue': ['03-jiankang-pinggu'],
  '05-huli/12-jiwei-zhengzheng-huli': ['07-neike-huli-xue', '20-jijiu-huli-xue'],
  '05-huli/13-huli-guanli-xue': ['06-guanli/04-weisheng-shiye-guanli'],
  '05-huli/14-huli-lunli-fagui': [],
  '05-huli/15-huli-yanjiu-zhengxun': ['06-guanli/01-yixue-tongjixue'],
  '05-huli/16-huli-xue-daolun': [],
  '05-huli/17-huli-xinli-xue': ['16-huli-xue-daolun'],
  '05-huli/18-huli-zonghe-jineng': ['02-jichu-huli-xue'],
  '05-huli/19-huli-renwen-goutong': ['16-huli-xue-daolun'],
  '05-huli/20-jijiu-huli-xue': ['02-jichu-huli-xue'],
  '05-huli/21-laonian-huli-xue': ['07-neike-huli-xue'],
  '05-huli/22-kangfu-huli-xue': ['07-neike-huli-xue'],
  '05-huli/23-jingshenke-huli-xue': ['17-huli-xinli-xue'],
  '05-huli/24-zhongyi-huli-xue': ['01-zhongyi-huli-jichu', '04-zhongyi-huli-jishu'],
  '05-huli/25-zhongyi-linchuang-huli': ['24-zhongyi-huli-xue', '07-neike-huli-xue'],

  '06-guanli/01-yixue-tongjixue': [],
  '06-guanli/02-zhongyiyao-zhengce-fagui': [],
  '06-guanli/03-zhongyi-guanli-xue': ['02-zhongyiyao-zhengce-fagui'],
  '06-guanli/04-weisheng-shiye-guanli': ['02-zhongyiyao-zhengce-fagui'],
  '06-guanli/05-zhongyi-wenhua-chuanbo': ['01-zhongyi/01-zhongyi-jichu-lilun', '01-zhongyi/03-zhongguo-yixue-shi'],
  '06-guanli/06-yiyuan-guanli-xue': ['04-weisheng-shiye-guanli'],
  '06-guanli/07-zhongyi-jiaoyu-xue': ['05-zhongyi-wenhua-chuanbo'],
  '06-guanli/08-jiankang-fuwu-guanli': ['04-weisheng-shiye-guanli'],
  '06-guanli/09-yiliao-baoxian-jingji': ['01-yixue-tongjixue', '04-weisheng-shiye-guanli'],
  '06-guanli/10-yixue-xinxi-guanli': ['01-yixue-tongjixue'],
  '06-guanli/11-yiyuan-xinxihua-bingan': ['01-yixue-tongjixue'],
  '06-guanli/12-zhongyiyao-biaozhunhua': ['02-zhongyiyao-zhengce-fagui'],
  '06-guanli/13-linchuang-keyan-fangfa': ['01-yixue-tongjixue'],
  '06-guanli/14-zhishichanquan-zhuanhua': ['12-zhongyiyao-biaozhunhua'],
  '06-guanli/15-zhongyi-guojijiaoyu': ['07-zhongyi-jiaoyu-xue'],
  '06-guanli/16-gonggong-guanli-xue': [],
  '06-guanli/17-guanli-xue-jichu': [],
  '06-guanli/18-guanli-xinli-xue': [],
  '06-guanli/19-shehui-yixue': ['04-weisheng-shiye-guanli'],
  '06-guanli/20-weisheng-fa-xue': ['02-zhongyiyao-zhengce-fagui'],
  '06-guanli/21-yixue-lunli-xue': [],
  '06-guanli/22-yiyao-renli-ziyuan': ['17-guanli-xue-jichu'],
  '06-guanli/23-yiyuan-kuaiji-caiwu': ['06-yiyuan-guanli-xue'],
  '06-guanli/24-zhongyi-jiankang-guanli': ['08-jiankang-fuwu-guanli'],

  '07-zhineng/01-yixue-rengong-zhineng-daolun': [],
  '07-zhineng/02-zhongyi-ruanjian-jiagou-xue': ['01-yixue-rengong-zhineng-daolun'],
  '07-zhineng/03-zhongyi-zhineng-shebei': ['01-yixue-rengong-zhineng-daolun'],
  '07-zhineng/04-zhongyi-ziran-yuyan-chuli': ['01-yixue-rengong-zhineng-daolun', '16-jiqi-xuexi'],
  '07-zhineng/05-zhongyi-zhishi-tupu': ['01-yixue-rengong-zhineng-daolun', '16-jiqi-xuexi'],
  '07-zhineng/06-zhongyi-zhineng-bianzheng': ['05-zhongyi-zhishi-tupu', '01-zhongyi/05-zhongyi-zhen-duan-xue'],
  '07-zhineng/07-yixue-tuxiang-shezhen': ['16-jiqi-xuexi', '03-zhongyi-zhineng-shebei'],
  '07-zhineng/08-maizhen-keguanhua': ['16-jiqi-xuexi', '03-zhongyi-zhineng-shebei'],
  '07-zhineng/09-zhongyi-dashuju-fenxi': ['16-jiqi-xuexi', '06-guanli/01-yixue-tongjixue'],
  '07-zhineng/10-llm-yu-zhongyi-zhinengti': ['04-zhongyi-ziran-yuyan-chuli', '05-zhongyi-zhishi-tupu'],
  '07-zhineng/11-zhongyi-jiqiren-xue': ['03-zhongyi-zhineng-shebei', '02-zhongyi-ruanjian-jiagou-xue'],
  '07-zhineng/12-shuzi-renti-xuni-fangzhen': ['09-jichu/01-renti-jiepou-xue', '07-yixue-tuxiang-shezhen'],
  '07-zhineng/13-zhongyi-duomotai-ronghe': ['04-zhongyi-ziran-yuyan-chuli', '07-yixue-tuxiang-shezhen', '08-maizhen-keguanhua'],
  '07-zhineng/14-yixue-shuju-anquan-yinsi': ['02-zhongyi-ruanjian-jiagou-xue'],
  '07-zhineng/15-zhongyi-ai-lunli-zhili': ['10-llm-yu-zhongyi-zhinengti'],
  '07-zhineng/16-jiqi-xuexi': ['01-yixue-rengong-zhineng-daolun'],
  '07-zhineng/17-zhongyi-xinxi-xue': ['01-yixue-rengong-zhineng-daolun'],

  '08-wuguan/01-erbihou-jiepou-shengli': ['09-jichu/01-renti-jiepou-xue'],
  '08-wuguan/02-kouqiang-jiepou-shengli': ['09-jichu/01-renti-jiepou-xue'],
  '08-wuguan/03-zhongyi-mianbu-wangzhen': ['01-zhongyi/01-zhongyi-jichu-lilun', '01-zhongyi/05-zhongyi-zhen-duan-xue'],
  '08-wuguan/04-yanke-guangxue-yanguang': ['09-jichu/06-shengli-xue'],
  '08-wuguan/05-zhongyi-wuguan-jingdian': ['01-zhongyi/01-zhongyi-jichu-lilun', '01-zhongyi/06-neijing-xuandu'],
  '08-wuguan/06-zhongyi-yanke-xue': ['01-zhongyi/05-zhongyi-zhen-duan-xue', '09-jichu/10-bingli-xue'],
  '08-wuguan/07-zhongyi-erbihou-xue': ['01-erbihou-jiepou-shengli', '01-zhongyi/05-zhongyi-zhen-duan-xue'],
  '08-wuguan/08-zhongyi-kouqiang-kexue': ['02-kouqiang-jiepou-shengli', '01-zhongyi/05-zhongyi-zhen-duan-xue'],
  '08-wuguan/09-kouqiang-neike-xue': ['02-kouqiang-jiepou-shengli'],
  '08-wuguan/10-yanke-yingxiang-jiancha': ['04-yanke-guangxue-yanguang'],
  '08-wuguan/11-kouqiang-hemian-waike': ['02-kouqiang-jiepou-shengli', '09-kouqiang-neike-xue'],
  '08-wuguan/12-kouqiang-xiufu-xue': ['02-kouqiang-jiepou-shengli'],
  '08-wuguan/13-kouqiang-zhengji-xue': ['02-kouqiang-jiepou-shengli'],
  '08-wuguan/14-zhongyi-sangyin-yixue': ['01-erbihou-jiepou-shengli', '05-zhongyi-wuguan-jingdian'],
  '08-wuguan/15-zhongyi-meirong-pifu': ['03-zhongyi-mianbu-wangzhen', '01-zhongyi/11-zhongyi-waike-xue'],

  '09-jichu/01-renti-jiepou-xue': [],
  '09-jichu/02-zuzhi-peitai-xue': [],
  '09-jichu/03-yixue-xibao-shengwu-xue': [],
  '09-jichu/04-yixue-shengwu-xue': ['03-yixue-xibao-shengwu-xue'],
  '09-jichu/05-zhengchang-renti-xue': ['01-renti-jiepou-xue', '02-zuzhi-peitai-xue'],
  '09-jichu/06-shengli-xue': ['01-renti-jiepou-xue', '03-yixue-xibao-shengwu-xue'],
  '09-jichu/07-shenghua-xue': ['03-yixue-xibao-shengwu-xue'],
  '09-jichu/08-jubu-jiepou-xue': ['01-renti-jiepou-xue', '05-zhengchang-renti-xue'],
  '09-jichu/09-yixue-yichuan-xue': ['03-yixue-xibao-shengwu-xue', '07-shenghua-xue'],
  '09-jichu/10-bingli-xue': ['06-shengli-xue', '07-shenghua-xue', '02-zuzhi-peitai-xue'],
  '09-jichu/11-bingli-shengli-xue': ['10-bingli-xue', '06-shengli-xue'],
  '09-jichu/12-yaoli-xue': ['06-shengli-xue', '10-bingli-xue'],
  '09-jichu/13-mianyi-bingyuan-shengwu': ['07-shenghua-xue', '02-zuzhi-peitai-xue'],
  '09-jichu/14-jibing-xue-jichu': ['10-bingli-xue'],
  '09-jichu/15-liuxingbing-xue': ['10-bingli-xue', '06-guanli/01-yixue-tongjixue'],
};

// ── 第 9 / 10 学期新增（轮转 / 专业实践 + 毕业设计）─────────────────
const NEW_SUBJECTS = [
  {
    dept: '01-zhongyi', slug: '21-zhongyi-linchuang-lunzhuan', title: '中医临床轮转', en: 'Clinical Rotation in TCM',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '接诊记录→结构化病历 / 辨证推理→决策日志 / 出科考核→评分量表',
    prereq: ['10-zhongyi-neike-xue', '11-zhongyi-waike-xue', '08-jingui-yaolue'],
    chapterTitles: [
      '心病科轮转：胸痹与心悸的辨证接诊',
      '肺病科轮转：咳嗽与喘证的辨证接诊',
      '脾胃病科轮转：胃痞与泄泻的辨证接诊',
      '肾病科轮转：水肿与淋证的辨证接诊',
      '脑病科轮转：眩晕与中风的辨证接诊',
      '出科考核与病例复盘（含结构化病历）',
    ],
  },
  {
    dept: '01-zhongyi', slug: '22-zhongyi-biye-sheji', title: '中医毕业设计与知识移交', en: 'TCM Capstone & Knowledge Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 28,
    bridge: '临床问题→可验证命题 / 病例与条文→数据集 / 结论→可复现包',
    prereq: ['21-zhongyi-linchuang-lunzhuan', '14-zhongyi-zhenghou-xue'],
    chapterTitles: [
      '通用流程与基本要求',
      '中医系·案例一：证候词典即服务——900 单元派生的 132 证基层辨证底座',
      '中医系·案例二：给「张从正＝攻邪」祛魅——学派词表消融的检索产品',
      '中医系·案例三：内经范畴检索——49 万字里的 12 个范畴与 Top 篇',
      '中药系·案例一：287 味药性味归经 API——给四诊仪与 HIS 补一张结构化药表',
      '中药系·案例二：方剂-药味对账——饮片集采时代的配伍可核账本',
      '中药系·案例三：药理 97 万字难度图谱——教培与继续教育的选题引擎',
      '针灸系·案例一：经络学底本从零建——4.2 万中医馆的培训基建',
      '针灸系·案例二：腧穴多经归属冲突表——ISO 针灸标准的落地校验',
      '针灸系·案例三：条文挂知识树——中医知识图谱的挂点服务',
      '骨伤系·案例一：骨病底本迁移——骨伤专科的路径化底座',
      '骨伤系·案例二：创伤时间窗清点——急诊骨伤的时点提醒器',
      '骨伤系·案例三：康复评定可复现包——社区康复的量表合规盒',
      '护理系·案例一：132 证→护理问题——中医护理的评估翻译器',
      '护理系·案例二：交接班五栏——护理交接的缺项显性化',
      '护理系·案例三：养生方案检查单——治未病的「忌」清单产品',
      '管理系·案例一：统计口径对齐——中医机构报表的守门员',
      '管理系·案例二：覆盖度双维报表——院校学科建设的诊断仪',
      '管理系·案例三：政策条文挂点——中医药政策的可检索合规库',
      '智能系·案例一：ICD-11 TM1 检索栈——中医病证的编码翻译层',
      '智能系·案例二：三维极坐标张量——中医语义表示的邻域稳定性',
      '智能系·案例三：指标与失效移交包——医疗 AI 的可审计交付',
      '五官口腔系·案例一：望诊字段化——中医面诊的可观察化接口',
      '五官口腔系·案例二：114 方五官筛——专科中成药的选品依据',
      '五官口腔系·案例三：光学参数缺项写法——眼科数据报表的合规底线',
      '基础医学院·案例一：病理 252 单元底本——基础医学的课程数字化底座',
      '基础医学院·案例二：病理生理九轴——机制教学的覆盖度仪表',
      '基础医学院·案例三：生理正常值表——可复现的参考区间交付'
    ],
  },
  {
    dept: '02-zhongyao', slug: '19-zhongyao-zhuanye-shijian', title: '中药专业实践', en: 'Pharmacy Professional Practice',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '产地调研→结构化字段 / 鉴定数据→图像与光谱 / 中试→工艺参数表',
    prereq: ['13-zhongchengyao-linchuang', '05-zhongyao-jianding-xue', '08-zhongyao-paozhi-xue'],
    chapterTitles: [
      '药材市场与产地调研：道地性与商品规格',
      '鉴定实验室实践：性状与显微鉴定',
      '炮制车间实践：工艺与质控点',
      '制剂中试：处方—工艺—质量',
      '药房与临床用药随访',
      '实践报告与出站考核',
    ],
  },
  {
    dept: '02-zhongyao', slug: '20-zhongyao-biye-sheji', title: '中药毕业设计与知识移交', en: 'Pharmacy Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '质量标志物→可验证假设 / 批次数据→指纹图谱 / 结论→可复现实验记录',
    prereq: ['19-zhongyao-zhuanye-shijian', '15-zhongyao-xinyao-yanfa'],
    chapterTitles: [
      '选题：从质量标志物到可验证假设',
      '样品与数据准备（批次、指纹图谱）',
      '实验与建模实现',
      '质量一致性与方法学验证',
      '论文写作与答辩',
      '知识移交：实验记录与交接',
    ],
  },
  {
    dept: '03-zhenjiu', slug: '21-zhenjiu-linchuang-lunzhuan', title: '针灸临床轮转', en: 'Acupuncture Clinical Rotation',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '配穴方案→规则集 / 刺激参数→可记录字段 / 疗效→量表',
    prereq: ['08-zhenjiu-zhiliao-xue', '19-tuina-zhiliao-xue'],
    chapterTitles: [
      '针灸科门诊轮转：颈肩腰腿痛的接诊与配穴',
      '中风病康复轮转',
      '面瘫与周围神经损伤轮转',
      '灸法与拔罐的适应证与意外处置',
      '推拿科轮转',
      '出科考核与病例复盘',
    ],
  },
  {
    dept: '03-zhenjiu', slug: '22-zhenjiu-biye-sheji', title: '针灸毕业设计与知识移交', en: 'Acupuncture Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '配穴方案→可检验命题 / 经穴坐标→数据集 / 结论→可复现方案',
    prereq: ['21-zhenjiu-linchuang-lunzhuan', '10-shiyan-zhenjiu-xue'],
    chapterTitles: [
      '选题：从配穴方案到可检验命题',
      '数据准备：病例、经穴坐标、刺激参数',
      '方法与系统实现',
      '疗效评价与盲法设计',
      '论文写作与答辩',
      '知识移交：方案手册与交接',
    ],
  },
  {
    dept: '04-gushang', slug: '16-gushang-linchuang-lunzhuan', title: '骨伤临床轮转', en: 'Orthopedics & Traumatology Rotation',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '复位方案→参数化步骤 / 影像→测量指标 / 随访→功能评分',
    prereq: ['06-zhongyi-zhenggu-xue', '10-jizhu-bing-xue', '11-guanjie-bing-xue'],
    chapterTitles: [
      '正骨科轮转：骨折复位与固定',
      '筋伤科轮转：软组织损伤',
      '脊柱科轮转',
      '关节科轮转',
      '急诊创伤与院前处置',
      '出科考核与病例复盘',
    ],
  },
  {
    dept: '04-gushang', slug: '17-gushang-biye-sheji', title: '骨伤毕业设计与知识移交', en: 'Orthopedics Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '复位方案→可量化命题 / 影像与力学→数据 / 结论→可复现流程',
    prereq: ['16-gushang-linchuang-lunzhuan', '15-gushang-kangfu-pingding'],
    chapterTitles: [
      '选题：从复位方案到可量化命题',
      '影像与生物力学数据准备',
      '手法与支具的系统实现',
      '疗效与并发症评价',
      '论文写作与答辩',
      '知识移交：操作规范与交接',
    ],
  },
  {
    dept: '05-huli', slug: '26-huli-linchuang-lunzhuan', title: '护理临床轮转', en: 'Clinical Nursing Rotation',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '护理评估→结构化表单 / 干预→可核查记录 / 结局→护理敏感指标',
    prereq: ['07-neike-huli-xue', '12-jiwei-zhengzheng-huli', '25-zhongyi-linchuang-huli'],
    chapterTitles: [
      '内科护理轮转',
      '外科护理轮转',
      '妇儿护理轮转',
      '急危重症护理轮转',
      '中医护理技术临床应用轮转',
      '出科考核与护理个案复盘',
    ],
  },
  {
    dept: '05-huli', slug: '27-huli-biye-sheji', title: '护理毕业设计与知识移交', en: 'Nursing Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '护理问题→可评价方案 / 证据检索→循证链 / 结局→指标集',
    prereq: ['26-huli-linchuang-lunzhuan', '15-huli-yanjiu-zhengxun'],
    chapterTitles: [
      '选题：从护理问题到可评价方案',
      '证据检索与循证方案设计',
      '干预实现与伦理审查',
      '指标与结局评价',
      '论文写作与答辩',
      '知识移交：护理方案与交接',
    ],
  },
  {
    dept: '06-guanli', slug: '25-guanli-shixi-shijian', title: '管理实习与实践', en: 'Health Management Internship',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '管理问题→可测量指标 / 流程→泳道图 / 政策→可核查条款',
    prereq: ['06-yiyuan-guanli-xue', '09-yiliao-baoxian-jingji', '11-yiyuan-xinxihua-bingan'],
    chapterTitles: [
      '医院职能部门实习（医务与质控）',
      '病案与信息科实习',
      '医保结算与费用结构分析',
      '中医药政策落地调研',
      '管理改进项目（PDCA）',
      '实践报告与答辩',
    ],
  },
  {
    dept: '06-guanli', slug: '26-guanli-biye-sheji', title: '管理毕业设计与知识移交', en: 'Management Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '管理问题→可测量命题 / 数据→指标定义 / 结论→可执行方案',
    prereq: ['25-guanli-shixi-shijian', '13-linchuang-keyan-fangfa'],
    chapterTitles: [
      '选题：从管理问题到可测量命题',
      '数据获取与指标定义',
      '分析与方案实现',
      '效果评价与成本-效益',
      '论文写作与答辩',
      '知识移交：制度文件与交接',
    ],
  },
  {
    dept: '07-zhineng', slug: '18-zhineng-gongcheng-shijian', title: '工程实践与系统交付', en: 'Engineering Practice & Delivery',
    type: 'Build', semester: 9, hours: 108, chapters: 6,
    bridge: '需求→用例与验收标准 / 模型→评测流水线 / 上线→监控指标',
    prereq: ['10-llm-yu-zhongyi-zhinengti', '14-yixue-shuju-anquan-yinsi'],
    chapterTitles: [
      '需求与数据合规评估',
      '系统架构与接口实现',
      '模型训练与评测流水线',
      '临床部署与灰度验证',
      '运维、监控与事故复盘',
      '交付验收与文档',
    ],
  },
  {
    dept: '07-zhineng', slug: '19-zhineng-biye-sheji', title: '智能系毕业设计与知识移交', en: 'AI Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '中医问题→可复现实验 / 标注→规范 / 误差→可解释归因',
    prereq: ['18-zhineng-gongcheng-shijian', '15-zhongyi-ai-lunli-zhili'],
    chapterTitles: [
      '选题：从中医问题到可复现实验',
      '数据集与标注规范',
      '方法实现与消融实验',
      '误差分析与临床可解释性',
      '论文写作与答辩',
      '知识移交：模型卡与交接',
    ],
  },
  {
    dept: '08-wuguan', slug: '16-wuguan-linchuang-lunzhuan', title: '五官口腔临床轮转', en: 'ENT & Stomatology Rotation',
    type: 'Clinic', semester: 9, hours: 108, chapters: 6,
    bridge: '专科检查→结构化字段 / 影像→测量 / 疗效→专科评分',
    prereq: ['06-zhongyi-yanke-xue', '07-zhongyi-erbihou-xue', '11-kouqiang-hemian-waike'],
    chapterTitles: [
      '眼科门诊轮转',
      '耳鼻喉科门诊轮转',
      '口腔内科轮转',
      '口腔颌面外科轮转',
      '中医五官特色治疗轮转',
      '出科考核与病例复盘',
    ],
  },
  {
    dept: '08-wuguan', slug: '17-wuguan-biye-sheji', title: '五官口腔毕业设计与知识移交', en: 'ENT & Stomatology Capstone',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '专科问题→可验证命题 / 检查数据→特征 / 结论→可复现路径',
    prereq: ['16-wuguan-linchuang-lunzhuan', '15-zhongyi-meirong-pifu'],
    chapterTitles: [
      '选题：从专科问题到可验证命题',
      '影像与功能检查数据准备',
      '方法与系统实现',
      '疗效与安全性评价',
      '论文写作与答辩',
      '知识移交：诊疗路径与交接',
    ],
  },
  {
    dept: '09-jichu', slug: '16-jichu-keyan-shixun', title: '科研实训与实验设计', en: 'Research Training & Experimental Design',
    type: 'Build', semester: 9, hours: 108, chapters: 6,
    bridge: '假设→对照设计 / 原始记录→可复算数据 / 统计→效应量',
    prereq: ['12-yaoli-xue', '11-bingli-shengli-xue', '15-liuxingbing-xue'],
    chapterTitles: [
      '实验室安全与规范',
      '实验设计与对照设置',
      '形态学与分子实验实训',
      '数据采集与统计分析',
      '结果解读与可重复性',
      '实训报告与考核',
    ],
  },
  {
    dept: '09-jichu', slug: '17-jichu-biye-sheji', title: '基础医学毕业设计与知识移交', en: 'Biomedical Capstone & Handover',
    type: 'Build', semester: 10, hours: 72, chapters: 6,
    bridge: '机制假设→可检验实验 / 记录→原始数据 / 结论→可重复协议',
    prereq: ['16-jichu-keyan-shixun', '13-mianyi-bingyuan-shengwu'],
    chapterTitles: [
      '选题：从机制假设到可检验实验',
      '实验方案与伦理审批',
      '实验实施与原始记录',
      '数据分析与结果呈现',
      '论文写作与答辩',
      '知识移交：实验协议与交接',
    ],
  },
];

// ── 校验 ──────────────────────────────────────────────────────────────
const deptOf = new Map();
for (const d of cur.departments) for (const s of d.subjects) deptOf.set(`${d.slug}/${s[0]}`, s);

const resolve = (fromDept, ref) => (ref.includes('/') ? ref : `${fromDept}/${ref}`);

const problems = [];
const seen = new Set();
const newKeySet0 = new Set(NEW_SUBJECTS.map((n) => `${n.dept}/${n.slug}`));
for (const d of cur.departments) {
  for (const row of d.subjects) {
    const key = `${d.slug}/${row[0]}`;
    // 已经落进 curriculum 的新学科由 NEW_SUBJECTS 管，不要求出现在 PREREQ 表里
    if (newKeySet0.has(key)) continue;
    if (!(key in PREREQ)) {
      problems.push(`缺先修声明: ${key}（先修表里没有这一门，不能默认「没有前置」）`);
      continue;
    }
    for (const ref of PREREQ[key]) {
      const full = resolve(d.slug, ref);
      const target = deptOf.get(full);
      if (!target) problems.push(`引用了不存在的课: ${key} → ${ref}`);
      else if (!(target[4] < row[4])) problems.push(`前置不早于本课: ${key}（第 ${row[4]} 学期）← ${ref}（第 ${target[4]} 学期）`);
    }
    seen.add(key);
  }
}
for (const key of Object.keys(PREREQ)) if (!seen.has(key)) problems.push(`先修表里多出一条没有对应学科的边: ${key}`);

// 新科目校验
const newKeys = new Set();
const newIdx = new Map(NEW_SUBJECTS.map((n) => [`${n.dept}/${n.slug}`, n]));
for (const n of NEW_SUBJECTS) {
  const key = `${n.dept}/${n.slug}`;
  if (newKeys.has(key)) problems.push(`新增学科重复: ${key}`);
  newKeys.add(key);
  if (!/^\d{2}-[a-z0-9-]+$/.test(n.slug)) problems.push(`新增学科 slug 不合规: ${n.slug}`);
  if (!(n.hours > 0 && n.chapters > 0 && n.semester >= 1 && n.semester <= 10)) problems.push(`新增学科字段非法: ${key}`);
  if (!n.bridge || n.bridge.length < 4) problems.push(`新增学科缺桥梁说明: ${key}`);
  if (n.chapterTitles.length !== n.chapters) problems.push(`新增学科章名数 ≠ 章节目标: ${key}`);

  // 幂等：已落盘的学科不重复添加，但要逐位比对元组 —— 否则「跑过一遍」会掩盖手工改坏的数据
  const existed = deptOf.get(key);
  if (existed) {
    const want = [n.slug, n.title, n.en, n.type, n.semester, n.hours, n.chapters, n.bridge, false, JSON.stringify(n.prereq)];
    const got = [
      existed[0], existed[1], existed[2], existed[3], existed[4], existed[5], existed[6], existed[7],
      existed[8] === true, JSON.stringify(existed[9] || []),
    ];
    const NAMES = ['slug', 'title', 'en', 'type', 'semester', 'hours', 'chapters', 'bridge', 'elective', 'prereq'];
    for (let i = 0; i < want.length; i += 1) {
      if (String(want[i]) !== String(got[i])) {
        problems.push(`新增学科已存在但 ${NAMES[i]} 不一致: ${key}（表 ${want[i]} ≠ 仓库 ${got[i]}）`);
      }
    }
  }

  for (const ref of n.prereq) {
    const full = resolve(n.dept, ref);
    const existing = deptOf.get(full);
    const added = newIdx.get(full);
    const sem = existing ? existing[4] : added ? added.semester : null;
    if (sem == null) problems.push(`新学科引用了不存在的课: ${key} → ${ref}`);
    else if (!(sem < n.semester)) problems.push(`新学科前置学期不早于本课: ${key}（第 ${n.semester} 学期）← ${ref}（第 ${sem} 学期）`);
  }
}

if (problems.length) {
  console.error(`✗ 先修/新科目校验未通过（${problems.length} 处）：`);
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log(`✓ 先修边校验通过：${Object.keys(PREREQ).length} 门已声明，边数 ${Object.values(PREREQ).reduce((a, x) => a + x.length, 0)}`);
console.log(`✓ 新增学科校验通过：${NEW_SUBJECTS.length} 门（第 9/10 学期）`);

// ── 写盘 ──────────────────────────────────────────────────────────────
const TUPLE = ['slug', 'title', 'en', 'type', 'semester', 'hours', 'chapters', 'bridge', 'elective', 'prereq'];
const NOTE =
  'type ∈ Core|Build|Reference|Clinic ; semester ∈ 1..10 ; hours=课时 ; chapters=章节目标数 ; ' +
  'bridge=中医概念→AI/工程方法 的桥梁说明 ; 第 9 位 elective=true 表示选修（按内容相关性挂进院系，不计入院系必修规模基准）; ' +
  '第 10 位 prereq = 先修学科 slug 数组（不带「/」= 同院系；带「/」= 跨院系），先修学期必须严格早于本课。';

cur.subjectTuple = TUPLE;
cur.subjectTupleNote = NOTE;

let edges = 0;
for (const d of cur.departments) {
  for (const row of d.subjects) {
    const key = `${d.slug}/${row[0]}`;
    const refs = PREREQ[key];
    // 新学科（第 9/10 学期）的 prereq 由 NEW_SUBJECTS 管；已在仓库时不动它
    if (!refs) continue;
    while (row.length < 10) row.push(row.length === 8 ? row[8] === true : []);
    row[8] = row[8] === true;
    row[9] = refs.slice();
    edges += refs.length;
  }
}

for (const n of NEW_SUBJECTS) {
  const d = cur.departments.find((x) => x.slug === n.dept);
  if (d.subjects.some((r) => r[0] === n.slug)) continue; // 幂等：已在仓库就不重复插入
  d.subjects.push([n.slug, n.title, n.en, n.type, n.semester, n.hours, n.chapters, n.bridge, false, n.prereq.slice()]);
  edges += n.prereq.length;
}

cur.domain.scale.subjects = cur.departments.reduce((a, d) => a + d.subjects.length, 0);

if (DRY) {
  console.log('（--dry：未写盘）');
  process.exit(0);
}

fs.writeFileSync(CUR, JSON.stringify(cur, null, 2) + '\n');
const totalEdges = cur.departments.flatMap((d) => d.subjects).reduce((a, s) => a + (s[9] || []).length, 0);
console.log(`✓ 写入 curriculum.json：${cur.domain.scale.subjects} 学科 · 先修边合计 ${totalEdges}（本次声明 ${edges}）`);

// 说明：新增学科的章名不在这里写。data/new-subjects-chapters.json 是**作者维护**的知识结构，
// 由 scripts/scaffold_sem910.js 读取并落成 chapters.json；若在此处生成，会把手工写的章节 slug 覆盖掉。
