# -*- coding: utf-8 -*-
"""18 第 10 章写实收尾：README/缺口登记/CHANGELOG 同步（28 章不变，条文 92→106，7 源）。"""
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

rt = os.path.join(dpath, "README.md")
r = io.open(rt, encoding="utf-8").read()
r = re.sub(r"· \d+ 章 · \d+ 单元 · [\d,]+ 汉字", f"· {C['chapters']} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字", r)
if "中药注册分类-2020-68.doc" not in r:
    r = r.replace("| `GSP-2016.docx` |",
                  "| `中药注册分类-2020-68.doc` | 中药注册分类及申报资料要求（2020 年第 68 号通告附件） | 2020-09-27 | 14 段锚点 / 17,677 字符（.doc + txt 副本） | `54a8e21cf022f870…` |\n| `GSP-2016.docx` |", 1)
n = {k: sum(1 for c in SRC["clauses"] if c["id"][0] == k) for k in "YMEGPSZ"}
r = re.sub(r"\*\*\d+ / \d+ 条逐字可查\*\*（[^）]*）",
           f"**{REG['counts']['verified']} / {REG['counts']['clauses']} 条逐字可查**"
           f"（Y {n['Y']}＝注册办法，M {n['M']}＝药品管理法，E {n['E']}＝实施条例，G {n['G']}＝GVP，"
           f"P {n['P']}＝GMP，S {n['S']}＝GSP，Z {n['Z']}＝中药注册分类 68 号）", r)
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
unused = [c["id"] for c in SRC["clauses"] if c["id"] not in used]
r = re.sub(r"用掉 \*\*\d+ / \d+\*\* 条；未用：.*",
           f"用掉 **{len(used)} / {len(SRC['clauses'])}** 条；未用：{('、'.join(unused) if unused else '无')}", r)
io.open(rt, "w", encoding="utf-8").write(r)

gp = os.path.join(dpath, "缺口登记.md")
g = io.open(gp, encoding="utf-8").read()
for old in ("| 中药注册分类与申报资料要求 | 第 10 章停在原则层 |", "| 中药注册分类与申报资料要求 |", "| 中药注册分类及申报资料要求 |"):
    if old in g:
        g = g.replace(old, "| ~~中药注册分类及申报资料要求~~ | **已补**：2020 年第 68 号（Z 段 14 条）已写入第 10 章：四分类、3.1/3.2、同名同方≠仿制药、申报资料模块与「不适用」写法 |")
        break
io.open(gp, "w", encoding="utf-8").write(g)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "第 10 章写实（中药注册分类 68 号）"
if tag not in s:
    add = """
### 第 10 章写实（中药注册分类 68 号）

用户选 A。NMPA 页面本体仍 **412**，但**附件直链可取**：
`https://www.nmpa.gov.cn/directory/web/nmpa/images/1601282559497048444.doc`（92 KB，OLE2 真 .doc）。
落盘 `sources/中药注册分类-2020-68.doc`，Word COM→docx→python-docx 抽 `中药注册分类-2020-68.txt`（17,677 字符）。

- 该文件非「第X条」体例，按**段落锚点**编 Z01–Z14（Z06/Z14 带下一段，避免只有小标题）
- Z 段条文 **14 条 / 14 逐字通过**；合计 **106 条 / 106**（7 源）
- 第 10 章正文前置「规范层」一节（约 700 字）：四分类表、同名同方≠仿制药、增加功能主治改走新药、3.2 是加减化裁入口、
  申报资料五模块与「不适用」写法；章引用条文 Y08/Y02 + Z01–Z11
- 汉字 37,214 → **39,069**；章数仍 28（本次是写实，不扩章）
- `缺口登记.md` 去掉「中药注册分类」一项

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("final:", C["chapters"], "章", C["hanzi"], "汉字", REG["counts"]["verified"], "条 /", REG["counts"]["sources"], "源")
