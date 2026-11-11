# -*- coding: utf-8 -*-
"""医学细胞生物学（派生课）收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "yixue-xibao-shengwu-xue", "departments/09-jichu/03-yixue-xibao-shengwu-xue"
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
json.dump({"slug": "03-yixue-xibao-shengwu-xue", "title": "医学细胞生物学",
           "note": "派生课：12 课程章 ←《组织学与胚胎学》《生理学》《生物化学》相关章（正文逐字不改）。",
           "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} | {'、'.join(v['srcChapters'])} |"
                  for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))

readme = f"""# 医学细胞生物学

**03-yixue-xibao-shengwu-xue** · 基础医学院 · {len(CM)} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字〔派生〕

> 判据是「结构—功能—方法」三件套：看得见什么、靠什么实现、用什么看见。

## 一、性质：派生课，无独立教材

| 项 | 值 |
|---|---|
| 母本一 | 《组织学与胚胎学》第 1、2、3、4、5、18、19 章 |
| 母本二 | 《生理学》第 2 章（细胞的基本功能） |
| 母本三 | 《生物化学》第 5、17、19、20、21 章 |
| 正文 | **逐字取自母本，一字未改**；locator 一律 `派生·第N章·m.k`，`source` 记「母本名:母本 locator」 |
| 规模 | **{len(CM)} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 课程正文 | {doc_total:,} 非空白字 · 图注 {figs} 条 |
| 与母本的关系 | **汉字不与三门母本相加**——同一批字读第二遍 |

本库没有《医学细胞生物学》的独立教材，所以这门课是**按学科主线从三门母本重组**出来的：
细胞层面的结构（组胚）、功能（生理）、分子与核内过程（生化），各取所需，逐字不改。

## 二、章表

| # | 章 | slug | 单元 | 母本来源 |
|--:|---|---|--:|---|
{table}

第 11 章（细胞分化与器官发生）是唯一跨两章的：组胚第 18 章（早期发生）取前 6 单元、第 19 章（器官发生）取后 6 单元，按小节序拼接，不改一字。

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——三类基本齐平，因为三门母本各占一头（观测方法、结构成分、功能过程各有一批高频词），叠加后互相抵消。

| 四位面（章群结构） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 四、插图与图注

沿用「图注先行、图版待补」：{figs} 条图注，四要素齐备（部位与切面 / 方位与参照 / 可见与不可见 / 判据），
只看图注也能复述结论；正文只按图号回指。图版 0 张，见 `图示缺口.md`。

## 五、章内可执行验证

```bash
node code/main.js              # 本章规模与三辨/位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
```

**免责声明：** 本课为教学材料，讲细胞结构与功能，不作诊断结论，不替代细胞生物学实验课。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 医学细胞生物学 缺口登记

## 一、派生课，无独立教材

本课由三门母本重组（组胚 7 章 + 生理 1 章 + 生化 5 章），**正文逐字不改**。因此：

- 细胞生物学特有的内容（细胞信号通路的完整级联、细胞死亡的分型与检测、细胞衰老的分子标志）**母本没写的，本课也没有**；
- 汉字**不与三门母本相加**；引用须写「源自《组织学与胚胎学》《生理学》《生物化学》，本课为重组」；
- 第 11 章跨两章拼接（组胚 18、19），拼接处按小节序，未改一字，但**章内叙述的连贯性弱于母本单章**。

## 二、三门母本的口径不完全一致

| 母本 | 口径 | 影响 |
|---|---|---|
| 组织学与胚胎学 | 以「观察层级」为主线 | 结构类章节偏形态描述 |
| 生理学 | 以「功能调节」为主线 | 膜运输与信号章偏功能推理 |
| 生物化学 | 以「分子反应」为主线 | 核与基因表达章偏化学过程 |

同一术语在三门母本里的展开深度不同，本课**不统一改写**（派生课禁止改字），差异保留。

## 三、无原图

三门母本均无图；图注 {figs} 条为文字形态，图版 0 张（见 `图示缺口.md`）。

## 四、不做的事

1. 不引细胞显微照片、核型片与培养记录；
2. 不把体外实验结论直接当人体结论；
3. 不替代《医学细胞生物学》专业课与实验课。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 03-yixue-xibao-shengwu-xue" not in s:
    add = f"""### 建 03-yixue-xibao-shengwu-xue（医学细胞生物学·派生课）

三门母本重组：组胚 ch1–5、18、19 + 生理 ch2 + 生化 ch5、17、19、20、21 → **12 章 / 144 单元 / {C['hanzi']:,} 汉字**，正文逐字不改。

- locator 一律 `派生·第N章·m.k`；`source` 记母本 locator；**汉字不与三门母本相加**
- 第 11 章跨组胚 18/19 章拼接（各取 6 单元），按小节序，未改字
- 三辨 {R['view']}×、四位面 {R['A_part']}×（章群结构：膜与胞外 / 骨架与信息 / 核与表达 / 概论与分化）
- 图注 {figs} 条 + `图示缺口.md`；三门口径差异如实登记在缺口登记第二节

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"12 章 · 正文 {doc_total:,} · 图注 {figs} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
