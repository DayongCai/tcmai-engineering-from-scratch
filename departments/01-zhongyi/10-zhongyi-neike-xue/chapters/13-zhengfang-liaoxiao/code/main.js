'use strict';
/**
 * 第 13 章 · 证候—方剂—疗效：把「病→证→法→方」这条链拆成可观测与不可观测两段
 *
 *   node code/main.js
 *
 * 数据（全部在版本库内，可复算）：
 *   standards/neike/底本.json          教材正文 12 章 / 83 节 / 384 小节 / 384 条目
 *   standards/fangji/formulas.json     方剂学方剂层 114 首（含八法归属）
 *
 * 口径（改任何一条都要同步改 docs/zh.md）：
 *   1. 链条条目只从 `sub.title === '辨证论治'` 的条目里取（第 4–11 章各论，312 条）。
 *      第 3 章的「常见证候」写成「证名：症状……」，各论写成「证名。症状……」，
 *      两种分隔符不同，故 outline() 单独用冒号规则取，两处不混算。
 *   2. 「逐字」指 fold 之后子串命中：去空白、去全角/半角标点，不改字。
 *   3. 词频统计的是**出现次数**，不是段数；同一段里连说三次算三次。
 *   4. 方名拆解：去括注与书名号，按「合/与/或/、/，/；/另服」切分，再去「加减/化裁/加味」。
 *      这一步会把「六味地黄丸，或左归丸」拆成两首，也会把「越婢加半夏汤或桑白皮汤」
 *      拆成两首 —— 拆错的部分留在 misses 里可见，不藏。
 *   5. 与方剂层的交叉只做**同名**命中（方剂层 114 首的 name 字段），不做别名归并。
 *      所以 69/114 是**下界**：真实重合只会更多，不会更少。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const FANGJI = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/fangji/formulas.json'), 'utf8'));

const TERMS4 = ['证候', '治法', '方剂', '疗效'];

/** 章 → 该章全部条目正文（标题与正文拼在一起，与体检脚本同一口径） */
function chapterText(no) {
  const ch = BASE.chapters.find((c) => c.no === no);
  return ch.secs.flatMap((s) => s.subs.flatMap((u) => u.items.map((it) => `${it.title}\n${it.body}`))).join('\n');
}
const count = (t, kw) => t.split(kw).length - 1;

// ─────────── 一、链条条目：证型 → 治法 → 代表方 ───────────

/**
 * 各论 312 条。每条都要求三件事同时在场：
 *   证名（段落首句，句号或括号收尾）、`治法：…。`、`代表方：…。`
 * 缺任何一件都不入账 —— 这是「链条完整」的定义，不是抽样。
 */
function chain() {
  const rows = [];
  for (const ch of BASE.chapters) {
    if (ch.no < 4 || ch.no > 11) continue;
    for (const sec of ch.secs) {
      for (const sub of sec.subs) {
        if (sub.title !== '辨证论治') continue;
        for (const it of sub.items) {
          for (const para of it.body.split(/\n+/).filter(Boolean)) {
            const zhi = para.match(/治法[：:]([^。]+)。/);
            const fang = para.match(/代表方[：:]([^。]+)。/);
            if (!zhi || !fang) continue;
            const head = para.split('。')[0].replace(/（[^）]*）/g, '').trim();
            rows.push({
              ch: ch.no,
              sec: sec.title,
              disease: sec.title.replace(/^\d+\.\d+\s*/, ''),
              zheng: head,
              zhi: zhi[1],
              fang: fang[1].replace(/（[^）]*）/g, '').replace(/《[^》]*》/g, '').trim(),
              hasOutcomeWord: /疗效|转归|预后|随访|复查/.test(para),
            });
          }
        }
      }
    }
  }
  const byChapter = {};
  for (const r of rows) {
    byChapter[r.ch] = byChapter[r.ch] || { rows: 0, zheng: new Set(), zhi: new Set(), fang: new Set(), outcome: 0 };
    const b = byChapter[r.ch];
    b.rows += 1;
    b.zheng.add(r.zheng);
    b.zhi.add(r.zhi);
    b.fang.add(r.fang);
    if (r.hasOutcomeWord) b.outcome += 1;
  }
  for (const k of Object.keys(byChapter)) {
    const b = byChapter[k];
    byChapter[k] = {
      rows: b.rows,
      zheng: b.zheng.size,
      zhi: b.zhi.size,
      fang: b.fang.size,
      outcome: b.outcome,
    };
  }
  return {
    rows,
    byChapter,
    total: rows.length,
    zheng: new Set(rows.map((r) => r.zheng)).size,
    zhi: new Set(rows.map((r) => r.zhi)).size,
    fang: new Set(rows.map((r) => r.fang)).size,
    withOutcome: rows.filter((r) => r.hasOutcomeWord).length,
  };
}

