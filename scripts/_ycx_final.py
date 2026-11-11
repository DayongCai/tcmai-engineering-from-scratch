# -*- coding: utf-8 -*-
"""医学遗传学（派生课）收尾：chapters.json 补字段 / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "yixue-yichuan-xue", "departments/09-jichu/09-yixue-yichuan-xue"
D = os.path.join(ROOT, DEPT_REL)
U = json.load(io.open(os.path.join(ROOT, "standards", SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(ROOT, "standards", SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]

doc_total = figs = 0
for slug in CM:
    p = os.path.join(D, "chapters", slug, "docs", "zh.md")
    doc_total += len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    fp = os.path.join(D, "chapters", slug, "figures.json")
    if os.path.exists(fp):
        figs += len(json.load(io.open(fp, encoding="utf-8"))["figures"])

table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} | 母本第 {'、'.join(str(x) for x in v['srcChapters'])} 章 |"
                  for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))

readme = f"""# 医学遗传学

**09-yixue-yichuan-xue** · 基础医学院 · {len(CM)} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字〔派生〕

> 判据是「系谱—变异—风险」三件套：系谱读得对、变异找得到、风险说得准，才算读懂。

## 一、先说清楚：这是**派生课**，没有独立教材

| 项 | 值 |
|---|---|
| 母本 | 《医学生物学》`F:/textbooks/qhzy-医学生物学.xlsx`（sha `{U['source']['sha256'][:16]}…`） |
| 取用范围 | 母本第 **9–16 章**（遗传学部分），共 96 单元 |
| 正文 | **逐字取自母本，一字未改**；locator 一律 `派生·第N章·m.k`，`source` 记「医学生物学:母本 locator」 |
| 规模 | **{len(CM)} 课程章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 课程正文 | {doc_total:,} 非空白字 · 图注 {figs} 条 |
| 与母本的关系 | **汉字不与《医学生物学》相加**——同一批字读第二遍，不是新增文本 |

12 课程章 ← 8 教材章：概论与群体、临床、中医四章 1:1；基因结构、基因突变、单基因、多基因、染色体五章按小节序各一分为二。

## 二、章表

| # | 章 | slug | 单元 | 来源 |
|--:|---|---|--:|---|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——三类近乎均分，因为母本第 9–16 章本身就把「传递方式」「分子与染色体机制」「群体与临床」写成了三条平行线。**这样平不是好事也不是坏事，是这门课的形态**：它没有一段压倒性主线。

| 四位面（章群结构） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 四、插图与图注

派生课沿用母本「**图注先行、图版待补**」的做法：{figs} 条图注，四要素齐备（部位与切面 / 方位与参照 / 可见与不可见 / 判据），
只看图注也能复述结论；正文只按图号回指。图版 0 张，见 `图示缺口.md`。

## 五、章内可执行验证

```bash
node code/main.js              # 本章单元规模与三辨/位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
```

**免责声明：** 本课为教学材料，讲传递规律与研究层次，**不作诊断与遗传咨询结论**，不替代临床遗传学规范。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 医学遗传学 缺口登记

## 一、派生课，无独立教材

本课正文**逐字取自《医学生物学》第 9–16 章**，未改写一个字。因此：

- 教材缺口（如图、如临床遗传咨询规范）**不能靠本课自行补齐**；
- 汉字**不与母本相加**——引用时须写「源自《医学生物学》，医学遗传学为其重组」；
- 母本没写的现代遗传学内容（如基因检测技术细节、新生儿筛查流程），本课**没有**。

## 二、不做临床遗传咨询

第 11 章只讲诊断、咨询、产前筛查的层次与流程，**不给判读标准、不给风险数字、不作预后判断**。

## 三、无原图

教材无图，母本亦无图；图注 {figs} 条为文字形态，图版 0 张（见 `图示缺口.md`）。

## 四、三辨刻意不做「凑平」调整

三辨极差 {R['view']}×，三类近乎均分——这是母本第 9–16 章的真实形态，不是切分失误。

## 五、不做的事

1. 不引家系原图、核型片与基因检测报告；
2. 不把教材的群体频率当本地区数据；
3. 不替代《医学遗传学》专业课与遗传咨询培训。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 09-yixue-yichuan-xue" not in s:
    add = f"""### 建 09-yixue-yichuan-xue（医学遗传学·派生课）

母本《医学生物学》第 9–16 章（96 单元）→ **12 课程章 / {C['units']} 单元 / {C['hanzi']:,} 汉字**，正文逐字不改。

- 拆分：基因结构、基因突变、单基因、多基因、染色体五章各按小节序一分为二；概论/群体/临床/中医四章 1:1
- locator 一律 `派生·第N章·m.k`；`source` 记母本 locator；**汉字不与母本相加**
- 三辨 {R['view']}×（三类近乎均分，母本形态）；四位面 {R['A_part']}×（章群结构）
- 图注 {figs} 条 + `图示缺口.md`；「如图所示」类写法改图号回指 64 处

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"12 章 · 正文 {doc_total:,} · 图注 {figs} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
