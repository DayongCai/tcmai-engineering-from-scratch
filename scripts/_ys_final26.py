# -*- coding: utf-8 -*-
"""18 收尾（26 章版）：fallback + chapters.json + README + 缺口登记 + CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yaoshi-guanli", "departments/02-zhongyao/18-yaoshi-guanli-xue"
base = os.path.join(ROOT, "standards", SUB)
dpath = os.path.join(ROOT, DEPT)

U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
REG = json.load(io.open(os.path.join(base, "补源登记.json"), encoding="utf-8"))
SRC = json.load(io.open(os.path.join(base, "外源条文.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P = U["counts"], U["probe"]

BOOK = {"NMPA-注册办法-2020": "药品注册管理办法（总局令第 27 号，2020）",
        "NPC-药品管理法-2019": "中华人民共和国药品管理法（2019）",
        "STATE-实施条例-828": "药品管理法实施条例（国务院令第 828 号，2026）",
        "NMPA-GVP-2021": "药物警戒质量管理规范（2021）",
        "MOH-GMP-2010": "药品生产质量管理规范（2010 年修订）"}
src = {c["id"]: c for c in SRC["clauses"]}

cfg = json.load(io.open(os.path.join(base, "doc-config.json"), encoding="utf-8"))
fb = {}
for slug, info in CM.items():
    first = info["srcChapters"][0].replace("外源#", "").split(",")[0]
    c = src[first]
    fb[slug] = [f"《{BOOK[c['source']]}·{c['clause']}》",
                f"外源课：条文依据为「外源·{BOOK[c['source']]} {c['clause']}」，非教材原文篇名"]
cfg["fallback"] = fb
cfg["gapNote"] = "GMP 与 GVP 已补；仍缺 GSP 规范本身、中药注册分类申报资料要求、价格与反垄断实体规则、药物警戒检查要点"
cfg["chain"] = ("注册线 1–10 → 法律线 11–20 → 条例线 21–22（检验豁免/委托网络免责）→ GVP 线 23–24（体系/时限信号）"
                "→ GMP 线 25–26（体系与关键人员/验证变更偏差回顾）")
json.dump(cfg, io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

rows = [{"n": i["n"], "slug": s, "title": i["title"], "status": "🚧", "docs": "docs/zh.md", "code": "code/main.js"}
        for s, i in sorted(CM.items(), key=lambda kv: kv[1]["n"])]
json.dump({"note": "18 药事管理学（外源课）：1–10《注册办法》，11–20《药品管理法》，21–22《实施条例》，23–24《GVP》，25–26《GMP》。",
           "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

rt = os.path.join(dpath, "README.md")
r = io.open(rt, encoding="utf-8").read()
r = re.sub(r"· \d+ 章 · \d+ 单元 · [\d,]+ 汉字", f"· {C['chapters']} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字", r)
r = re.sub(r"> 章链：.*", "> 章链：①《注册办法》1–10 → ②《药品管理法》11–20 → ③《实施条例》21–22 → ④《GVP》23–24 → ⑤《GMP》25–26（体系与关键人员／验证·变更·偏差·回顾）", r, count=1)
if "GMP-2010.pdf" not in r:
    r = r.replace("| `药物警戒质量管理规范.doc` |",
                  "| `GMP-2010.pdf` | 药品生产质量管理规范（2010 年修订，卫生部令第 79 号） | 2011-03-01 施行 | 93 页 / 315 条 | `871f86bfaa610bb0…` |\n| `药物警戒质量管理规范.doc` |", 1)
n = {k: sum(1 for c in SRC["clauses"] if c["id"][0] == k) for k in "YMEGP"}
r = re.sub(r"\*\*\d+ / \d+ 条逐字可查\*\*（[^）]*）",
           f"**{REG['counts']['verified']} / {REG['counts']['clauses']} 条逐字可查**"
           f"（Y {n['Y']}＝注册办法，M {n['M']}＝药品管理法，E {n['E']}＝实施条例，G {n['G']}＝GVP，P {n['P']}＝GMP）", r)
for k in ("注册与审评", "研究与试验", "质量与责任"):
    r = re.sub(r"\| \*\*" + k + r"\*\* \| \*\*\d+\*\*", f"| **{k}** | **{P['view'][k]}", r)
for k in ("注册", "研制", "监管", "上市后"):
    r = re.sub(r"\| " + k + r" \| \d+ \|", f"| {k} | {P['A_part'][k]} |", r)
rv = max(P["view"].values()) / min(P["view"].values())
ra = max(P["A_part"].values()) / min(P["A_part"].values())
r = re.sub(r"三辨极差 \*\*[\d.]+×\*\*", f"三辨极差 **{rv:.1f}×**", r)
r = re.sub(r"制度段极差 \*\*[\d.]+×\*\*", f"制度段极差 **{ra:.1f}×**", r)
r = re.sub(r"正文 [\d,]+ 汉字 \+ 外源 \d+ 条", f"正文 {C['hanzi']:,} 汉字 + 外源 {REG['counts']['verified']} 条", r)
used = {x for c in CM.values() for x in c["srcChapters"][0].replace("外源#", "").split(",")}
unused = [c["id"] + "·" + c["clause"] for c in SRC["clauses"] if c["id"] not in used]
tbl = "\n".join(f"| {c['n']} | {c['title']} | {c['srcChapters'][0].replace('外源#','')} |"
                for c in sorted(CM.values(), key=lambda x: x["n"]))
r = re.sub(r"(\| # \| 章 \| 依据条文 \|\n\|--:\|---\|---\|\n)(?:\|[^\n]*\n)+", r"\1" + tbl + "\n", r)
r = re.sub(r"用掉 \*\*\d+ / \d+\*\* 条；未用：.*",
           f"用掉 **{len(used)} / {len(SRC['clauses'])}** 条；未用：{('、'.join(unused) if unused else '无')}", r)
r = r.replace("- 章节目标 24（首版 10 → 《药品管理法》20 → 《实施条例》22 → 《GVP》24）。",
              "- 章节目标 26（首版 10 → 《药品管理法》20 → 《实施条例》22 → 《GVP》24 → 《GMP》26）。")
io.open(rt, "w", encoding="utf-8").write(r)

gp = os.path.join(dpath, "缺口登记.md")
g = io.open(gp, encoding="utf-8").read()
for old in ("| 药品生产质量管理规范（GMP） | 第 14 章停在「许可＋规范义务」层 |",
            "| 药品生产质量管理规范（GMP） | 生产章写不实 |",
            "| 药品生产质量管理规范（GMP） |"):
    if old in g:
        g = g.replace(old, "| ~~药品生产质量管理规范（GMP）~~ | **已补**：第 25 章（体系与关键人员）、第 26 章（验证·变更·偏差·回顾），P 段 15 条 |")
        break
io.open(gp, "w", encoding="utf-8").write(g)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "18-药事管理学补到 26 章（GMP 线）"
if tag not in s:
    add = """
