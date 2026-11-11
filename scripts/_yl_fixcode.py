# -*- coding: utf-8 -*-
"""修 12-yaoli-xue 的 7 处 code/main.js：
  · 07/08/09/10/49 是通用脚手架留下的版本（读已删除的 standards/yaoli-xue/units.json）→ 重写为读底本的统一版；
  · 34 的教学边界不在末行 → 挪到末尾；
  · 46 的 p.subs 未判空 → 加兜底。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue")
CH = {c["slug"]: c for c in json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]}
DB = json.load(io.open(os.path.join(ROOT, "standards", "yaoli", "底本.json"), encoding="utf-8"))
TITLE = {c["no"]: c["title"] for c in DB["chapters"]}

REWRITE = ["07-organophosphates-and-cholinesterase-reactivating-agents", "08-cholinergic-antagonists",
           "09-adrenergic-agonists", "10-adrenergic-antagonists", "49-immunostimulants", "34-adrenocortical-hormones"]

TPL = """#!/usr/bin/env node
/**
 * 药理学 · 第 {n} 章 {title}
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/{slug}/docs/zh.md
 * 出处: 教材·药理学·第{n}章（{n}.1–{n}.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n={n}]）
 * 依赖: 仅 Node.js 标准库
 *
 * 全部现算：四节各摊多少字、12 个小节谁厚谁薄、正文里有没有漏进量值，
 * 都从底本正文数出来。手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIBEN = path.join('standards', 'yaoli', '底本.json');
const CHAPTER = {n};

function findRoot(start) {{
  let dir = start;
  for (let i = 0; i < 12; i += 1) {{
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }}
  throw new Error('没找到 standards/yaoli/底本.json —— 章节目录是否已脱离仓库？');
}}

const ROOT_DIR = findRoot(__dirname);
const base = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, DIBEN), 'utf8'));
const ch = base.chapters.find((x) => x.no === CHAPTER);
if (!ch) throw new Error(`底本里没有第 ${{CHAPTER}} 章`);

const hanzi = (s) => (String(s || '').match(/[\\u4e00-\\u9fff]/g) || []).length;
const subs = ch.secs.flatMap((s) => s.subs);
const total = subs.reduce((a, u) => a + hanzi(u.body), 0);

console.log(`═══ ${{ch.title}}（药理学 第${{ch.no}}章）═══`);
console.log(`教材规模: 第${{ch.no}}章 ${{total}} 字 · ${{ch.secs.length}} 节 · ${{subs.length}} 小节 · 平均每小节 ${{Math.round(total / subs.length)}} 字`);

const VALUE = /\\d+(?:\\.\\d+)?\\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mol|mg|ml|mL|kg|cm|mm|μg|um|ms|min|小时|分钟|倍|周|天|年)/g;
const leaks = subs.reduce((a, u) => a + ((u.body || '').match(VALUE) || []).length, 0);
console.log(`量值核验: ${{subs.length}} 小节正文的「数字＋单位」命中 ${{leaks}} 处（底本声明：剂量与用法照底本）`);

console.log('按节分布: ' + ch.secs.map((s) => `${{s.no}} ${{s.subs.reduce((a, u) => a + hanzi(u.body), 0)}} 字`).join(' · '));

const sorted = [...subs].sort((a, b) => hanzi(a.body) - hanzi(b.body));
console.log(`\\n${{subs.length}} 个小节与正文汉字（最薄 ${{sorted[0].no}} · ${{hanzi(sorted[0].body)}} 字；最厚 ${{sorted[sorted.length - 1].no}} · ${{hanzi(sorted[sorted.length - 1].body)}} 字）：`);
for (const u of subs) console.log(`  ${{u.no}} ${{u.title}} · ${{hanzi(u.body)}} 字`);

const KW = ['受体', '酶', '通道', '剂量', '不良反应', '禁忌', '血药浓度', '半衰期', '耐受', '耐药'];
const whole = subs.map((u) => u.body).join('');
console.log('\\n关键词词频: ' + KW.map((k) => `${{k}} ${{whole.split(k).length - 1}}`).join(' · '));

const boundary = subs.filter((u) => /剂量与用法照底本/.test(u.brief || '')).length;
console.log(`\\n口径句核验: ${{boundary}} / ${{subs.length}} 小节的 brief 带「剂量与用法照底本」`);

console.log(`\\n教学边界：本章只说明第${{ch.no}}章教材所述的药理作用/机制/体内过程/临床应用类别与不良反应类别，不写剂量与浓度量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议`);
"""

for slug in REWRITE:
    c = CH[slug]
    p = os.path.join(DEPT, "chapters", slug, "code", "main.js")
    io.open(p, "w", encoding="utf-8", newline="\n").write(TPL.format(n=c["n"], title=TITLE[c["n"]], slug=slug))
    print("重写", slug)

# 34：把教学边界挪到末尾
p = os.path.join(DEPT, "chapters", "34-adrenocortical-hormones", "code", "main.js")
s = io.open(p, encoding="utf-8").read()
lines = s.split("\n")
b = [i for i, l in enumerate(lines) if "教学边界" in l]
if b:
    take = [lines[i] for i in b]
    lines = [l for i, l in enumerate(lines) if i not in b]
    out = "\n".join(lines).rstrip() + "\n\n" + "\n".join(take) + "\n"
    io.open(p, "w", encoding="utf-8", newline="\n").write(out)
    print("34 边界行移至末尾")

# 46：p.subs 兜底
p = os.path.join(DEPT, "chapters", "46-antiparasitic-drugs", "code", "main.js")
s = io.open(p, encoding="utf-8").read()
s2 = s.replace("p.subs.length", "(p.subs || []).length")
if s2 != s:
    io.open(p, "w", encoding="utf-8", newline="\n").write(s2)
    print("46 加 subs 兜底")
