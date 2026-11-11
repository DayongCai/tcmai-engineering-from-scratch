'use strict';
/**
 * 补虚药（教材第 25 章）：四节 × 四气 × 归经 的教材统计
 *
 *   node code/main.js
 *
 * 口径：
 *   - 一切数字现算，不抄讲义：章级规模取自 底本.json 的 counts，
 *     药味与性味归经取自 drugs.json（与教材同源，字段逐字来自各药首段）。
 *   - 四气保留「微温 / 微寒」这两级，不压平成「温 / 寒」。
 *     压平会让人误以为全章只有四档，而实际分布是六档（见 byQi 输出）。
 *   - 归经按十二经逐条计数，一味药可计多条，所以分项之和大于药味数。
 *
 * 本文件想证明的一件事：
 *   四节（补气 / 补阳 / 补血 / 补阴）是**功效轴**，不是寒温轴。
 *   补气 9 味横跨凉、平、温、微温四种气，补血 6 味也横跨微寒到微温；
 *   只有「阴 / 阳」这一刀与四气同向（补阴 0 温、补阳 0 寒凉）。
 */

const fs = require('node:fs');
const path = require('node:path');

/** 向上找 standards/zhongyao：章节目录深度以后可能调整，不写死层级 */
function findStandards(start) {
  let dir = start;
  for (;;) {
    const cand = path.join(dir, 'standards', 'zhongyao');
    if (fs.existsSync(path.join(cand, '底本.json'))) return cand;
    const up = path.dirname(dir);
    if (up === dir) throw new Error('找不到 standards/zhongyao');
    dir = up;
  }
}
const STD = findStandards(__dirname);
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(STD, f), 'utf8'));
const BASE = readJson('底本.json');
const DRUGS = readJson('drugs.json').drugs;

const CH = '25';
/** 四气按寒→热的顺序排，缺项不补零，避免把「没有」读成「0 也是一档」 */
const QI_ORDER = ['寒', '微寒', '凉', '平', '温', '微温', '热'];

const chapter = () => BASE.chapters.find((c) => c.no === CH);
const drugs = () => DRUGS.filter((d) => d.chapter === CH);

/** 章级规模：节 / 小节 / 段 / 字 全部取自 counts，再用结构复核一遍 */
function scale() {
  const c = chapter();
  const subs = c.secs.reduce((n, s) => n + s.subs.length, 0);
  const paras = c.secs.reduce((n, s) => n + s.subs.reduce((m, u) => m + u.paras.length, 0), 0);
  return {
    secs: c.secs.length,
    subs,
    paras,
    chars: c.counts.chars,
    drugs: drugs().length,
    charsPerDrug: +(c.counts.chars / drugs().length).toFixed(1),
  };
}

/** 四节名册：每节的药名按教材小节顺序排 */
function sections() {
  return chapter().secs.map((s) => ({
    no: s.no,
    title: s.title,
    subs: s.subs.length,
    paras: s.subs.reduce((n, u) => n + u.paras.length, 0),
    drugs: drugs().filter((d) => d.sec === s.no).map((d) => d.name),
  }));
}

/** 四气分布，按 QI_ORDER 输出，零项剔除 */
function byQi(list = drugs()) {
  return QI_ORDER.map((qi) => ({ qi, n: list.filter((d) => d.nature.qi === qi).length }))
    .filter((x) => x.n > 0);
}

/** 四节 × 四气 交叉表 */
function crossTab() {
  return sections().map((s) => ({
    sec: s.no,
    title: s.title,
    n: s.drugs.length,
    qi: byQi(drugs().filter((d) => d.sec === s.no)),
  }));
}