/**
 * 第 3 章「常见证候」：写法是「证名：症状……治法：……代表方：……」。
 * 与各论的「证名。症状……」不是同一种分隔符 —— 同一条正则覆盖不了两处，
 * 这是把教材转成链条时最先撞到的解析风险。
 * 而且纲要把两三个证写进同一段（痰湿阻肺证…治法…代表方…痰热壅肺证…治法…），
 * 所以必须先按「证名：」切开，再逐片取治法与方；整段取一次会漏掉一半。
 */
function outline() {
  const rows = [];
  for (const ch of BASE.chapters) {
    if (ch.no !== 3) continue;
    for (const sec of ch.secs) {
      for (const sub of sec.subs) {
        if (!/常见证候/.test(sub.title)) continue;
        for (const it of sub.items) {
          for (const para of it.body.split(/\n+/).filter(Boolean)) {
            const marks = [...para.matchAll(/([^。：，、；]{2,14}?(?:证|型))[：:]/g)].map((m) => ({
              name: m[1],
              at: m.index,
            }));
            marks.forEach((mk, i) => {
              const end = i + 1 < marks.length ? marks[i + 1].at : para.length;
              const seg = para.slice(mk.at, end);
              const zhi = seg.match(/治法[：:]([^。]+)。/);
              const fang = seg.match(/代表方[：:]([^。]+)。/);
              if (!zhi || !fang) return;
              rows.push({
                ch: 3,
                sec: sec.title,
                zheng: mk.name,
                zhi: zhi[1],
                fang: fang[1].replace(/（[^）]*）/g, '').replace(/《[^》]*》/g, '').trim(),
              });
            });
          }
        }
      }
    }
  }
  return { rows, total: rows.length };
}

/**
 * 同法同方而异名的证，全链只有 2 组（5 条）。
 * 数量小，但足以否掉「用证名做键」这件事：一个键必须唯一，这里一个 (治法,方) 对着三个证名。
 */
