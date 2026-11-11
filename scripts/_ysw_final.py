# -*- coding: utf-8 -*-
"""医学生物学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards", "yixue-shengwu-xue")
DEPT = os.path.join(ROOT, "departments", "09-jichu", "04-yixue-shengwu-xue")

U = json.load(io.open(os.path.join(S, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]

rows, doc_total = [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
    n = len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    doc_total += n
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
json.dump({"slug": "04-yixue-shengwu-xue", "title": "医学生物学",
           "note": "16 章 = 教材 16 章（1:1）。", "chapters": rows},
          io.open(os.path.join(DEPT, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

table = "\n".join(f"| {r['n']} | {r['title']} | `{r['slug']}` | {len(CM[r['slug']]['units'])} |" for r in rows)

readme = f"""# 医学生物学

**04-yixue-shengwu-xue** · 基础医学院 · {len(rows)} 章 · {C['units']} 单元 · 底本 {C['hanzi']:,} 汉字

> 判据是「结构—功能—变异」三件套：看得见的结构，讲得清的功能，找得到的变异。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **{C['chapters']} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 章节目标 | {len(rows)}（**1:1 对应教材，无合并拆分，无单元复用**） |
| 课程正文 | {len(rows)} 章 docs 合计 **{doc_total:,} 非空白字** |

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——「结构与功能」{P['view'].get('结构与功能',0):,}、
「遗传与变异」{P['view'].get('遗传与变异',0):,}、「疾病与临床」{P['view'].get('疾病与临床',0):,}。
三类都过千，是本库最平的一门之一：前半（细胞）重结构，后半（遗传）重变异，两端都落在病上。

| 四位面（教材章群结构） | 章 | 汉字 |
|---|---|--:|
| 细胞结构 | 1–6 | {P['A_part']['细胞结构']:,} |
| 增殖与工程 | 7–8 | {P['A_part']['增殖与工程']:,} |
| 遗传规律 | 9–13 | {P['A_part']['遗传规律']:,} |
| 群体临床与中医 | 14–16 | {P['A_part']['群体临床与中医']:,} |

四位面 **{R['A_part']}×**（章群结构分区，不靠词频）。**若按「细胞 / 遗传」两分，会得到 170,000 : 128,000 的宽面**，
看不出重点；拆成四段后，第 7–8 章（增殖与工程）与第 14–16 章（群体·临床·中医）才显出各自的体量。

## 四、这门课的读法

16 章按「细胞结构（1–6）→ 增殖与工程（7–8）→ 遗传规律（9–13）→ 群体·临床·中医（14–16）」排，
每章要回答三问：

1. **结构在哪一层**（膜 / 细胞器 / 核 / 染色体 / 基因）；
2. **功能怎么从结构读出来**（运输、合成、周期、传递）；
3. **变异落在哪一步**（基因突变、染色体畸变、多基因易感）。

第 4–6 章（膜、质、核）是细胞线的三根柱子，第 10–13 章（基因、单基因、多基因、染色体）是遗传线的四根；
其余各章都挂在这七根上。

## 五、章内可执行验证

```bash
node code/main.js              # 本章单元规模、三辨与位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
```

**免责声明：** 本课为教学材料，讲结构、功能与遗传规律，不作诊断与遗传咨询结论，不替代临床遗传学规范。
"""
io.open(os.path.join(DEPT, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 医学生物学 缺口登记

## 一、无插图（本课最硬的限制）

细胞超微结构、核型与显带、系谱图、电泳图谱本应以图呈现。**教材为纯文字，本课亦无图**，
因此：

| 内容 | 处理 |
|---|---|
| 细胞器超微结构 | 只写「膜有几层、腔与哪条通路相连」这类文字可复核的判据 |
| 核型与显带 | 只写命名规则（区、带、臂）与描述格式，不引片子 |
| 系谱图 | 只写符号含义与判断顺序，不给图 |
| 电泳与测序峰图 | 不引 |

自行绘制的示意图若日后补入，必须标「示意图（据教材文字重绘），非教材原图」。

## 二、不做临床遗传咨询

第 15 章讲诊断、咨询与产前筛查的**层次与流程**，不给判读标准、不给风险数字、不作预后判断。
这些属临床遗传学与产前诊断规范的范围，本课不代答。

## 三、中医遗传学一节的定位

第 16 章按教材写「禀赋、体质、胎养」的历史表述，**不作现代遗传学解释**，也不把古代胎养观当作可执行建议。

## 四、不做的事

1. 不引患者核型、影像与基因检测报告；
2. 不把教材上的群体频率当本地区数据；
3. 不替代《医学遗传学》与《细胞生物学》专业课。
"""
io.open(os.path.join(DEPT, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 04-yixue-shengwu-xue" not in s:
    add = f"""### 建 04-yixue-shengwu-xue（医学生物学·教材课）

底本 `qhzy-医学生物学.xlsx`（16 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字，sha `{U['source']['sha256'][:16]}…`）。

- **16 教材章 → 16 课程章（1:1）**，无合并拆分、无单元复用；正文合计 {doc_total:,} 非空白字
- 三辨 结构与功能 {P['view'].get('结构与功能',0):,} / 遗传与变异 {P['view'].get('遗传与变异',0):,} / 疾病与临床 {P['view'].get('疾病与临床',0):,}（**{R['view']}×**）
- 四位面按教材章群结构分区（**{R['A_part']}×**）：细胞结构 1–6 / 增殖与工程 7–8 / 遗传规律 9–13 / 群体临床中医 14–16
- **无插图**：细胞器、核型、系谱、电泳一律只写文字判据（缺口登记第一节）
- 第 15 章只讲流程与层次，不给判读标准与风险数字；第 16 章只作历史表述

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"{len(rows)} 章 · 正文 {doc_total:,} 字 · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
