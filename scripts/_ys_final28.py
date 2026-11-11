# -*- coding: utf-8 -*-
"""18 收尾（28 章版）：fallback + chapters.json + README + 缺口登记 + CHANGELOG。"""
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
        "MOH-GMP-2010": "药品生产质量管理规范（2010 年修订）",
        "MOH-GSP-2016": "药品经营质量管理规范（2016 年修正）"}
src = {c["id"]: c for c in SRC["clauses"]}

cfg = json.load(io.open(os.path.join(base, "doc-config.json"), encoding="utf-8"))
fb = {}
for slug, info in CM.items():
    first = info["srcChapters"][0].replace("外源#", "").split(",")[0]
    c = src[first]
    fb[slug] = [f"《{BOOK[c['source']]}·{c['clause']}》",
                f"外源课：条文依据为「外源·{BOOK[c['source']]} {c['clause']}」，非教材原文篇名"]
cfg["fallback"] = fb
cfg["gapNote"] = "六部规范已补（GMP/GSP/GVP/条例/法律/注册办法）；仍缺中药注册分类申报资料要求、价格与反垄断实体规则、药物警戒与药品检查要点"
cfg["chain"] = ("注册线 1–10 → 法律线 11–20 → 条例线 21–22 → GVP 线 23–24 → GMP 线 25–26 → GSP 线 27–28"
                "（体系与人员 / 验收·储存·记录·冷链）")
json.dump(cfg, io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

rows = [{"n": i["n"], "slug": s, "title": i["title"], "status": "🚧", "docs": "docs/zh.md", "code": "code/main.js"}
        for s, i in sorted(CM.items(), key=lambda kv: kv[1]["n"])]
json.dump({"note": "18 药事管理学（外源课）：1–10《注册办法》，11–20《药品管理法》，21–22《实施条例》，23–24《GVP》，25–26《GMP》，27–28《GSP》。",
           "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

rt = os.path.join(dpath, "README.md")
r = io.open(rt, encoding="utf-8").read()
r = re.sub(r"· \d+ 章 · \d+ 单元 · [\d,]+ 汉字", f"· {C['chapters']} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字", r)
r = re.sub(r"> 章链：.*", "> 章链：①《注册办法》1–10 → ②《药品管理法》11–20 → ③《实施条例》21–22 → ④《GVP》23–24 → ⑤《GMP》25–26 → ⑥《GSP》27–28（体系与人员／验收·储存·记录·冷链）", r, count=1)
if "GSP-2016.docx" not in r:
    r = r.replace("| `GMP-2010.pdf` |",
                  "| `GSP-2016.docx` | 药品经营质量管理规范（2015 年第 13 号令，2016 年第 28 号令修正） | 2016-07-13 修正 | 187 条 / 4 章（.docx + txt 副本） | `3b87874dc400d30e…` |\n| `GMP-2010.pdf` |", 1)
n = {k: sum(1 for c in SRC["clauses"] if c["id"][0] == k) for k in "YMEGPS"}
r = re.sub(r"\*\*\d+ / \d+ 条逐字可查\*\*（[^）]*）",
           f"**{REG['counts']['verified']} / {REG['counts']['clauses']} 条逐字可查**"
           f"（Y {n['Y']}＝注册办法，M {n['M']}＝药品管理法，E {n['E']}＝实施条例，G {n['G']}＝GVP，P {n['P']}＝GMP，S {n['S']}＝GSP）", r)
for k in ("注册与审评", "研究与试验", "质量与责任"):
    r = re.sub(r"\| \*\*" + k + r"\*\* \| \*\*\d+", f"| **{k}** | **{P['view'][k]}", r)
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
r = r.replace("- 章节目标 26（首版 10 → 《药品管理法》20 → 《实施条例》22 → 《GVP》24 → 《GMP》26）。",
              "- 章节目标 28（首版 10 → 《药品管理法》20 → 《实施条例》22 → 《GVP》24 → 《GMP》26 → 《GSP》28）。")
io.open(rt, "w", encoding="utf-8").write(r)

gp = os.path.join(dpath, "缺口登记.md")
g = io.open(gp, encoding="utf-8").read()
for old in ("| 药品经营质量管理规范（GSP） | 第 15 章同上 |", "| 药品经营质量管理规范（GSP） | 经营章写不实 |", "| 药品经营质量管理规范（GSP） |"):
    if old in g:
        g = g.replace(old, "| ~~药品经营质量管理规范（GSP）~~ | **已补**：第 27 章（体系、人员与设施）、第 28 章（验收·储存·记录·冷链），S 段 14 条；第 15 章已加指向 |")
        break
io.open(gp, "w", encoding="utf-8").write(g)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "18-药事管理学补到 28 章（GSP 线）"
if tag not in s:
    add = """
### 18-药事管理学补到 28 章（GSP 线）

用户提供《药品经营质量管理规范》**.docx**（2015 年第 13 号令公布，2016 年第 28 号令修正；187 条 / 4 章）。

- 抽取：python-docx 直读 .docx → `sources/GSP-2016.txt`（17,526 字符），校勘走 textfile 通道
- 新增 S 段条文 **14 条**（第五条 体系与质量方针、第七条 五要素与规模相适应、第十五条 质量负责人裁决权、
  第十六条 职责不得代行、第十七条 质量管理部门职责清单、第五十三条 计量器具校准、第五十四条 验证控制文件、
  第五十七条 计算机系统可追溯、第七十二条 逐批收货验收、第八十三条 合理储存、第八十四条 养护、
  第九十二条 销售记录、第一百零五条 冷链实时监测记录、第一百三十七条 质量管理与处方审核岗不得代履行）
- 条文合计 **92 条 / 92 逐字通过**（Y 23 + M 15 + E 12 + G 13 + P 15 + S 14），来源 6 份
- 章数 **26 → 28**，汉字 33,278 → **37,206**；新增第 27 章「GSP 的组织条件」、第 28 章「GSP 的四个支点」；
  第 15 章正文末尾补一句指向 27–28 章（法律层 → 规范层）
- `curriculum.json` 章节目标 26 → 28；`缺口登记.md` 去掉 GSP 一项

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("final:", C["chapters"], "章", C["hanzi"], "汉字", REG["counts"]["verified"], "条 / 来源", REG["counts"]["sources"])
