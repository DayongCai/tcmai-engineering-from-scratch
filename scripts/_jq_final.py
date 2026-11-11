# -*- coding: utf-8 -*-
"""机器学习收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "jiqi-xuexi", "departments/07-zhineng/16-jiqi-xuexi"
D = os.path.join(ROOT, DEPT_REL)
U = json.load(io.open(os.path.join(ROOT, "standards", SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(ROOT, "standards", SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]

rows, doc_total, figs = [], 0, 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    p = os.path.join(D, "chapters", slug, "docs", "zh.md")
    doc_total += len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    fp = os.path.join(D, "chapters", slug, "figures.json")
    if os.path.exists(fp):
        figs += len(json.load(io.open(fp, encoding="utf-8"))["figures"])
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
json.dump({"slug": "16-jiqi-xuexi", "title": "机器学习", "note": "16 章 = 教材 16 章（1:1）。", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} |" for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))
readme = f"""# 机器学习

**16-jiqi-xuexi** · 智能医学院 · {len(CM)} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字

> 判据是「假设—损失—泛化」三件套：假设空间多大、损失怎么定、泛化凭什么保证。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **{C['chapters']} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 章节目标 | {len(rows)}（**1:1 对应教材，无合并拆分**） |
| 课程正文 | {doc_total:,} 非空白字 · 图注 {figs} 条 |

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨 **{R['view']}×**——「评估与调优」这一类被教材反复强调（过拟合、交叉验证、指标），与第 2 章单独立章一致。

| 四位面（章群） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 四、这门课不写什么

1. **不写可直接运行的患者数据与诊疗结论**——教材的样例表是合成数据，本课不把它当真实病例；
2. **不写平台与框架的操作步骤**（版本随时变），只写算法假设与判据；
3. **不写性能数字承诺**（「准确率可达 X%」这类），只写评估方法。

## 五、章内可执行验证

```bash
node code/main.js
node --test code/main.test.js
```

**免责声明：** 本课为教学材料，讲算法假设与评估方法，**不构成医疗决策依据**；任何用于临床的模型须另行验证与审批。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 机器学习 缺口登记

## 一、无插图

教材为文字体，无图。图表本应覆盖：假设空间示意、决策树划分、间隔与核映射、集成示意、偏差—方差曲线。
本课图注 {figs} 条为文字形态，图版 0 张（见 `图示缺口.md`）。

## 二、样例数据为合成

教材用「感冒证候样例」等合成表讲解分类，本课沿用但明确标注：**合成数据不得当作真实病例或诊断依据**。

## 三、不写的内容

| 类型 | 处理 |
|---|---|
| 框架/库的 API 与版本差异 | 不写 |
| 调参的具体取值与搜索空间 | 只写方法，不写取值 |
| 性能承诺（准确率/AUC 的具体数） | 不写 |
| 医学应用结论 | 不写，须另行验证与审批 |

## 四、不做的事

1. 不替代《机器学习》实验课与工程实践；
2. 不把教材的算法讲成临床可用方案；
3. 不引真实患者数据。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 16-jiqi-xuexi" not in s:
    add = f"""### 建 16-jiqi-xuexi（机器学习·智能医学院首门教材课）

底本 `qhzy-机器学习.xlsx`（16 内容章 / 197,467 汉字，sha `{U['source']['sha256'][:16]}…`）→ **{len(CM)} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字**，1:1。

- 教材版式为**第四种**：列 = Part / 节 / 小节(标题) / 段(11,12,…) / 内容；小节标题与首段同行，
  表格行会污染小节列 → 解析器 `scripts/build_jiqixuexi.py` 按「小节列非空即开单元 + 短单元合并」处理，
  并配 `scripts/merge_short_units.py`（通用：碎单元并入前一个）
- 三辨 {R['view']}×（模型/评估/数据）；四位面 {R['A_part']}×（章群）
- 不写框架 API、调参取值、性能承诺与临床结论（缺口登记）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"16 章 · 正文 {doc_total:,} · 图注 {figs} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
