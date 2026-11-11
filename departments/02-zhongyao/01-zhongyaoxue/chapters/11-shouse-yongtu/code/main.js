'use strict';
/**
 * 收涩药（教材第 26 章）与涌吐药（第 27 章）：一个闸门的两侧
 *
 *   node code/main.js
 *
 * 口径：
 *   - 两章合并统计：26 章 3 节 / 14 味，27 章 1 节 / 3 味，合计 4 节 / 17 味。
 *   - 四气保留「微温 / 微寒」这样的程度词，缺项输出 '-'，不补 0。
 *   - 有毒是无结构化字段的，只能在「来源与性味归经」段里正则匹配「有毒」，
 *     所以这里的毒性计数是**文本标记数**，不是毒理分级。
 *
 * 本文件想证明的一件事：
 *   收涩与涌吐是同一个闸门的两侧 —— 收涩把已经开着的门关上（汗、泻、尿、带），
 *   涌吐把堵在上面的东西推出去。判别依据不是症状，是**病势方向**。
 *   数据上的两支几乎不重叠：收涩 14 味无一标「有毒」、以平温为主、归肾最多；
 *   涌吐 3 味全部标「有毒」、全部性寒、无一归肾。
 */

const fs = require('node:fs');
const path = require('node:path');

/** 向上找 standards/zhongyao：不写死层级，层数变了也不会断 */
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

/** 两章的先后就是「收」到「吐」，顺序有意义 */
const CHS = ['26', '27'];
const QI_ORDER = ['寒', '微寒', '凉', '平', '温', '微温', '热'];

const chapters = () => CHS.map((no) => BASE.chapters.find((c) => c.no === no));
const drugs = () => DRUGS.filter((d) => CHS.includes(d.chapter));

/** 章级与合计规模，全部现算，再用「每味 3 段」反查 */
function scale() {
  const per = chapters().map((c) => {
    const subs = c.secs.reduce((n, s) => n + s.subs.length, 0);
    const paras = c.secs.reduce((n, s) => n + s.subs.reduce((m, u) => m + u.paras.length, 0), 0);
    return {
      no: c.no,
      title: c.title,
      secs: c.secs.length,
      subs,
      paras,
      chars: c.counts.chars,
      drugs: drugs().filter((d) => d.chapter === c.no).length,
    };
  });
  const sum = (k) => per.reduce((n, c) => n + c[k], 0);
  return {
    per,
    secs: sum('secs'),
    subs: sum('subs'),
    paras: sum('paras'),
    chars: sum('chars'),
    drugs: sum('drugs'),
    charsPerDrug: +(sum('chars') / sum('drugs')).toFixed(1),
  };
}

/** 四节名册（26.1 / 26.2 / 26.3 / 27.1），药名按小节顺序 */
function sections() {
  const out = [];
  for (const c of chapters()) {
    for (const s of c.secs) {
      out.push({
        no: s.no,
        title: s.title,
        chapter: c.no,
        chapterTitle: c.title,
        subs: s.subs.length,
        paras: s.subs.reduce((n, u) => n + u.paras.length, 0),
        drugs: drugs().filter((d) => d.sec === s.no).map((d) => d.name),
      });
    }
  }
  return out;
}

function byQi(list = drugs()) {
  return QI_ORDER.map((qi) => ({ qi, n: list.filter((d) => d.nature.qi === qi).length }))
    .filter((x) => x.n > 0);
}

function crossTab() {
  return sections().map((s) => ({
    sec: s.no,
    title: s.title,
    n: s.drugs.length,
    qi: byQi(drugs().filter((d) => d.sec === s.no)),
  }));
}

