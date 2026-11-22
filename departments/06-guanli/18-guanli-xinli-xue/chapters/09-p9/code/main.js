#!/usr/bin/env node
/**
 * 管理心理学 · 第 9 章 团队不是人凑齐就有战斗力，群体先生产出来的是一套规范
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/09-p9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算式只有两句：人手不是产出，规范才是；凝聚力只放大规范，不选择规范。
 * 脚本把它们做成可复算的判断：
 *   1. 加人前后的台次、人均台次与增幅（14→16 人、6→6.4 台）；
 *   2. 凝聚力 × 规范方向的四象限：哪一格是「气氛极好、产出极差」；
 *   3. 社会懈怠的锚点（六人组个人出力约七成）与「贡献可识别」的修正；
 *   4. 群体思维的症状清单与四条对冲的成本。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '团队不是人凑齐就有战斗力，群体先生产出来的是一套规范';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 加人前后：台次、人均台次、增幅。人均下降说明规范在限产 */
function capacity({ headcount, cases }, { headcount: headAfter, cases: casesAfter }) {
  const per = cases / headcount;
  const perAfter = casesAfter / headAfter;
  return {
    cases,
    casesAfter,
    caseGrowth: Number((((casesAfter - cases) / cases) * 100).toFixed(2)),
    headGrowth: Number((((headAfter - headcount) / headcount) * 100).toFixed(2)),
    per: Number(per.toFixed(4)),
    perAfter: Number(perAfter.toFixed(4)),
    perChange: Number((((perAfter - per) / per) * 100).toFixed(2)),
    verdict: perAfter < per ? '人均产出下降：人手不是瓶颈，规范在限产' : '人均产出未降：瓶颈可能确实在人手',
  };
}

/**
 * 凝聚力 × 规范方向：凝聚力只放大，不选择。方向取 +1（支持高绩效）或 −1（抵制高绩效）。
 * 结果 = 凝聚力 × 方向；高凝聚 + 抵制 = 最难拆的一格。
 */
function cohesionMatrix(cohesion, direction) {
  const effect = Number((cohesion * direction).toFixed(2));
  const quad = cohesion >= 0.6 ? (direction > 0 ? '高凝聚·支持' : '高凝聚·抵制') : direction > 0 ? '低凝聚·支持' : '低凝聚·抵制';
  const note = {
    '高凝聚·支持': '气氛好、产出高：这是目标态，不是起点',
    '高凝聚·抵制': '气氛极好、产出极差：凝聚力成了限产的执行器',
    '低凝聚·支持': '方向对但没劲：先补目标、规模与公平分配',
    '低凝聚·抵制': '两头都缺：先定规范，再谈团结',
  }[quad];
  return { cohesion, direction, effect, quad, note };
}

/**
 * 社会懈怠：以正文的六人组「个人出力约七成」为锚，每多一人再降 6 个百分点，
 * 下限 0.5。贡献可识别时（identified=true），衰减被抵消。
 */
function loafing(n, identified = false) {
  const raw = Math.max(0.5, 1 - 0.06 * (n - 1));
  const solid = n === 6 ? 0.7 : raw;
  const out = identified ? Math.min(1, solid + 0.25) : solid;
  return { n, identified, individual: Number(out.toFixed(2)), total: Number((out * n).toFixed(2)) };
}

const GROUPTHINK = ['不可战胜的错觉', '集体合理化', '对异议者的直接压力', '自我审查', '意见一致的错觉', '对外群体的刻板印象'];
const COUNTERS = ['指定反方', '分头评估再合议', '名义群体法与德尔菲法', '决策与执行分开一轮'];

function concepts(text) {
  const t = String(text || '');
  return {
    groupthink: GROUPTHINK.filter((g) => t.includes(g)),
    counters: COUNTERS.filter((c) => t.includes(c)),
    hasAsch: t.includes('阿希'),
    hasSherif: t.includes('谢里夫'),
    hasLoafing: t.includes('社会懈怠'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const cap = capacity({ headcount: 14, cases: 6 }, { headcount: 16, cases: 6.4 });

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`群体思维症状 ${c.groupthink.length}/6：${c.groupthink.join(' · ')}`);
  console.log(`对冲办法 ${c.counters.length}/4：${c.counters.join(' · ')}`);
  console.log('');
  console.log(`加人账：${cap.cases} 台 → ${cap.casesAfter} 台（+${cap.caseGrowth}%），人手 +${cap.headGrowth}%`);
  console.log(`  人均 ${cap.per} → ${cap.perAfter}（${cap.perChange}%）→ ${cap.verdict}`);
  console.log('');
  console.log('凝聚力 × 规范方向：');
  for (const m of [cohesionMatrix(0.8, -1), cohesionMatrix(0.8, 1), cohesionMatrix(0.3, 1), cohesionMatrix(0.3, -1)]) {
    console.log(`  ${m.quad}（效应 ${m.effect}）：${m.note}`);
  }
  console.log('');
  console.log('社会懈怠（六人组为正文锚点）：');
  console.log(`  六人组个人出力 ${loafing(6).individual}｜三人组 ${loafing(3).individual}｜贡献可识别时的六人组 ${loafing(6, true).individual}`);
  console.log('  → 衰减的开关是「贡献是否可识别」，不是监督强度。');
  console.log('');
  console.log('边界：本章的科室人数、台次与认同比例均为演算设定；群体研究多为实验室结论，价值在机制不在参数。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, capacity, cohesionMatrix, loafing, concepts, GROUPTHINK, COUNTERS };