/** 归经计数，降序；同数按经名排序，保证输出稳定 */
function jingCount(list = drugs()) {
  const m = new Map();
  for (const d of list) for (const j of d.nature.guijing || []) m.set(j, (m.get(j) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 某味药的性味归经 + 教材原句（原句现从 fields 里切，不另行改写） */
function natureOf(name) {
  const d = drugs().find((x) => x.name === name);
  if (!d) throw new Error(`第 ${CH} 章没有这味药: ${name}`);
  const raw = d.fields['来源与性味归经'] || '';
  const m = raw.match(/性[^。]*?经。/);
  return {
    name: d.name,
    sec: d.sec,
    qi: d.nature.qi,
    qiIsGraded: /^微/.test(d.nature.qi),
    wei: d.nature.wei,
    guijing: d.nature.guijing,
    sentence: m ? m[0] : null,
    hasPoisonFlag: /有毒/.test(raw),
  };
}

/** 全角字符按 2 列算，输出才对得齐 */
const dw = (s) => [...String(s)].reduce((n, ch) => n + (/[\u2E80-\uFFEF]/.test(ch) ? 2 : 1), 0);
const pad = (s, w) => String(s) + ' '.repeat(Math.max(0, w - dw(s)));
const padl = (s, w) => ' '.repeat(Math.max(0, w - dw(s))) + String(s);

function table(head, rows) {
  const widths = head.map((h, i) => Math.max(dw(h), ...rows.map((r) => dw(r[i]))));
  const line = (cells) => cells.map((c, i) => (i ? '' : '') + pad(c, widths[i])).join('  ').trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

function main() {
  const s = scale();
  console.log('教材·第25章·补虚药 —— 四节分类的教材统计');
  console.log('');
  console.log(table(
    ['规模项', '数值'],
    [
      ['节', s.secs],
      ['小节', s.subs],
      ['段', s.paras],
      ['教材字数', s.chars],
      ['药物单元', s.drugs],
      ['平均每味字', s.charsPerDrug],
    ],
  ));

  console.log('\n一、四节名册（药名按教材小节顺序）');
  for (const sec of sections()) {
    console.log(`${sec.no} ${sec.title}｜${sec.subs} 小节 / ${sec.paras} 段 / ${sec.drugs.length} 味`);
    console.log(`  ${sec.drugs.join('、')}`);
  }

  console.log('\n二、四节 × 四气（保留微温、微寒两级）');
  console.log(table(
    ['节', '节名', '药数', ...QI_ORDER],
    crossTab().map((r) => {
      const cells = QI_ORDER.map((q) => {
        const hit = r.qi.find((x) => x.qi === q);
        return hit ? hit.n : '-';
      });
      return [r.sec, r.title, r.n, ...cells];
    }),
  ));

  console.log('\n三、章内四气合计');
  console.log(byQi().map((x) => `${x.qi} ${x.n}`).join('｜'));

  console.log('\n四、四节各自的归经前三（分项之和大于药味数：一味药可归多经）');
  for (const sec of sections()) {
    const top = jingCount(drugs().filter((d) => d.sec === sec.no)).slice(0, 3);
    console.log(`${sec.no} ${sec.title}｜${top.map(([j, n]) => `${j}${n}`).join(' ')}`);
  }

  console.log('\n五、单味药查询（性味归经取自教材各药首段）');
  for (const name of ['人参', '黄芪', '麦冬']) {
    const n = natureOf(name);
    console.log(
      `${n.name}（${n.sec}）｜气 ${n.qi}${n.qiIsGraded ? '（带程度词）' : ''}｜味 ${n.wei.join('、')}｜归 ${n.guijing.join('、')}经`,
    );
    console.log(`  教材原句：${n.sentence}`);
  }

  console.log('\n六、这组数字能读出什么');
  const ct = crossTab();
  for (const r of ct) {
    const hasWarm = r.qi.some((x) => x.qi === '温' || x.qi === '微温');
    const hasCold = r.qi.some((x) => x.qi === '寒' || x.qi === '微寒' || x.qi === '凉');
    console.log(`${r.sec} ${r.title}：温档 ${hasWarm ? '有' : '无'}｜寒凉档 ${hasCold ? '有' : '无'}｜气档数 ${r.qi.length}`);
  }
  console.log('读法：补气与补血都同时出现温档与寒凉档，四气分不开这两节；');
  console.log('     补阳全在温档、补阴全在寒凉与平档，四气只在「阴 / 阳」这一刀上与分类同向。');

  console.log('\n教学边界：本输出为课程统计与检索练习，不构成用药依据。');
}

if (require.main === module) main();
module.exports = { CH, QI_ORDER, chapter, drugs, scale, sections, byQi, crossTab, jingCount, natureOf };
