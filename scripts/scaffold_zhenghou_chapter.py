#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为中医证候学某一章铺底：code/main.js + code/main.test.js（数字全部由证候库现算）。

用法:
  python scripts/scaffold_zhenghou_chapter.py 04-qixu-yangxu

与前三门（病理/外科/儿科/妇科）的脚手架不同：本课程底本是**跨课程派生的证候库**
（standards/zhenghou/证候库.json），因此每章带一个 FAMILIES 常量——本章负责的证候族。
main.js 只统计这些族，测试锁定「族内证候数、跨课数、病证数、代表方数」。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "standards", "zhenghou", "证候库.json")
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "14-zhongyi-zhenghou-xue")

MAIN = r"""#!/usr/bin/env node
/**
 * 中医证候学 · 第 __N__ 章 __TITLE__：本章统计口径
 * 课程: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/__SLUG__/docs/zh.md
 * 数据: standards/zhenghou/证候库.json（跨课程派生底本：外科/儿科/妇科 900 单元 → __TOTAL__ 个证候）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章负责的证候族（__FAMS__）各自的证候数、跨课数、病证数、代表方。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenghou', '证候库.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenghou/证候库.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const LIB = path.join(ROOT, 'standards', 'zhenghou', '证候库.json');
const CHAPTER = '__N__';
const FAMILIES = __FAMS__;

const load = () => JSON.parse(fs.readFileSync(LIB, 'utf8'));

function chapterZheng(lib) {
  return lib.zheng.filter((z) => FAMILIES.includes(z.family));
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function shape(list) {
  return {
    zheng: list.length,
    cross2: list.filter((z) => z.courseCount >= 2).length,
    diseases: sum(list.map((z) => z.diseaseCount)),
    fangs: sum(list.map((z) => z.fang.length)),
    positions: list.reduce((acc, z) => {
      for (const p of z.positions) acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {}),
  };
}

function byFamily(list) {
  const out = {};
  for (const z of list) out[z.family] = (out[z.family] || 0) + 1;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

function topZheng(list, n = 5) {
  return [...list].sort((a, b) => b.diseaseCount - a.diseaseCount || a.name.localeCompare(b.name, 'zh')).slice(0, n);
}

module.exports = { CHAPTER, FAMILIES, load, chapterZheng, shape, byFamily, topZheng, sum };

if (require.main === module) {
  const lib = load();
  const list = chapterZheng(lib);
  const s = shape(list);

  console.log('═══ 中医证候学 · 第 __N__ 章 __TITLE__ ═══');
  console.log(`全库 ${lib.counts.zheng} 证候 · 本章 ${s.zheng} 证候（跨 2 门课 ${s.cross2}）`);
  console.log(`病证覆盖 ${s.diseases} 次 · 代表方 ${s.fangs} 条`);
  console.log('\n按族：');
  for (const [f, n] of byFamily(list)) console.log(`  ${f}\t${n}`);
  console.log('\n病位分布：');
  for (const [p, n] of Object.entries(s.positions).sort((a, b) => b[1] - a[1])) console.log(`  ${p}\t${n}`);
  console.log('\n病证数最多的证候：');
  for (const z of topZheng(list)) console.log(`  ${z.name}\t病 ${z.diseaseCount}\t课 ${z.courseCount}\t方 ${z.fang.slice(0, 2).join('、') || '—'}`);
}

// 教学样例声明：契约要求每章输出含临床边界声明（tests/test_chapter_code.js）
if (require.main === module) {
  console.log('\n※ 教学样例：数字由 standards/zhenghou/证候库.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
"""