### 18-药事管理学补到 26 章（GMP 线）

用户提供《药品生产质量管理规范（2010 年修订）》PDF（93 页 / 315 条 / 有文本层，卫生部令第 79 号）。

- 新增 P 段条文 **15 条**（第二条 体系、第四条 诚实守信、第十六条 独立质量管理部门、第二十条 四个关键人员、
  第二十五条 质量受权人、第一百三十八条 验证范围由风险评估定、第一百四十四条 非一次性验证、
  第一百六十二条 批记录、第一百九十五条 偏差、第二百三十一条 持续稳定性考察、第二百四十条 变更控制系统、
  第二百五十二条 CAPA、第二百六十六条 年度产品质量回顾、第三百零六条 自检、第二百七十八条 委托合同）
- 条文合计 **78 条 / 78 逐字通过**（Y 23 + M 15 + E 12 + G 13 + P 15），来源 5 份
- 章数 **24 → 26**，汉字 29,243 → **33,278**；新增第 25 章「GMP 的体系要求与关键人员」、
  第 26 章「GMP 的四根支柱：验证、变更、偏差、回顾」
- `curriculum.json` 章节目标 24 → 26；`缺口登记.md` 去掉 GMP 一项
- **新坑（校勘）**：GMP 页脚是 `- 1 -X卫生部发布` 不是 `— 1 —`，`norm()` 里通用页码正则先命中会留下裸 `X`，
  导致 3 条判 unverified；把 `-\\s*\\d+-\\s*X` 放在交替首位、并补 `卫生部发布`/`国家市场监督管理总局规章` 后归零。
  另：跨章正文会把「第二章 质量管理第一节 原 则」粘在句末，抽取时要按 `第X章节` 截断。

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("final:", C["chapters"], "章", C["hanzi"], "汉字", REG["counts"]["verified"], "条 / 来源", REG["counts"]["sources"])
