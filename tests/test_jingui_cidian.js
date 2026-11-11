// tests/test_jingui_cidian.js —— 【词解】层：自撰词解不得挂错条、不得重复定义、不得留空
//
// 这一层没有外源可对（词解是本项目自己写的），所以更要机器守。四组断言：
//   1) 词库：词形不重复、释义非空（重复会让同一个词前后两种说法）
//   2) 覆盖：底本 402 条每一条都至少有一个词可解（不许「这章没词解」含糊过去）
//   3) 挂错条：每条【词解】里的「词：释」，那个「词」必须在本条原文里逐字出现
//   4) 出处分离：词解行必须紧跟「本项目自撰」声明，且不得标成外源
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BOOK = path.join(ROOT, "textbooks", "01-zhongyi", "08-jingui-yaolue");
const read = (p) => fs.readFileSync(p, "utf8");
const files = fs.readdirSync(BOOK).filter((f) => f.endsWith(".md") && /^\d\d-/.test(f));

// 与生成器共用同一份词库：直接从源码里读，避免测试另存一份词表而与正文脱节
const CID = (() => {
  const src = read(path.join(ROOT, "scripts", "jingui_cidian.py"));
  const body = src.slice(src.indexOf("CIDIAN = ["));
  const out = [];
  const re = /^\s*\("([^"]+)",\s*"([^"]*)"\)/gm;
  let m;
  while ((m = re.exec(body))) out.push([m[1], m[2]]);
  return out;
})();

const BODY_RE = /^\*\*(第[\d.]+条|段 \d+)\*\*　(.+)$/;

test("词库：词形不重复，释义非空", () => {
  assert.ok(CID.length >= 400, `词条过少（${CID.length}）`);
  const seen = new Map();
  const dups = [];
  for (const [w, g] of CID) {
    assert.ok(w.length >= 1, "空词形");
    assert.ok(g && g.length >= 5, `「${w}」释义过短或为空`);
    if (seen.has(w)) dups.push(w);
    seen.set(w, g);
  }
  assert.deepEqual(dups, [], `词形重复：${dups.join("、")}`);
});

test("覆盖：底本 402 条每条至少有一个可解词", () => {
  const ben = JSON.parse(read(path.join(ROOT, "standards", "jingui", "底本.json")));
  const words = CID.map(([w]) => w);
  const miss = [];
  let n = 0;
  for (const p of ben.pian) {
    for (const a of p.articles || []) {
      n += 1;
      const t = a.zhHans || "";
      if (!words.some((w) => t.includes(w))) miss.push(a.tiao);
    }
  }
  assert.equal(n, 402, `底本条数变了（${n}）`);
  assert.deepEqual(miss, [], `无词可解的条：${miss.join("、")}`);
});

test("挂错条：每条【词解】的词必须在本条原文里出现", () => {
  // 底本 v2 把方文拼进了条 body（一条会占多行），所以把「条/段标记 → 【词解】」之间的行累积成本条原文
  let lines = 0;
  let pairs = 0;
  const bad = [];
  for (const f of files) {
    const ls = read(path.join(BOOK, f)).split("\n");
    let buf = null;
    for (let i = 0; i < ls.length; i++) {
      const m = BODY_RE.exec(ls[i]);
      if (m) {
        buf = m[2];
        continue;
      }
      if (ls[i].startsWith("**【词解】**")) {
        if (buf === null) {
          bad.push(`${f}:${i + 1} 词解前没有条/段标记`);
          continue;
        }
        lines += 1;
        for (const seg of ls[i].replace("**【词解】**　", "").split("；")) {
          const idx = seg.indexOf("：");
          if (idx < 0) continue;
          const w = seg.slice(0, idx).trim();
          pairs += 1;
          if (!w) bad.push(`${f}:${i + 1} 空词形`);
          else if (!buf.includes(w)) bad.push(`${f}:${i + 1} 「${w}」不在本条原文中`);
        }
        buf = null;
        continue;
      }
      // 条内续行（方文、服法）继续累积；声明行/标题/下一条注文则结束本条
      if (
        buf !== null &&
        ls[i].trim() &&
        !ls[i].startsWith("<sub>") &&
        !ls[i].startsWith("#") &&
        !ls[i].startsWith("**【注·") &&
        !ls[i].startsWith(">")
      ) {
        buf += ls[i];
      }
    }
  }
  assert.ok(lines >= 402, `词解行过少（${lines}）`);
  assert.ok(pairs >= 600, `词解条目过少（${pairs}），疑似只挂了空壳`);
  assert.deepEqual(bad.slice(0, 10), [], `共 ${bad.length} 处挂错条`);
});

test("出处分离：词解行必须紧跟「本项目自撰」声明，不得标成外源", () => {
  let n = 0;
  for (const f of files) {
    const ls = read(path.join(BOOK, f)).split("\n");
    for (let i = 0; i < ls.length; i++) {
      if (!ls[i].startsWith("**【词解】**")) continue;
      n += 1;
      let j = i + 1;
      while (j < ls.length && ls[j].trim() === "") j++;
      const nx = ls[j] || "";
      assert.ok(nx.startsWith("<sub>本项目自撰词解"), `${f}:${i + 1} 词解缺「本项目自撰」声明（找到：${nx.slice(0, 24)}）`);
      assert.ok(!/外源/.test(nx), `${f}:${i + 1} 自撰词解被标成外源`);
    }
  }
  assert.ok(n >= 402, `词解行过少（${n}）`);
  assert.ok(n <= 520, `词解行异常偏多（${n}），疑似重复生成`);
});