TEST = r"""#!/usr/bin/env node
/**
 * 第 __N__ 章 __TITLE__ —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */
'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, FAMILIES, load, chapterZheng, shape, byFamily } = require('./main.js');

const lib = load();
const list = chapterZheng(lib);

test('本章负责的族与证候数（全库 __TOTAL__）', () => {
  assert.strictEqual(lib.counts.zheng, __TOTAL__);
  assert.deepStrictEqual(FAMILIES, __FAMS__);
  assert.strictEqual(list.length, __UNITS__);
});

test('跨课与病证覆盖：__CROSS2__ 个跨 2 门课 · __DISEASES__ 次病证', () => {
  const s = shape(list);
  assert.strictEqual(s.cross2, __CROSS2__);
  assert.strictEqual(s.diseases, __DISEASES__);
});

test('按族的分布：__FAMSTR__', () => {
  const fam = Object.fromEntries(byFamily(list));
  for (const [f, n] of Object.entries(fam)) assert.ok(n > 0, f);
  assert.deepStrictEqual(Object.keys(fam).sort(), [...new Set(FAMILIES.filter((f) => fam[f]))].sort());
});

test('每章都带族名与全库计数（本章 __FAMS__.length 族）', () => {
  assert.ok(FAMILIES.length >= 1);
  assert.ok(lib.counts.zheng > 0);
});

test('数据完整性：每个证候都有 name/family/positions/fang 且病证数 ≥1', () => {
  for (const z of list) {
    assert.ok(z.name.endsWith('证') || z.name.length >= 3, z.name);
    assert.ok(FAMILIES.includes(z.family), z.name);
    assert.ok(Array.isArray(z.positions) && Array.isArray(z.fang), z.name);
    assert.ok(z.diseaseCount >= 1, z.name);
  }
  assert.strictEqual(new Set(list.map((z) => z.name)).size, list.length);
});
"""


def main():
    if len(sys.argv) < 2:
        raise SystemExit("用法: python scripts/scaffold_zhenghou_chapter.py 04-qixu-yangxu")
    slug = sys.argv[1]
    m = re.match(r"^(\d{2})-", slug)
    if not m:
        raise SystemExit("章节目录名须以两位章号开头")
    n = str(int(m.group(1)))

    lib = json.load(open(LIB, encoding="utf-8"))
    cj = os.path.join(SUBJ, "chapters.json")
    data = json.load(open(cj, encoding="utf-8"))
    ch = next((c for c in data["chapters"] if c["slug"] == slug), None)
    if ch is None:
        raise SystemExit(f"chapters.json 里没有 {slug}")
    title = ch["title"]
    fams = ch.get("families") or []
    if not fams:
        raise SystemExit(f"{slug} 未在 chapters.json 里声明 families（本章负责的证候族）")

    units = [z for z in lib["zheng"] if z["family"] in fams]
    s = {
        "cross2": sum(1 for z in units if z["courseCount"] >= 2),
        "diseases": sum(z["diseaseCount"] for z in units),
    }
    fam_counts = {}
    for z in units:
        fam_counts[z["family"]] = fam_counts.get(z["family"], 0) + 1
    famstr = "、".join(f"{f}{c}" for f, c in sorted(fam_counts.items(), key=lambda kv: -kv[1]))

    cdir = os.path.join(SUBJ, "chapters", slug, "code")
    os.makedirs(cdir, exist_ok=True)
    mainjs = (MAIN.replace("__N__", n).replace("__TITLE__", title).replace("__SLUG__", slug)
              .replace("__FAMS__", json.dumps(fams, ensure_ascii=False))
              .replace("__TOTAL__", str(lib["counts"]["zheng"])))
    testjs = (TEST.replace("__N__", n).replace("__TITLE__", title)
              .replace("__FAMS__", json.dumps(fams, ensure_ascii=False))
              .replace("__TOTAL__", str(lib["counts"]["zheng"]))
              .replace("__UNITS__", str(len(units)))
              .replace("__CROSS2__", str(s["cross2"]))
              .replace("__DISEASES__", str(s["diseases"]))
              .replace("__FAMSTR__", famstr))
    open(os.path.join(cdir, "main.js"), "w", encoding="utf-8").write(mainjs)
    open(os.path.join(cdir, "main.test.js"), "w", encoding="utf-8").write(testjs)
    print(f"第 {n} 章 {title} · 族 {fams} · 证候 {len(units)} · 跨2课 {s['cross2']} · 病证 {s['diseases']}")


if __name__ == "__main__":
    main()
