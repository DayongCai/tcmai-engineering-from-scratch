// tests/test_jingui_shiyi.js —— 【释义】层：一句话串讲不得串错条、不得抄原文、不得引错方
//
// 释义是本项目自撰的「这条在说什么」，没有外源可对。四组断言：
//   1) 覆盖：398 个带条号的条，条条有释义，且没有多余/重复条号；
//   2) 不串条：释义里提到的方名，必须是**本条原文里出现过**或**本条自带的方**；
//   3) 不抄书：释义与原文的最长公共片段 ≤ 12 字（否则就是把原文抄了一遍，不算串讲）；
//   4) 落文：教材里每条释义都带「本项目自撰串讲」声明，且不与注家混标。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BOOK = path.join(ROOT, "textbooks", "01-zhongyi", "08-jingui-yaolue");
const read = (p) => fs.readFileSync(p, "utf8");

const ben = JSON.parse(read(path.join(ROOT, "standards", "jingui", "底本.json")));
const arts = [];
for (const p of ben.pian) for (const a of p.articles || []) if (a.tiao) arts.push(a);
const TIAO = new Map(arts.map((a) => [a.tiao, a]));

// 释义：与生成器同一份（四段源码）
const SY = (() => {
  const out = {};
  for (const f of ["jingui_shiyi.py", "jingui_shiyi2.py", "jingui_shiyi3.py", "jingui_shiyi4.py"]) {
    const src = read(path.join(ROOT, "scripts", f));
    const re = /^\s{4}"([\d.]+)":\s*"([^"]*)",?$/gm;
    let m;
    while ((m = re.exec(src))) out[m[1]] = m[2];
  }
  return out;
})();

// 方名（168 唯一，不含末尾「方」）
const FANG = new Set();
for (const a of arts) for (const f of a.formulas || []) FANG.add(f.nameSimp.replace(/方$/, ""));

function lcsLen(a, b) {
  // 最长公共子串长度（O(n·m) 但两条都很短）
  let best = 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = tmp;
    }
  }
  return best;
}

test("覆盖：398 条条条有释义，无多余、无重复", () => {
  assert.equal(arts.length, 398, `带条号的条数变了（${arts.length}）`);
  const missing = [...TIAO.keys()].filter((t) => !SY[t]).sort((x, y) => {
    const [a1, b1] = x.split(".").map(Number);
    const [a2, b2] = y.split(".").map(Number);
    return a1 - a2 || b1 - b2;
  });
  const extra = Object.keys(SY).filter((t) => !TIAO.has(t));
  assert.deepEqual(missing, [], `缺释义：${missing.join("、")}`);
  assert.deepEqual(extra, [], `释义里有不存在的条号：${extra.join("、")}`);
  assert.equal(Object.keys(SY).length, 398, `释义条数应为 398，实为 ${Object.keys(SY).length}`);
});

test("不串条：释义提到的方名必须见于本条原文或本条自带的方", () => {
  const bad = [];
  for (const [tiao, text] of Object.entries(SY)) {
    const a = TIAO.get(tiao);
    const own = new Set((a.formulas || []).map((f) => f.nameSimp.replace(/方$/, "")));
    const src = a.zhHans || "";
    for (const name of FANG) {
      if (!text.includes(name)) continue;
      if (!own.has(name) && !src.includes(name)) bad.push(`${tiao} → ${name}`);
    }
  }
  assert.deepEqual(bad.slice(0, 15), [], `共 ${bad.length} 处方名串条`);
});

test("不抄书：释义与原文最长公共片段 ≤ 12 字（方名不计）", () => {
  // 方名（如「桂枝去芍药加麻黄细辛附子汤」）必然两侧都出现，不算抄书，比前先抹掉
  const stripFang = (t) => {
    let x = t;
    for (const n of [...FANG].sort((a, b) => b.length - a.length)) {
      x = x.split(n + "方").join("　").split(n).join("　");
    }
    return x;
  };
  const bad = [];
  for (const [tiao, text] of Object.entries(SY)) {
    const src = stripFang((TIAO.get(tiao).zhHans || "").replace(/[（(][^）)]*[）)]/g, ""));
    const n = lcsLen(stripFang(text), src);
    if (n > 12) bad.push(`${tiao} 公共片段 ${n} 字`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 条释义在抄原文`);
});

test("落文：教材里的释义带自撰声明，条数与条号一致", () => {
  let n = 0;
  const bad = [];
  const seen = new Set();
  for (const f of fs.readdirSync(BOOK).filter((x) => x.endsWith(".md") && /^\d\d-/.test(x))) {
    const ls = read(path.join(BOOK, f)).split("\n");
    let cur = null;
    for (let i = 0; i < ls.length; i++) {
      const m = /^\*\*第([\d.]+)条\*\*　/.exec(ls[i]);
      if (m) {
        cur = m[1];
        continue;
      }
      if (!ls[i].startsWith("**【释义】**")) continue;
      n += 1;
      const body = ls[i].replace("**【释义】**　", "");
      if (cur && SY[cur] && body !== SY[cur]) bad.push(`${f}:${i + 1} 释义与词库不一致`);
      if (cur) seen.add(cur);
      let j = i + 1;
      while (j < ls.length && ls[j].trim() === "") j++;
      const nx = ls[j] || "";
      if (!nx.startsWith("<sub>本项目自撰串讲")) bad.push(`${f}:${i + 1} 缺自撰声明`);
      if (/外源/.test(nx)) bad.push(`${f}:${i + 1} 自撰释义被标成外源`);
      assert.ok(body.length >= 8, `${f}:${i + 1} 释义过短（${body.length}）`);
    }
  }
  assert.equal(n, 398, `释义行应为 398，实为 ${n}`);
  assert.equal(seen.size, 398, `落文覆盖条号 ${seen.size} / 398`);
  assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处落文问题`);
});
