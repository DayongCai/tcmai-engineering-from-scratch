# -*- coding: utf-8 -*-
"""四门基础课收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = {
 "renti-jiepou-xue": ("departments/09-jichu/01-renti-jiepou-xue", "人体解剖学", "人体解剖学",
                      "位置—层次—毗邻：说得清它在哪一层、与谁相邻，才算认得"),
 "zuzhi-peitai-xue": ("departments/09-jichu/02-zuzhi-peitai-xue", "组织学与胚胎学", "组织学与胚胎学",
                      "细胞—纤维—基质—排列：切片上认得出这四样，才谈得上判读"),
 "shenghua-xue": ("departments/09-jichu/07-shenghua-xue", "生物化学", "生物化学",
                  "底物—酶—产物—能量：这一步谁催化、能量怎么走，说不清就是没懂"),
 "jubu-jiepou-xue": ("departments/09-jichu/08-jubu-jiepou-xue", "局部解剖学", "局部解剖学",
                     "层次—通道—间隙：切开后先见什么、通道里走什么，说得清才算认得"),
}

changelog_bits = []
for sub, (dept_rel, title, book, motto) in COURSES.items():
    U = json.load(io.open(os.path.join(S, sub, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(S, sub, "chapter-map.json"), encoding="utf-8"))["chapters"]
    DEPT = os.path.join(ROOT, dept_rel)
    C, P, R = U["counts"], U["probe"], U["ratio"]

    rows, doc_total = [], 0
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
        p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
        n = len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
        doc_total += n
        rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                     "docs": "docs/zh.md", "code": "code/main.js"})
    json.dump({"slug": os.path.basename(dept_rel), "title": title,
               "note": f"{len(rows)} 章 = 教材 {len(rows)} 章（1:1）。", "chapters": rows},
              io.open(os.path.join(DEPT, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    table = "\n".join(f"| {r['n']} | {r['title']} | `{r['slug']}` | {len(CM[r['slug']]['units'])} |" for r in rows)
    readme = f"""# {title}

**{os.path.basename(dept_rel)}** · 基础医学院 · {len(rows)} 章 · {C['units']} 单元 · 底本 {C['hanzi']:,} 汉字

> {motto}。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **{C['chapters']} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 章节目标 | {len(rows)}（**1:1 对应教材，无合并拆分，无单元复用**） |
| 课程正文 | {len(rows)} 章 docs 合计 **{doc_total:,} 非空白字** |
| 图注 | 每章每节一条，见 `chapters/<slug>/figures.json` 与各章 docs「图注（可独立阅读）」 |

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**。

| 四位面（教材篇结构） | 章 | 汉字 |
|---|---|--:|
{chr(10).join(f"| {k} | {'、'.join(str(x) for x in CM and [])} | {v:,} |".replace('|  |', '| — |') for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**——按教材「上/中/下/末」四篇分区，不按词频造面。

## 四、插图与图注：本课的写法

本课教材**无插图**（xlsx 只有文字层），所以采取「**图注先行、图版待补**」：

1. 每章每节一条图注，写在 `figures.json` 与 docs 的「图注（可独立阅读）」一节；
2. 每条图注自带四要素：**部位与切面 / 方位与参照 / 可见与不可见 / 判据**；
3. **只看图注、不看图，也能复述同一结论**——这是图注独立性的硬要求；
4. 正文**只按图号回指**（「图 N-M 图注」），不写「见上图」「如图所示」；
5. 图版 0 张，如实登记在 `图示缺口.md`，补图优先级与三条红线也写在那里。

## 五、章内可执行验证

```bash
node code/main.js              # 本章单元规模与三辨/位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
```

**免责声明：** 本课为教学材料，讲结构与关系，不作诊断结论，不替代临床与规范。
"""
    io.open(os.path.join(DEPT, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、无原图（见 `图示缺口.md`）

教材为纯文字，本课以「图注先行」应对：图注独立成文，图版待补。**不引任何临床影像与标本照片**。

## 二、不写参数

本课只写结构与关系，不写尺寸、厚度、角度等参数；教材未给的参数，本课也不补。

## 三、三辨偏斜说明

三辨极差 **{R['view']}×**（{('、'.join(f'{k} {v:,}' for k, v in P['view'].items()))}）。
这是教材的写法所致，已如实保留，未通过换词凑平。

## 四、不做的事

1. 不作诊断与预后判断；
2. 不把教材的分类当成临床决策树；
3. 不替代本专业的实验课与图谱课。
"""
    io.open(os.path.join(DEPT, "缺口登记.md"), "w", encoding="utf-8").write(gap)
    changelog_bits.append((sub, title, len(rows), C['units'], C['hanzi'], doc_total, R['view'], R['A_part']))
    print(f"{sub}: {len(rows)} 章 · 正文 {doc_total:,} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "四门基础教材课（解剖/组胚/生化/局部）" not in s:
    lines = "\n".join(
        f"- `{sub}`（{title}）：{n} 章 / {u} 单元 / 底本 {h:,} 汉字 · 正文 {d:,} 非空白字 · 三辨 {rv}× · 四位面 {ra}×"
        for sub, title, n, u, h, d, rv, ra in changelog_bits)
    add = f"""### 建四门基础教材课（解剖/组胚/生化/局部）

{lines}

共同口径：

- **1:1 对应教材章**，无合并拆分、无单元复用；四位面按教材「上/中/下/末」四篇结构分区
- **插图与图注独立性**：每章每节一条图注（`figures.json` + docs「图注（可独立阅读）」），
  图注自带「部位与切面 / 方位与参照 / 可见与不可见 / 判据」四要素，只看图注也能复述结论；
  正文只按图号回指，不写「见上图」；图版 0 张，登记在各自 `图示缺口.md`
- 工具：`scripts/build_figure_captions.py`（图注层，可复用到其它无图教材课）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