function collision() {
  const rows = [...chain().rows, ...outline().rows];
  const g = new Map();
  for (const r of rows) {
    const k = `${r.zhi}|${r.fang}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  const groups = [...g.values()].filter((v) => new Set(v.map((x) => x.zheng)).size > 1);
  return {
    total: rows.length,
    groups: groups.map((v) => ({
      zhi: v[0].zhi,
      fang: v[0].fang,
      names: [...new Set(v.map((x) => x.zheng))],
      where: v.map((x) => `第${x.ch}章·${x.sec}`),
    })),
  };
}

// ─────────── 二、四个词的分章分布 ───────────

/**
 * 「证候 / 治法 / 方剂 / 疗效」四词的分章词频。
 * 关键不是总数，是**分布**：证候与方剂集中在第 1、2、12 章（理论层与数字化层），
 * 治法与疗效散在各论（第 4–11 章）。也就是说这条链的两端用两套词说话。
 */
function terms() {
  const per = {};
  for (const ch of BASE.chapters) {
    const t = chapterText(ch.no);
    per[ch.no] = { title: ch.title.replace(/^第\d+章\s*/, ''), words: {} };
    for (const k of TERMS4) per[ch.no].words[k] = count(t, k);
    per[ch.no].words['证型'] = count(t, '证型');
    per[ch.no].words['代表方'] = count(t, '代表方');
    per[ch.no].words['中成药'] = count(t, '中成药');
    per[ch.no].words['加减'] = count(t, '加减');
  }
  const total = {};
  for (const k of [...TERMS4, '证型', '代表方', '中成药', '加减']) {
    total[k] = Object.values(per).reduce((a, v) => a + v.words[k], 0);
  }
  // 理论层（1/2/12）与各论层（4–11）各占多少
  const layer = (ns) => {
    const o = {};
    for (const k of TERMS4) o[k] = ns.reduce((a, n) => a + per[n].words[k], 0);
    return o;
  };
  return {
    per,
    total,
    theory: layer([1, 2, 12]),
    clinical: layer([4, 5, 6, 7, 8, 9, 10, 11]),
  };
}

// ─────────── 三、第四段到底有没有观测面 ───────────

/**
 * 教材里所有能当「疗效」用的量：率、量表、积分、日记、随访记录。
 * 结论先说：率一个都没有；有的都是**过程记录**（随访 55 次、量表 13 次），
 * 而不是**结局指标**。唯一带算式的是尼莫地平法疗效指数，算的仍是证候积分。
 */
function outcome() {
  const all = BASE.chapters.map((c) => chapterText(c.no)).join('\n');
  const probe = (kw) => count(all, kw);
  const yes = ['疗效', '提高疗效', '巩固疗效', '疗效评价', '疗效评估', '量表', '评分', '随访', '尼莫地平', '睡眠日记', '转归', '预后'];
  // 试验口径的效应量：一个都没有
  const trial = ['有效率', '治愈率', '显效率', '总有效率'];
  // 疾病层面的流行病学率：有，但不是「某方对某证」的效应量
  const epi = ['生存率', '复发率', '死亡率', '致残率', '发病率'];
  return {
    instruments: yes.map((k) => ({ term: k, n: probe(k) })),
    trialRates: trial.map((k) => ({ term: k, n: probe(k) })),
    epiRates: epi.map((k) => ({ term: k, n: probe(k) })),
    hasTrialRate: trial.some((k) => probe(k) > 0),
    verdictCount: probe('以效验证'),
  };
}

// ─────────── 四、第三步：代表方与方剂层的交叉命中 ───────────

const SPLIT_RE = /合|与|或|、|，|；|另服|同服|化裁/g;

/** 把「三拗汤合止嗽散加减（《…》《…》）」拆成药名数组 */
function splitFang(raw) {
  const core = raw.replace(/（[^）]*）/g, '').replace(/《[^》]*》/g, '');
  const out = [];
  for (let p of core.split(SPLIT_RE)) {
    p = p.replace(/加减|加味/g, '').replace(/^[，、；。\s]+/, '').trim();
    if (p.length >= 2) out.push(p);
  }
  return out;
}

/**
 * 方剂层交叉：412 个方名实例 → 249 个不同方名 → 68 个能在 114 首方剂层里找到同名。
 * 反方向更有意思：114 首里有 46 首在内科各论的「代表方」位置上一次都没出现。
 * 这 46 首不是没用，是它们的证候落点不在这本教材里 —— 方剂层与内科层不是同一套边界。
 */
function fangCross() {
  const names = [];
  for (const r of chain().rows) for (const n of splitFang(r.fang)) names.push({ name: n, ch: r.ch });
  const uniq = [...new Set(names.map((n) => n.name))];
  const layer = new Set(FANGJI.formulas.map((f) => f.name));
  const hitInst = names.filter((n) => layer.has(n.name));
  const hitUniq = uniq.filter((n) => layer.has(n));
  const unused = FANGJI.formulas.filter((f) => !hitUniq.includes(f.name)).map((f) => f.name);
  const byChapter = {};
  for (const n of names) {
    byChapter[n.ch] = byChapter[n.ch] || { inst: 0, hit: 0 };
    byChapter[n.ch].inst += 1;
    if (layer.has(n.name)) byChapter[n.ch].hit += 1;
  }
  return {
    instances: names.length,
    unique: uniq.length,
    hitInstances: hitInst.length,
    hitUnique: hitUniq.length,
    layerSize: layer.size,
    unusedCount: unused.length,
    unused: unused.slice(0, 12),
    byChapter,
    missesSample: uniq.filter((x) => !layer.has(x)).slice(0, 10),
  };
}

/**
 * 治法层的宽度：八法是 8 类，方剂层是 114 首。
 * 52 首归八法，62 首落在「不属八法」（安神、理气、理血、祛湿、祛痰、治风、润燥、固涩…）。
 * 所以「治法→方剂」不是划分，是**多对多的粗分**：治法不能当作链条的中介变量。
 */
function bafa() {
  const items = FANGJI.bafa.items.map((b) => ({ fa: b.fa, n: b.formulas }));
  const inBafa = items.reduce((a, b) => a + b.n, 0);
  return {
    items,
    inBafa,
    outside: FANGJI.formulas.length - inBafa,
    outsideNames: FANGJI.bafa.others.slice(0, 10).map((x) => x.name),
    faOf: FANGJI.formulas.filter((f) => f.fa).length,
  };
}

// ─────────── 输出 ───────────

function report() {
  const c = chain();
  const o = outline();
  const t = terms();
  const oc = outcome();
  const x = fangCross();
  const b = bafa();
  const col = collision();

  const pad = (s, n) => String(s).padEnd(n, ' ');
  console.log('');
  console.log('═══ 一、链条条目（第 4–11 章「辨证论治」）═══');
  console.log(`  完整三元组 ${c.total} 条 · 证名 ${c.zheng} · 治法 ${c.zhi} · 代表方（去括注）${c.fang}`);
  console.log(`  段内出现「疗效/转归/预后/随访/复查」的：${c.withOutcome} / ${c.total}`);
  for (const [k, v] of Object.entries(c.byChapter)) {
    console.log(`  第${k}章 | 条 ${pad(v.rows, 3)} | 证 ${pad(v.zheng, 3)} | 法 ${pad(v.zhi, 3)} | 方 ${pad(v.fang, 3)} | 带疗效词 ${v.outcome}`);
  }
  console.log(`  第 3 章「常见证候」另计 ${o.total} 条（冒号式，与各论句号式不同一种写法）`);

  console.log('\n═══ 二、四个词的分章分布 ═══');
  console.log('  章 | 证候 治法 方剂 疗效 | 证型 代表方');
  for (const [k, v] of Object.entries(t.per)) {
    const w = v.words;
    console.log(`  ${pad(k, 2)} | ${pad(w['证候'], 4)} ${pad(w['治法'], 4)} ${pad(w['方剂'], 4)} ${pad(w['疗效'], 4)} | ${pad(w['证型'], 4)} ${w['代表方']}  ${v.title}`);
  }
  console.log(`  合计：证候 ${t.total['证候']} · 治法 ${t.total['治法']} · 方剂 ${t.total['方剂']} · 疗效 ${t.total['疗效']}`);
  console.log(`  理论层（1/2/12 章）：${JSON.stringify(t.theory)}`);
  console.log(`  各论层（4–11 章）：${JSON.stringify(t.clinical)}`);
  console.log(`  实例层用词：证型 ${t.total['证型']} · 代表方 ${t.total['代表方']} · 中成药 ${t.total['中成药']} · 加减 ${t.total['加减']}`);

  console.log('\n═══ 三、第四段有没有观测面 ═══');
  for (const i of oc.instruments) console.log(`  过程/工具用词：${pad(i.term, 8)} ${i.n}`);
  for (const i of oc.trialRates) console.log(`  试验口径效应量：${pad(i.term, 8)} ${i.n}`);
  for (const i of oc.epiRates) console.log(`  疾病层面率（非效应量）：${pad(i.term, 8)} ${i.n}`);
  console.log(`  结论：试验口径效应量 ${oc.hasTrialRate ? '有' : '一个都没有'}；「以效验证」出现 ${oc.verdictCount} 次`);

  console.log('\n═══ 四、代表方 × 方剂层 114 首 ═══');
  console.log(`  方名实例 ${x.instances} · 不同方名 ${x.unique} · 命中实例 ${x.hitInstances} · 命中不同方名 ${x.hitUnique}`);
  console.log(`  方剂层 ${x.layerSize} 首中未被本条链提到：${x.unusedCount} 首（${x.unused.join('、')}…）`);
  for (const [k, v] of Object.entries(x.byChapter)) console.log(`  第${k}章 | 实例 ${pad(v.inst, 3)} | 命中 ${v.hit}`);
  console.log(`  未命中样例（同名即算，不做别名归并）：${x.missesSample.join('、')}`);

  console.log('\n═══ 五、治法层宽度 ═══');
  console.log(`  八法覆盖 ${b.inBafa} 首 / ${x.layerSize} 首，落在「不属八法」${b.outside} 首`);
  console.log(`  八法分布：${b.items.map((i) => `${i.fa}${i.n}`).join(' · ')}`);
  console.log(`  不属八法样例：${b.outsideNames.join('、')}`);

  console.log('\n═══ 六、同法同方而异名 ═══');
  console.log(`  ${col.total} 条里出现 ${col.groups.length} 组同法同方多证名：`);
  for (const g of col.groups) console.log(`   ${g.names.join(' / ')} ← ${g.zhi}；${g.fang}`);

  console.log('\n═══ 七、可观测 / 只能推断 ═══');
  console.log(`  可观测：证名与症状条的共现（${c.total + o.total} 条）· 治法名与代表方名的共现 · 方名与方剂层的同名命中（${x.hitUnique}/${x.layerSize}）`);
  console.log('  只能推断：某方对某证「有效」—— 教材无率、无量表分、无对照组；唯一算式是证候积分的疗效指数');
  console.log('');
  console.log('  教学边界：本输出为教材文本结构与方剂层同名的交叉统计，可复算，不构成诊疗依据、不构成疗效判断。');
  console.log('');
}

if (require.main === module) report();

module.exports = { BASE, FANGJI, TERMS4, chain, outline, collision, terms, outcome, fangCross, splitFang, bafa, chapterText, count };
