'use strict';
/**
 * 内经九章的量化手法登记表 + 边界判定器
 *
 *   node code/main.js
 *
 * 本文件是「收尾章」的代码：它不产生新数据，而是把前九章真正用过的九种手法
 * 登记成可核对的结构，并提供三件事：
 *   1. auditChapters()  —— 磁盘核对：九章是否都还在（docs/code/test 三件套）
 *   2. verifyEvidence() —— 登记表里引用的每个数字/关键词，必须真的出现在对应章的 docs 里
 *   3. classify(kind)   —— 接到一个量化请求，判「能算/不能算」，判不了就抛错
 *
 * 口径：
 *   · 登记表是**作者归纳**，不是原文所有；每条都标了「失效模式」，即这一类手法最常见的误用。
 *   · classify 只认六种请求类型；未知类型一律抛错，避免用「大概能算」蒙过去。
 *   · 本表只覆盖本书九章；《伤寒论》章节的量化（频次、BM25、剂量折算）另有一套边界。
 */

const path = require('node:path');
const fs = require('node:fs');

const HERE = __dirname;
const SUBJECT_DIR = path.resolve(HERE, '../..');   // chapters/
const CHAPTERS = [
  '01-suwen-chengshu', '02-yinyang-yingxiang', '03-zangxiang-xitong', '04-jingmai-bielun',
  '05-bingji-shijiu', '06-zhenfa-maiyao', '07-zhize-biaoben', '08-lunqi-qipian', '09-lingshu-jiuzhen',
];

/** 九种手法：能算 / 不能算 / 失效模式 / 证据（必须出现在该章 docs 里） */
const LEDGER = [
  {
    ch: '01', slug: '01-suwen-chengshu', method: '篇目体量统计',
    can: ['篇数', '字数', '篇均与条均', '体裁差异（篇均字数比）'],
    cannot: ['文本质量', '成书年代', '学派归属'],
    failure: '把篇幅当重要性（篇均长 ≠ 价值高）',
    evidence: ['561,111', '162 篇'],
  },
  {
    ch: '02', slug: '02-yinyang-yingxiang', method: '四轴偏侧值',
    can: ['有序轴上的方向与强度（−1…+1）', '参照点声明', '缺证记 null'],
    cannot: ['跨轴加总', '换算成剂量或评分表', '无参照点的绝对判断'],
    failure: '把 null 填成 0（「无证据」被读成「中性」）',
    evidence: ['偏侧值', '参照点'],
  },
  {
    ch: '03', slug: '03-zangxiang-xitong', method: '藏象五元组解析',
    can: ['字段抽取（本/华/充/位/通于）', '不规则句式标注', '校勘夹注剥离'],
    cannot: ['字段之间的因果', '「其华在面」推出诊断', '跨脏比较'],
    failure: '把不规则句硬套模板（脾句是六者合称）',
    evidence: ['五元组', '太素'],
  },
  {
    ch: '04', slug: '04-jingmai-bielun', method: '路径图（拓扑）',
    can: ['可达性', '汇点识别', '无环性检验'],
    cannot: ['流量', '速率', '压力', '时间'],
    failure: '把「肺朝百脉」读成闭环（原文是单向叙述）',
    evidence: ['汇点', '拓扑'],
  },
  {
    ch: '05', slug: '05-bingji-shijiu', method: '病机十九条反查',
    can: ['症状 → 病机的多命中共现', '「不排除项」清单', '归类计数（脏 5/火 5/热 4…）'],
    cannot: ['概率与敏感度', '证候优先级', '完备性'],
    failure: '把十九条当完备清单（它只是举例十九类）',
    evidence: ['十九条', '脏 5'],
  },
  {
    ch: '06', slug: '06-zhenfa-maiyao', method: '诊法条件核对',
    can: ['条件偏差清单', '两次采集的可比性判断'],
    cannot: ['校正后的脉象值', '把下午换算成平旦', '脉象判读'],
    failure: '换算「平旦等效值」（条件只能记录，不能消除）',
    evidence: ['平旦', '条件'],
  },
  {
    ch: '07', slug: '07-zhize-biaoben', method: '治序规则判定',
    can: ['条件 → 先治标/先治本', '优先级冲突的胜出与压过'],
    cannot: ['疗效', '疗程', '方药选择'],
    failure: '把归纳的优先级（中满>二便>有余不足）说成原文明文',
    evidence: ['中满', '先治'],
  },
  {
    ch: '08', slug: '08-lunqi-qipian', method: '干支运气推演',
    can: ['干支', '中运太过/不及', '司天', '在泉', '天符'],
    cannot: ['气候', '病种流行', '宜忌'],
    failure: '从「司天为何气」直接跳到「今年宜温宜清」',
    evidence: ['天符', '60'],
  },
  {
    ch: '09', slug: '09-lingshu-jiuzhen', method: '九针规格折算',
    can: ['单位区间（1 寸 2.31–2.35 cm）', '形制—用途对应'],
    cannot: ['单枚/单支的克数', '实际进针深度', '现代器械等效'],
    failure: '给点值假装精确（1.6 寸 ≠ 3.70 cm 整）',
    evidence: ['九针', '2.31'],
  },
];

