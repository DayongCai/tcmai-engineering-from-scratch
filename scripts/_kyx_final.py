# -*- coding: utf-8 -*-
"""科研实训与实验设计（sem910 派生课）收尾：README / 缺口登记 / CHANGELOG（chapters.json 不手写）。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "jichu-keyan-shixun", "departments/09-jichu/16-jichu-keyan-shixun"
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

table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} | {'、'.join(v['srcChapters'])} |"
                  for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))

readme = f"""# 科研实训与实验设计

**16-jichu-keyan-shixun** · 基础医学院 · 第 9 学期 · {len(CM)} 站 · {C['units']} 单元 · {C['hanzi']:,} 汉字〔派生〕

> 判据是「做得到—记得下—复得了」：动手规范、记录完整、结果可重复。

## 一、性质

| 项 | 值 |
|---|---|
| 课程类型 | **sem910 实训课**（第 9 学期，六站式） |
| 教材 | **无独立教材**；材料逐字取自《流行病学》《生物化学》《组织学与胚胎学》的实验方法章 |
| 章节结构 | 由 `scripts/scaffold_sem910.js` 从 `data/new-subjects-chapters.json` 生成，**不手改** |
| 规模 | **{len(CM)} 站 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 课程正文 | {doc_total:,} 非空白字 · 图注 {figs} 条 |

## 二、六站

| # | 站 | slug | 单元 | 材料来源 |
|--:|---|---|--:|---|
{table}

## 三、这门课不写什么（实训课最容易写错的地方）

1. **不写试剂浓度、配制比例、仪器型号与参数**——写错会直接被照做，出了事是安全问题；
2. **不写统计阈值与样本量公式的取值**——只写「为什么要做这一步、这一步看什么」；
3. **不写具体实验操作的分步动作**（取材、灌注、切片角度）——这些必须面授与示教；
4. **不写任何真实课题的数据与结论**。

课程只教：**顺序、判据、记录格式、异常处置的分级**。

## 四、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——「设计与对照」占多数，因为六站里有三站材料取自《流行病学》的设计与分析章。

| 四位面（站群） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 五、插图与图注

{figs} 条图注（流程与操作示意），四要素齐备；正文只按图号回指，图版 0 张，见 `图示缺口.md`。

## 六、章内可执行验证

```bash
node code/main.js              # 本站规模与三辨/位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
node scripts/scaffold_sem910.js --check   # 章名与顺序是否漂移
```

**免责声明：** 本课为教学材料，只讲实训的顺序与判据，**不替代实验室安全培训与带教示教**；一切操作以所在机构的安全规程与伦理审查要求为准。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 科研实训与实验设计 缺口登记

## 一、无独立教材

本课是 sem910 实训课，六站材料**逐字取自**《流行病学》（研究设计、数据、偏倚、质控、循证）、《生物化学》（常用技术）、《组织学与胚胎学》（制片与观察）三本母本的实验方法章。
汉字**不与母本相加**。

## 二、不写参数（本课最硬的自我限制）

| 类型 | 处理 |
|---|---|
| 试剂浓度、配制比例 | 不写——写错会被直接照做 |
| 仪器型号与参数 | 不写——以机构设备为准 |
| 统计阈值、样本量取值 | 只写「为什么要做」，不写取值 |
| 具体分步操作动作 | 不写——必须面授与示教 |

## 三、无原图

图注 {figs} 条为流程与操作示意，图版 0 张。

## 四、六站之间的顺序不可换

六站按「安全 → 设计 → 操作 → 数据 → 解读 → 报告」排。**安全站在最前**不是排版偏好：任何一站出问题，第一件事都是回到安全与处置流程。

## 五、不做的事

1. 不提供可直接执行的实验方案；
2. 不引真实课题的数据、图表与结论；
3. 不替代伦理审查与生物安全备案。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 16-jichu-keyan-shixun" not in s:
    add = f"""### 建 16-jichu-keyan-shixun（科研实训与实验设计·sem910 派生课）

六站 ←《流行病学》、《生物化学》、《组织学与胚胎学》实验方法章 → **6 站 / {C['units']} 单元 / {C['hanzi']:,} 汉字**，正文逐字不改。

- `chapters.json` 由 `scaffold_sem910.js` 生成，章名与顺序取自 `data/new-subjects-chapters.json`；状态按磁盘现算
- 三辨 {R['view']}×、四位面 {R['A_part']}×（站群分区）
- **不写试剂浓度/仪器型号/统计阈值/分步动作**，只写顺序与判据（缺口登记第二节）
- 图注 {figs} 条 + `图示缺口.md`

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"6 站 · 正文 {doc_total:,} · 图注 {figs} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