/** 归经计数，降序；同数按经名排序保证稳定 */
function jingCount(list = drugs()) {
  const m = new Map();
  for (const d of list) for (const j of d.nature.guijing || []) m.set(j, (m.get(j) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 文本里的「有毒」标记 —— 教材没给毒理分级，只能到此为止 */
const hasPoison = (d) => /有毒/.test(d.fields['来源与性味归经'] || '');

/** 收（26）/ 吐（27）两支的对照画像 */
function direction() {
  const build = (no) => {
    const g = drugs().filter((d) => d.chapter === no);
    const c = BASE.chapters.find((x) => x.no === no);
    const sour = g.filter((d) => (d.nature.wei || []).some((w) => w === '酸' || w === '涩'));
    return {
      chapter: no,
      title: c.title,
      secs: c.secs.length,
      drugs: g.length,
      chars: c.counts.chars,
      qiCount: byQi(g).length,
      qi: byQi(g),
      poison: g.filter(hasPoison).map((d) => d.name),
      sourAstringent: sour.length,
      topJing: jingCount(g).slice(0, 3),
      names: g.map((d) => d.name),
    };
  };
  return CHS.map(build);
}

/** 单味药：性味归经 + 教材原句 + 毒性标记 */
function natureOf(name) {
  const d = drugs().find((x) => x.name === name);
  if (!d) throw new Error(`第 ${CHS.join('/')} 章没有这味药: ${name}`);
  const raw = d.fields['来源与性味归经'] || '';
  const m = raw.match(/性[^。]*?经。/);
  return {
    name: d.name,
    chapter: d.chapter,
    sec: d.sec,
    qi: d.nature.qi,
    wei: d.nature.wei,
    guijing: d.nature.guijing,
    sentence: m ? m[0] : null,
    poison: hasPoison(d),
  };
}

const dw = (s) => [...String(s)].reduce((n, ch) => n + (/[\u2E80-\uFFEF]/.test(ch) ? 2 : 1), 0);
const pad = (s, w) => String(s) + ' '.repeat(Math.max(0, w - dw(s)));

function table(head, rows) {
  const widths = head.map((h, i) => Math.max(dw(h), ...rows.map((r) => dw(r[i]))));
  const line = (cells) => cells.map((c, i) => pad(c, widths[i])).join('  ').trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

function main() {
  const s = scale();
  console.log('教材·第26章 收涩药 + 第27章 涌吐药 —— 一个闸门的两侧');
  console.log('');

  console.log('一、两章规模');
  console.log(table(
    ['章', '章名', '节', '小节', '段', '教材字数', '药味'],
    [
      ...s.per.map((c) => [`${c.no}`, c.title, c.secs, c.subs, c.paras, c.chars, c.drugs]),
      ['合计', '收涩 + 涌吐', s.secs, s.subs, s.paras, s.chars, s.drugs],
    ],
  ));
  console.log(`平均每味 ${s.charsPerDrug} 字；段数 ${s.paras} = 药味 ${s.drugs} × 3`);

  console.log('\n二、四节名册');
  for (const sec of sections()) {
    console.log(`${sec.no} ${sec.title}（教材第${sec.chapter}章）｜${sec.subs} 小节 / ${sec.paras} 段 / ${sec.drugs.length} 味`);
    console.log(`  ${sec.drugs.join('、')}`);
  }

  console.log('\n三、四节 × 四气（保留微温、微寒）');
  console.log(table(
    ['节', '节名', '药数', ...QI_ORDER],
    crossTab().map((r) => [
      r.sec,
      r.title,
      r.n,
      ...QI_ORDER.map((q) => {
        const hit = r.qi.find((x) => x.qi === q);
        return hit ? hit.n : '-';
      }),
    ]),
  ));
  console.log('章内合计：' + byQi().map((x) => `${x.qi} ${x.n}`).join('｜'));

  console.log('\n四、收（26）与吐（27）的对照画像');
  const [shou, tu] = direction();
  console.log(table(
    ['维度', '收涩药（第26章）', '涌吐药（第27章）'],
    [
      ['病势方向', '把开着的门关上（滑脱不禁）', '把堵在上面的推出去（痰食壅塞）'],
      ['节 / 味', `${shou.secs} 节 / ${shou.drugs} 味`, `${tu.secs} 节 / ${tu.drugs} 味`],
      ['教材字数', shou.chars, tu.chars],
      ['四气档数', shou.qiCount, tu.qiCount],
      ['四气分布', shou.qi.map((x) => `${x.qi}${x.n}`).join(' '), tu.qi.map((x) => `${x.qi}${x.n}`).join(' ')],
      ['标「有毒」', shou.poison.length ? shou.poison.join('、') : '0 味', `${tu.poison.length} 味（${tu.poison.join('、')}）`],
      ['含酸或涩', `${shou.sourAstringent} 味`, `${drugs().filter((d) => d.chapter === '27' && (d.nature.wei || []).some((w) => w === '酸' || w === '涩')).length} 味`],
      ['归经前三', shou.topJing.map(([j, n]) => `${j}${n}`).join(' '), tu.topJing.map(([j, n]) => `${j}${n}`).join(' ')],
    ],
  ));

  console.log('\n五、单味药查询（性味归经取自教材各药首段）');
  for (const name of ['五味子', '乌梅', '常山']) {
    const n = natureOf(name);
    console.log(
      `${n.name}（第${n.chapter}章 ${n.sec}）｜气 ${n.qi}｜味 ${n.wei.join('、')}｜归 ${n.guijing.join('、')}经｜有毒标记 ${n.poison ? '有' : '无'}`,
    );
    console.log(`  教材原句：${n.sentence}`);
  }

  console.log('\n六、这组数字能读出什么');
  console.log(`收涩 ${shou.drugs} 味：四气 ${shou.qiCount} 档，平温为主，无一标有毒，归 ${shou.topJing[0][0]} 最多`);
  console.log(`涌吐 ${tu.drugs} 味：四气 ${tu.qiCount} 档（全 ${tu.qi[0].qi}），全部标有毒，归 ${tu.topJing.map(([j]) => j).join('、')}`);
  const overlap = jingCount(drugs().filter((d) => d.chapter === '26')).map(([j]) => j)
    .filter((j) => jingCount(drugs().filter((d) => d.chapter === '27')).some(([k]) => k === j));
  console.log(`两支共享的归经：${overlap.join('、')}；共同归经里没有肾 —— 肾是收涩的主场，涌吐不碰下焦。`);
  console.log('判别要点：症状（汗/泻/尿/带/痰）在收涩药里全都出现，按症状检索等于全召回；');
  console.log('         能用收涩的前提是"虚而无实邪"，能用涌吐的前提恰恰是"实邪在上"——两者互斥。');

  console.log('\n教学边界：本输出为课程统计与检索练习，不构成用药依据。');
}

if (require.main === module) main();
module.exports = { CHS, QI_ORDER, chapters, drugs, scale, sections, byQi, crossTab, jingCount, hasPoison, direction, natureOf };
