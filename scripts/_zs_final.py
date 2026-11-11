# -*- coding: utf-8 -*-
"""中医知识图谱收尾：chapters.json / README / 缺口登记（含「底本强度」声明）。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "zhongyi-zhishishu", "departments/07-zhineng/05-zhongyi-zhishi-tupu"
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
json.dump({"slug": "05-zhongyi-zhishi-tupu", "title": "中医知识图谱", "note": "10 章 = 教材 10 章（1:1）。",
           "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

ratio_src = C["hanzi"] / max(1, doc_total)
table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} |" for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))
readme = f"""# 中医知识图谱

**05-zhongyi-zhishi-tupu** · 智能医学院 · {len(CM)} 章 · {C['units']} 单元 · 底本 {C['hanzi']:,} 汉字

> 判据是「实体—关系—层级」三件套：认得出实体、说得清关系、指得出层级。

## 一、底本强度：这是**纲要型底本**，必须先说

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| 教材规模 | **10 章 / 4,542 正文汉字**（约 450 字/章） |
| 课程正文 | {doc_total:,} 非空白字 |
| **原文占比** | **约 {ratio_src:.0%}**——其余是判据、边界、图注 |

教材本身是**提纲式**的：每章 6 节、每节一两段（`正文` 行合计仅 4.5 千字），另有 `表格` 572 字、`代码` 398 字未入正文。
因此本课不是「教材转述课」，而是**按教材骨架补出可讲授的判据与边界**——这一点在 `缺口登记.md` 第二节写明，不当作完整教材课看待。

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨 **{R['view']}×**。

| 四位面（章群） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 四、不写什么

1. 不写真实患者数据、方药剂量与诊疗结论；
2. 不写平台与数据库的具体版本、表结构与查询语法（随时变）；
3. 不把「知识树」当作已完成的工程成果——它在本库里是**设计**，不是已部署系统。

## 五、章内可执行验证

```bash
node code/main.js
node --test code/main.test.js
```

**免责声明：** 本课为教学材料，讲知识组织方法，不构成医疗决策依据。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 中医知识图谱 缺口登记

## 一、无插图

教材无图；图注 {figs} 条为文字形态，图版 0 张（见 `图示缺口.md`）。

## 二、底本强度不足（**最重要的一条**）

| 项 | 实测 |
|---|---|
| 教材正文 | **4,542 汉字**（10 章，约 450 字/章） |
| 表格 | 572 字（未入正文） |
| 代码 | 398 字（未入正文） |
| 课程正文 | {doc_total:,} 非空白字 |
| 原文占比 | **约 {ratio_src:.0%}** |

这说明：**教材是提纲，不是讲稿**。本课的正文主体是按骨架补写的判据与边界，**不能当作教材全文的替代**。
若要达到「教材课」的水准（原文占比 50% 以上），须补一部完整教材或按补源约定引入外部权威资料。

## 三、代码与表格未入正文

教材的 `代码` 段（398 字）与 `表格` 段（572 字）**没有进入 docs**：前者是工程示例，后者是结构表。
它们留在底本 `units.json` 的原始行里，需要时可按 locator 回查。

## 四、不做的事

1. 不写真实患者数据与方药剂量；
2. 不写数据库/平台的版本与语法；
3. 不把设计当作已部署成果。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 05-zhongyi-zhishi-tupu" not in s:
    add = f"""### 建 05-zhongyi-zhishi-tupu（中医知识图谱·纲要型底本）

底本 `qhzy-中医知识树.xlsx`（10 章 / **正文仅 4,542 汉字**）→ 课程 {len(CM)} 章 / {C['units']} 单元 / 正文 {doc_total:,} 非空白字。

- 版式为**第五种**：两列，行首标签 节/正文/代码/表格；`节` 行带 `1.1` 编号
- **底本强度已量化**：原文占课程正文约 {ratio_src:.0%}，属「提纲型教材」，README 与缺口登记均写明，不按完整教材课看待
- 表格 572 字、代码 398 字未入正文，可回查
- 三辨 {R['view']}×、四位面 {R['A_part']}×

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"10 章 · 正文 {doc_total:,} · 原文占比 {ratio_src:.0%} · 图注 {figs}")