/** 请求类型 → 判定。只有结构类可算；效力类一律不可算；未知抛错 */
const KIND_MAP = {
  计数: { verdict: '可算', why: '可复算，结果可被第二人验证' },
  顺序: { verdict: '可算', why: '条件与顺序确定时，结论唯一' },
  归属: { verdict: '可算', why: '归属可标出处，争议留痕' },
  区间: { verdict: '可算', why: '区间本身承认不确定度' },
  因果: { verdict: '不可算', why: '本草与经文未给因果参数' },
  效力: { verdict: '不可算', why: '疗效需临床证据，非文本统计' },
  应验: { verdict: '不可算', why: '推演自洽 ≠ 预测应验' },
};

function classify(kind) {
  const hit = KIND_MAP[kind];
  if (!hit) throw new Error(`未知请求类型：${kind}（只认 ${Object.keys(KIND_MAP).join('/')}）`);
  return { kind, ...hit };
}

/** 磁盘核对：九章是否都在，且各有 docs/code/test */
function auditChapters() {
  return CHAPTERS.map((slug) => {
    const dir = path.join(SUBJECT_DIR, slug);
    const need = ['docs/zh.md', 'code/main.js', 'code/main.test.js', 'quiz.json'];
    const missing = need.filter((f) => !fs.existsSync(path.join(dir, f)));
    return { slug, ok: missing.length === 0, missing };
  });
}

/** 登记表里的证据必须真的出现在对应章的 docs 里 —— 防止收尾章凭记忆引用 */
function verifyEvidence() {
  return LEDGER.map((row) => {
    const doc = path.join(SUBJECT_DIR, row.slug, 'docs/zh.md');
    const text = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
    const missing = row.evidence.filter((e) => !text.includes(e));
    return { ch: row.ch, slug: row.slug, ok: missing.length === 0, missing };
  });
}

/** 每个章节是否都登记了「能算」与「不能算」 */
function coverage() {
  const bad = LEDGER.filter((r) => r.can.length < 1 || r.cannot.length < 1 || !r.failure);
  return { total: LEDGER.length, bad: bad.map((r) => r.ch) };
}

function main() {
  console.log('内经九章的量化手法登记表\n');
  console.log('章  手法            能算（节选）                          不能算（节选）              失效模式');
  for (const r of LEDGER) {
    console.log(
      `${r.ch}  ${r.method.padEnd(12, '　')} ${r.can[0].slice(0, 16).padEnd(18, '　')} ${r.cannot[0].slice(0, 14).padEnd(18, '　')} ${r.failure.slice(0, 20)}…`,
    );
  }

  const cov = coverage();
  console.log(`\n登记完整性：${cov.total}/9 章，缺项 ${cov.bad.length ? cov.bad.join(',') : '无'}`);

  const disk = auditChapters();
  const okDisk = disk.filter((d) => d.ok).length;
  console.log(`磁盘核对：${okDisk}/9 章三件套齐全${okDisk < 9 ? `，缺：${disk.filter((d) => !d.ok).map((d) => d.slug).join(',')}` : ''}`);

  const ev = verifyEvidence();
  const okEv = ev.filter((e) => e.ok).length;
  console.log(`证据核对：${okEv}/9 章引用的数字/关键词都能在该章 docs 里找到`);
  for (const e of ev.filter((x) => !x.ok)) console.log(`  ✗ 第 ${e.ch} 章缺：${e.missing.join('、')}`);

  console.log('\n请求类型判定：');
  for (const k of Object.keys(KIND_MAP)) {
    const r = classify(k);
    console.log(`  ${k} → ${r.verdict}（${r.why}）`);
  }
  try {
    classify('疗效预测');
  } catch (err) {
    console.log(`  疗效预测 → 抛错：${err.message}`);
  }

  console.log('\n三律：');
  console.log('  律一 结构可算，效力不可算');
  console.log('  律二 区间优于点值');
  console.log('  律三 缺项留痕：null ≠ 0，未判定 ≠ 正常');
  console.log('\n口径：登记表为作者归纳，仅覆盖本书九章；《伤寒论》章节的量化另有边界。');
  console.log('本输出为方法边界说明，不构成诊疗依据。');
}

if (require.main === module) main();
module.exports = { LEDGER, KIND_MAP, classify, auditChapters, verifyEvidence, coverage, CHAPTERS };
