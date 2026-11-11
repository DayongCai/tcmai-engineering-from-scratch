#!/usr/bin/env node
/**
 * scripts/build_jingui_fangzu.js —— 方族比较表 + 全库方族图（复用第 10 章的统计代码）
 *
 * 输入：
 *   standards/jingui/fangzu-map.json   族归属（由 scripts/jingui_fangzu.py 生成，人工作者层）
 *   standards/jingui/底本.json          方名与药味（经第 10 章 main.js 的 formulas() 清洗后使用）
 * 输出：
 *   standards/jingui/fangzu.json       逐族统计（可复算）
 *   standards/jingui/fangzu.md         比较表（人读）
 *   standards/jingui/fangzu.svg        全库方族图（离线 SVG，无依赖）
 *
 * 为什么复用第 10 章而不是另写一套：药名清洗（「深師有生薑二兩」这类伪药名、炮制词混入）
 * 是第 10 章花了三轮才修干净的东西，方族统计必须站在同一份清洗结果上，否则两章数字对不上。
 *
 * 用法：
 *   node scripts/build_jingui_fangzu.js            # 生成
 *   node scripts/build_jingui_fangzu.js --check    # 幂等校验（不写盘，只报差异）
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STD = path.join(ROOT, "standards", "jingui");
const CH10 = path.join(ROOT, "departments", "01-zhongyi", "08-jingui-yaolue", "chapters", "10-zabing-peiwu", "code", "main.js");
const OUT_JSON = path.join(STD, "fangzu.json");
const OUT_MD = path.join(STD, "fangzu.md");
const OUT_SVG = path.join(STD, "fangzu.svg");

const ch10 = require(CH10);
const map = JSON.parse(fs.readFileSync(path.join(STD, "fangzu-map.json"), "utf8"));
const leifangPath = path.join(STD, "leifang-map.json");
const LEIFANG = new Map();
if (fs.existsSync(leifangPath)) {
  for (const p of JSON.parse(fs.readFileSync(leifangPath, "utf8")).pairs) LEIFANG.set(p.a + "|" + p.b, p.text);
}

// 药味：只用 kind === "ok" 的（校勘残行/错位不计，与第 10 章同口径）
const forms = ch10.formulas().filter((f) => !f.refOnly);
const doseOf = new Map(); // 方名 → Map(药 → 剂量)
for (const f of forms) {
  if (!doseOf.has(f.name)) doseOf.set(f.name, new Map());
  for (const i of f.ingredients) if (i.kind === "ok") doseOf.get(f.name).set(i.name, i.dose);
}
const herbOf = new Map(); // 方名 → Set(药)
for (const f of forms) {
  if (!herbOf.has(f.name)) herbOf.set(f.name, new Set());
  for (const i of f.ingredients) if (i.kind === "ok") herbOf.get(f.name).add(i.name);
}

const allNames = new Set([...map.families.flatMap((f) => f.members)]);
const withText = new Set(forms.map((f) => f.name));
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// 族内/族外出现次数
const famOfHerb = new Map(); // herb → Map(族 → 方数)
for (const fam of map.families) {
  for (const m of fam.members) {
    for (const h of herbOf.get(m) || []) {
      if (!famOfHerb.has(h)) famOfHerb.set(h, new Map());
      const mm = famOfHerb.get(h);
      mm.set(fam.family, (mm.get(fam.family) || 0) + 1);
    }
  }
}

const families = map.families.map((fam) => {
  const sizes = fam.members.map((m) => (herbOf.get(m) || new Set()).size).filter((n) => n > 0);
  const sets = fam.members.map((m) => herbOf.get(m) || new Set()).filter((s) => s.size);
  // 共见药：族内全部方的交集（空则退为出现率最高的前 3 味）
  let shared = [];
  let sharedKind = "all";
  if (sets.length) {
    shared = [...sets[0]].filter((h) => sets.every((s) => s.has(h)));
  }
  const freq = new Map();
  for (const s of sets) for (const h of s) freq.set(h, (freq.get(h) || 0) + 1);
  const byFreq = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"));
  if (!shared.length) {
    shared = byFreq.slice(0, 3).map((x) => x[0]);
    sharedKind = "top3";   // 交集为空：退为族内出现最多的三味，**不是共见药**，表里必须标出来
  }
  // 标志药：族内出现率 ≥ 50%，且族外出现率 < 10%（分母 = 族外有方文的方数）
  const n = sets.length || 1;
  const outTotal = Math.max(1, withText.size - n);
  const markers = byFreq
    .filter(([h, c]) => c / n >= 0.5)
    .filter(([h]) => {
      const inFam = famOfHerb.get(h).get(fam.family) || 0;
      const out = (famOfHerb.get(h).size ? [...famOfHerb.get(h).values()].reduce((a, b) => a + b, 0) : 0) - inFam;
      return out / outTotal < 0.1;
    })
    .map(([h, c]) => ({ herb: h, n: c, rate: +(c / n * 100).toFixed(1) }))
    .slice(0, 4);
  const rep = fam.members
    .map((m) => ({ name: m, size: (herbOf.get(m) || new Set()).size }))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name, "zh"))[0];
  // 类方鉴别：族内按药味数升序（同数按名）排队，相邻成对；差 >2 味不作鉴别
  const chain = fam.members
    .filter((m) => (herbOf.get(m) || new Set()).size > 0)
    .sort((x, y) => (herbOf.get(x).size - herbOf.get(y).size) || x.localeCompare(y, "zh"));
  const pairs = [];
  for (let i = 0; i + 1 < chain.length; i++) {
    const A = chain[i], B = chain[i + 1];
    const sa = herbOf.get(A), sb = herbOf.get(B);
    const add = [...sb].filter((h) => !sa.has(h));
    const del = [...sa].filter((h) => !sb.has(h));
    if (add.length + del.length > 2) continue;      // 非同源加减，硬比就是牵强
    const dA = doseOf.get(A) || new Map(), dB = doseOf.get(B) || new Map();
    // 比较只取「数词＋单位」，不带炮制注：「二两，炙」与「二两」是同一剂量，
    // 「一斤」与「一斤，碎」也是——不这样归一，表里会冒出一堆假剂量差。
    const doseKey = (d) => {
      const m = /[一二三四五六七八九十百千半两兩升合枚箇个斤分銖铢把0-9]+[两兩升合枚箇个斤分銖铢把]?/.exec(d || "");
      return m ? m[0] : (d || "");
    };
    const doseDiff = [...sa].filter((h) => dA.has(h) && dB.has(h) && doseKey(dA.get(h)) !== doseKey(dB.get(h)))
      .map((h) => ({ herb: h, a: dA.get(h), b: dB.get(h) }));
    const key = A + "|" + B;
    pairs.push({
      a: A, b: B, add, del, doseDiff,
      text: LEIFANG.get(key) || "",
      kind: add.length + del.length ? (add.length && del.length ? "易味" : "加减味") : "同药异量",
    });
  }
  return {
    family: fam.family,
    pairs,
    gong: fam.gong,
    count: fam.members.length,
    withText: fam.members.filter((m) => withText.has(m)).length,
    herbMedian: median(sizes),
    herbMean: sizes.length ? +(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2) : 0,
    shared,
    sharedKind,   // "all" = 真共见药（交集）；"top3" = 交集为空时的族内前三（不含排他性）
    // 严格门槛下有些大族没有「标志药」（甘草、茯苓这类全库高频药过不了族外<10%）。
    // 这时另给「族内前三」，标成 topIn —— 它只说「本族常用」，不含排他性，不能当标志药读。
    topIn: byFreq.slice(0, 3).map(([h, c]) => ({ herb: h, n: c, rate: +(c / n * 100).toFixed(1) })),
    markers,
    representative: rep ? rep.name : "",
    members: fam.members.map((m) => ({
      name: m, herbs: [...(herbOf.get(m) || [])], size: (herbOf.get(m) || new Set()).size,
      refOnly: !withText.has(m),
    })),
  };
});

families.sort((a, b) => b.count - a.count || a.family.localeCompare(b.family, "zh"));

const totalForms = families.reduce((n, f) => n + f.count, 0);
const data = {
  source: "scripts/jingui_fangzu.py（族归属）+ 第 10 章 main.js（药名清洗）",
  counts: {
    families: families.length,
    formulas: totalForms,
    withText: families.reduce((n, f) => n + f.withText, 0),
    refOnly: families.reduce((n, f) => n + (f.count - f.withText), 0),
    pairs: families.reduce((n, f) => n + f.pairs.length, 0),
    pairsAuthored: families.reduce((n, f) => n + f.pairs.filter((p) => p.text).length, 0),
  },
  families,
};

// ── Markdown 比较表 ────────────────────────────────────────────────────────────
function renderMd(d) {
  const L = [];
  L.push("# 《金匮要略》方族比较表", "");
  L.push("> 生成：`node scripts/build_jingui_fangzu.js`（族归属见 `scripts/jingui_fangzu.py`，药名清洗复用第 10 章代码）。");
  L.push("> 族按**功用**划分，是本项目的分类，不是古人的分类；一族一归属，168 个唯一方名全部分配。", "");
  L.push(`**${d.counts.families} 族 · ${d.counts.formulas} 方**（有方文 ${d.counts.withText} + 互见 ${d.counts.refOnly}）`, "");
  L.push("| 族 | 功用 | 方数 | 药味中位/均 | 共见药（全族都有） | 标志药（族内≥50%、族外<10%） | 族内前三（无排他性） | 代表方 |");
  L.push("|---|---|--:|--:|---|---|---|---|");
  for (const f of d.families) {
    const sh = f.sharedKind === "all" ? f.shared.join("、") || "—" : `（无共见药）${f.shared.join("、")}`;
    L.push(`| **${f.family}** | ${f.gong} | ${f.count} | ${f.herbMedian} / ${f.herbMean} | ${sh} | ${f.markers.map((m) => `${m.herb}(${m.rate}%)`).join("、") || "—（无排他药）"} | ${f.topIn.map((m) => `${m.herb}(${m.rate}%)`).join("、") || "—"} | ${f.representative} |`);
  }
  L.push("", "## 逐族成员", "");
  for (const f of d.families) {
    L.push(`### ${f.family}（${f.count} 方）`, "");
    L.push(f.gong, "");
    L.push("| 方 | 药味 | 组成 | 备注 |");
    L.push("|---|--:|---|---|");
    for (const m of f.members) {
      L.push(`| ${m.name} | ${m.size} | ${m.herbs.join("、") || "—"} | ${m.refOnly ? "互见方（方见他篇）" : ""} |`);
    }
    L.push("");
  }
  L.push("## 类方鉴别（同族内相邻两方）", "");
  L.push("族内按药味数升序排队，相邻两方成对；两方药味差 > 2 味的不作鉴别（不是同源加减）。");
  L.push("差异由底本现算，文字是**本项目自撰**；「同药异量」指药味全同而分量不同。", "");
  for (const f of d.families) {
    const ps = f.pairs;
    if (!ps.length) continue;
    L.push(`### ${f.family}（${ps.length} 对）`, "");
    L.push("| 甲 | 乙 | 类 | 组成差 | 剂量差 | 鉴别要点 |");
    L.push("|---|---|---|---|---|---|");
    for (const p of ps) {
      const comp = [];
      if (p.add.length) comp.push("乙加 " + p.add.join("、"));
      if (p.del.length) comp.push("乙去 " + p.del.join("、"));
      const dose = p.doseDiff.map((x) => `${x.herb} ${x.a}→${x.b}`).join("；");
      L.push(`| ${p.a} | ${p.b} | ${p.kind} | ${comp.join("；") || "—"} | ${dose || "—"} | ${p.text || "**（未撰）**"} |`);
    }
    L.push("");
  }
  L.push("## 读法", "");
  L.push("1. **共见药**是「全族每一方都有」的药：它说明这一族的骨架。交集为空时**不留空也不冒充**，"
    + "写「（无共见药）」并给出族内前三——大族常常如此（利水化气 18 方里茯苓只占 61.1%，就不是共见药）。");
  L.push("2. **标志药**要求「族内≥50%、族外<10%」：族内常见而在别的族罕见，才是这一族的辨识特征；");
  L.push("   甘草、生姜这类全库高频药极少成为标志药，正是这个门槛在起作用。");
  L.push("   **没有标志药不写假话**：大族（利水化气、清热泻火、调和营卫）的药几乎都在别族出现，");
  L.push("   于是留空，另给「族内前三」——那只是「本族常用」，**不含排他性**。");
  L.push("3. **药味中位/均**只用有方文之方（互见方药文为空，按第 10 章口径不计）。");
  L.push("4. **代表方**取族内药味最多者，仅为检索入口，不代表「主方」。");
  L.push("5. **类方鉴别只比相邻两方**：比的是「差这一味／这个量，主治就变了」；不追求把族内所有方两两比完");
  L.push("   （18 方两两是 153 对，那是排列组合，不是鉴别）。", "");
  return L.join("\n") + "\n";
}

// ── SVG 方族图 ────────────────────────────────────────────────────────────────
function renderSvg(d) {
  const rowH = 26;
  const padT = 54;
  const padB = 34;
  const W = 960;
  const labelW = 150;
  const H = padT + d.families.length * rowH + padB;
  const maxCount = Math.max(...d.families.map((f) => f.count));
  const dotR = 3.4;
  const dotGap = 14;
  const s = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Noto Serif SC, Source Han Serif CN, Songti SC, SimSun, serif">`);
  s.push(`<rect width="${W}" height="${H}" fill="#0d0a07"/>`);
  s.push(`<text x="24" y="30" fill="#e8dcc4" font-size="19">《金匮要略》全库方族图 · ${d.counts.families} 族 / ${d.counts.formulas} 方</text>`);
  s.push(`<text x="24" y="46" fill="#8d8069" font-size="11.5">族按功用划分（本项目自撰分类）；每点＝1 方，点的疏密就是族的大小</text>`);
  d.families.forEach((f, i) => {
    const y = padT + i * rowH;
    const tone = f.count >= 12 ? "#c9a227" : f.count >= 6 ? "#a8842a" : "#7a6220";
    s.push(`<text x="24" y="${y + 13}" fill="#e8dcc4" font-size="12.5">${f.family}</text>`);
    s.push(`<text x="${labelW - 8}" y="${y + 13}" fill="#8d8069" font-size="11" text-anchor="end">${f.count}</text>`);
    // 条形（宽度 ∝ 方数）
    const barW = Math.round((f.count / maxCount) * 300);
    s.push(`<rect x="${labelW}" y="${y + 3}" width="${barW}" height="12" rx="2" fill="${tone}" fill-opacity="0.22"/>`);
    // 成员点
    f.members.forEach((m, j) => {
      const cx = labelW + 6 + j * dotGap;
      const r = m.refOnly ? dotR - 0.9 : dotR;
      s.push(`<circle cx="${cx}" cy="${y + 9}" r="${r}" fill="${m.refOnly ? "none" : tone}" stroke="${tone}" stroke-width="1.1"><title>${m.name}（${m.size} 味）</title></circle>`);
    });
    // 标志药
    const strict = f.markers.length > 0;
    const mkSrc = strict ? f.markers : f.topIn;
    const mk = mkSrc.slice(0, 3).map((m) => m.herb).join("・");
    // 有排他性的标志药用亮灰；没有排他药的族只能给「族内前三」，用更暗的灰并加前缀，避免被当标志药读
    if (mk) {
      const txt = strict ? mk : "族内：" + mk;
      s.push(`<text x="${labelW + 320}" y="${y + 13}" fill="${strict ? "#8d8069" : "#6b6152"}" font-size="10.5">${txt}</text>`);
    }
  });
  s.push(`<text x="24" y="${H - 12}" fill="#6b6152" font-size="10.5">空心点＝互见方（方见他篇，药文为空）· 右侧亮灰＝标志药（族内≥50%、族外<10%）· 暗灰「族内：」＝无排他性的族内前三</text>`);
  s.push("</svg>");
  return s.join("\n") + "\n";
}

const md = renderMd(data);
const svg = renderSvg(data);
const json = JSON.stringify(data, null, 1) + "\n";

const check = process.argv.includes("--check");
const targets = [[OUT_JSON, json], [OUT_MD, md], [OUT_SVG, svg]];
const changed = [];
for (const [p, text] of targets) {
  const old = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  if (old !== text) {
    changed.push(path.basename(p));
    if (!check) fs.writeFileSync(p, text, "utf8");
  }
}
if (check) {
  if (changed.length) {
    console.error(`✗ 方族产物与现算不一致：${changed.join("、")}`);
    process.exit(1);
  }
  console.log(`✓ 方族一致：${data.counts.families} 族 · ${data.counts.formulas} 方（有方文 ${data.counts.withText}）`);
  process.exit(0);
}
console.log(`✓ ${data.counts.families} 族 · ${data.counts.formulas} 方（有方文 ${data.counts.withText} + 互见 ${data.counts.refOnly}）`);
for (const f of data.families) {
  console.log(`   ${f.family.padEnd(6, "　")} ${String(f.count).padStart(2)} 方 · 药味中位 ${String(f.herbMedian).padStart(2)} · 标志药 ${f.markers.map((m) => m.herb).join("、") || "—"}`);
}
console.log(`  → standards/jingui/fangzu.json · fangzu.md · fangzu.svg`);
